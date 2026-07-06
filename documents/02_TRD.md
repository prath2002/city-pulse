# Technical Requirements Document (TRD)
## CityPulse — How It Will Be Built

**Version:** 1.0 | **Companion to:** PRD v1.0

---

## 1. Technology Stack

| Layer | Technology | Reasoning |
|---|---|---|
| Analytical data warehouse | Google BigQuery (public datasets + custom curated datasets) | Free tier covers project scale; native SQL over 8M+ row NYC 311 table and NOAA GSOD without ETL |
| Object storage | Google Cloud Storage | Landing zone for raw pulls, model artifacts, uploaded complaint photos |
| Operational database | PostgreSQL (Cloud SQL or self-hosted on GKE for dev) | Transactional state: users, alerts, dispatch plans, agent action logs — BigQuery is not suited for frequent small writes |
| Cache / queue | Redis | Session state, rate limiting, lightweight job queue for agent tasks |
| GPU-accelerated ETL | NVIDIA RAPIDS (cuDF / cudf.pandas) | Drop-in acceleration of pandas-style feature engineering over millions of joined rows |
| Distributed GPU processing | Spark RAPIDS Accelerator on GKE | Historical backfill / large batch joins across 311 × weather × geography |
| ML training/inference | XGBoost (GPU-enabled) | Fast, interpretable, well-supported gradient boosting for tabular risk scoring |
| Agent orchestration | Google Agent Development Kit (ADK) + Gemini | Multi-agent state machine: Forecaster, Triage, Dispatcher, Comms |
| Multimodal understanding | Gemini (vision + text) | Classifies complaint photos, extracts structured fields from free text |
| Backend API | Python 3.11, FastAPI | Async, typed, OpenAPI-native — pairs well with agent tool-calling |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS | Fast to build, SSR for dashboard performance, matches resume stack |
| Maps | Mapbox GL JS (or Leaflet + OSM tiles as free fallback) | Ward/zone risk heatmap rendering |
| Charts | Recharts | Lightweight, composable, matches design system |
| BI embedding | Looker Studio (embedded iframe) or Looker (if licensed) | Historical trend dashboards without custom chart-building |
| Container orchestration | Google Kubernetes Engine (GKE) — 1 CPU node pool + 1 GPU node pool (T4/L4) | Matches resume experience (Kubernetes, microservices); GPU pool isolated and autoscaled to zero when idle to control cost |
| CI/CD | GitHub Actions → Docker → GKE | Familiar, free for public/small private repos |
| IaC | Terraform (minimal — GKE cluster, node pools, service accounts, BigQuery dataset, Cloud Storage buckets) | Reproducible environment, documents infra as code |
| Auth | Firebase Authentication (email/password + Google sign-in) issuing JWTs verified by FastAPI | Avoids building auth from scratch |
| Monitoring | Google Cloud Monitoring + Logging; optional Prometheus/Grafana on GKE | Standard observability for demo + production narrative |

## 2. High-Level System Requirements

### 2.1 Functional
- FR-1: System must ingest NYC 311 and NOAA GSOD data from BigQuery public datasets on a schedule (daily) and on-demand (manual trigger for demo).
- FR-2: System must ingest live Pune weather/AQI data from Open-Meteo/OpenAQ on a polling schedule (hourly).
- FR-3: System must compute a risk score per zone per time window using a GPU-accelerated feature pipeline + trained model.
- FR-4: System must expose a REST API for zones, complaints, weather, risk scores, alerts, and dispatch plans.
- FR-5: System must classify incoming citizen complaints (text + optional photo) via Gemini multimodal into category, severity, and geo-zone.
- FR-6: System must deduplicate/cluster complaints referring to the same real-world incident.
- FR-7: System must generate a draft dispatch/response plan for zones crossing a risk threshold, requiring human approval before "execution" (simulated).
- FR-8: System must answer natural-language questions about city data, grounded in BigQuery/model outputs, with the underlying query or data reference shown to the user.
- FR-9: System must log every agent action (input, output, approval status, timestamp, actor) for auditability.
- FR-10: System must render a live map dashboard, a complaint feed, a dispatch review queue, and an NL chat panel in the frontend.

### 2.2 Non-Functional
- NFR-1 (Performance): Risk score refresh for all zones must complete in <2 minutes on GPU pipeline (vs CPU baseline benchmarked and displayed).
- NFR-2 (Availability): Demo deployment must sustain 99% uptime during the judging window; graceful degradation if a live external API (Open-Meteo/OpenAQ) is unreachable (fallback to last cached values with a visible "stale data" indicator).
- NFR-3 (Scalability): Backend services must be stateless and horizontally scalable on GKE; GPU workloads run as batch Jobs, not always-on pods, to control cost.
- NFR-4 (Security): See Doc 10, Security Requirements.
- NFR-5 (Auditability): All agent actions and human approvals stored immutably (append-only log table).
- NFR-6 (Cost): Total cloud spend for the project must stay within GCP free tier + any hackathon-provided credits; budget alert configured at a low threshold.
- NFR-7 (Maintainability): All services containerized, environment-config via `.env`/Secret Manager, no hardcoded credentials.
- NFR-8 (Explainability): Every risk score must expose top contributing features (SHAP values or feature importances) — not a black-box number.

## 3. System Boundaries

CityPulse is a decision-support system. It does not autonomously execute physical-world actions (dispatching a real crew, sending a legally binding alert). All outward-facing effects in the hackathon build are either (a) simulated within the app (dispatch plan marked "approved" in the database) or (b) sent through a sandboxed messaging provider clearly marked as demo traffic.

## 4. Environments

| Environment | Purpose | Notes |
|---|---|---|
| `local` | Developer machines | Docker Compose: Postgres, Redis, FastAPI, Next.js dev server; BigQuery accessed via service account key (read-only) |
| `staging` | Pre-demo validation | Single GKE namespace, smaller GPU node pool, seeded with a data subset |
| `demo/prod` | Hackathon judging | Full GKE deployment, live Pune polling active, NYC data refreshed daily |

## 5. Build Order (maps to Doc 12 Project Plan)

1. Data layer: BigQuery access, curated views, Cloud Storage buckets.
2. GPU pipeline: cuDF feature engineering + CPU benchmark harness.
3. Risk model: XGBoost training + GPU scoring service.
4. Backend API + Postgres schema (Doc 7).
5. Forecaster + Triage agents (core AI/acceleration story).
6. Frontend dashboard (map, feed, chat).
7. Dispatcher + Comms agents (stretch, human-in-the-loop UI).
8. Looker embed + polish + deployment hardening.

## 6. Key Technical Risks (see Doc 13 for full register)
- RAPIDS/cuDF version compatibility with GKE GPU driver images — pin versions early, test on day 1 not day 5.
- BigQuery public dataset table wildcard queries (`gsod20*`) can scan more data than expected — enforce partition/date filters in every query to protect the free-tier budget.
