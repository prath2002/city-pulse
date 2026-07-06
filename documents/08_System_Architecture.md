# System Architecture Diagram
## CityPulse

**Version:** 1.0

---

## 1. High-Level Component Diagram (textual)

```
┌───────────────────────────────────────────────────────────────────────┐
│ EXTERNAL DATA SOURCES                                                  │
│  NYC 311 (BigQuery public)   NOAA GSOD (BigQuery public)               │
│  Open-Meteo API (Pune)        OpenAQ API (Pune)                        │
└───────────────┬───────────────────────────────┬───────────────────────┘
                │                                 │
                ▼                                 ▼
      ┌──────────────────┐             ┌────────────────────┐
      │ Batch ingestion   │             │ Hourly poller       │
      │ job (Cloud Run    │             │ (Cloud Run jobs +   │
      │ Jobs / Cloud       │            │  Cloud Scheduler)    │
      │ Composer schedule) │            └──────────┬───────────┘
      └─────────┬─────────┘                        │
                ▼                                    ▼
      ┌──────────────────────────────────────────────────┐
      │        Google Cloud Storage (raw landing)          │
      └─────────────────────────┬──────────────────────────┘
                                 ▼
      ┌──────────────────────────────────────────────────┐
      │            Google BigQuery (curated + features)     │
      │  curated_complaints, weather_daily, joined,          │
      │  zone_features_daily, pune_live_signals              │
      └───────────────┬─────────────────────┬────────────────┘
                       │                     │
                       ▼                     ▼
         ┌───────────────────────┐  ┌──────────────────────────┐
         │ GPU feature pipeline    │  │ Spark RAPIDS batch job    │
         │ (cuDF, GKE GPU pool,    │  │ (historical backfill,     │
         │  on-demand Job)         │  │  GKE GPU pool)             │
         └───────────┬─────────────┘  └──────────────┬─────────────┘
                     ▼                                 ▼
         ┌─────────────────────────────────────────────────┐
         │  XGBoost GPU inference service (risk scoring)     │
         │  running as a GKE Deployment, autoscaled           │
         └───────────────────────┬─────────────────────────┘
                                 ▼
         ┌─────────────────────────────────────────────────┐
         │        FastAPI Backend (GKE, CPU node pool)        │
         │  REST API + WebSocket for live dashboard updates    │
         └───┬─────────────┬─────────────┬──────────────┬────┘
             ▼             ▼             ▼              ▼
     ┌───────────┐  ┌────────────┐ ┌────────────┐ ┌──────────────┐
     │ PostgreSQL │  │  Redis     │ │ Agent layer │ │ Gemini API /  │
     │ (Cloud SQL)│  │ (cache/    │ │ (ADK:        │ │ Vision API    │
     │            │  │  queue)    │ │ Forecaster,  │ │ (multimodal)  │
     │            │  │            │ │ Triage,      │ │               │
     │            │  │            │ │ Dispatcher,  │ │               │
     │            │  │            │ │ Comms)       │ │               │
     └────────────┘  └────────────┘ └────────────┘ └──────────────┘
                                 │
                                 ▼
         ┌─────────────────────────────────────────────────┐
         │        Next.js Frontend (Vercel or GKE)            │
         │  Map · Feed · Dispatch Queue · Chat · Benchmark     │
         └───────────────┬─────────────────────┬────────────┘
                         ▼                       ▼
              ┌────────────────────┐   ┌────────────────────┐
              │ Looker Studio embed  │   │ Simulated SMS/      │
              │ (weekly digest)      │   │ WhatsApp sandbox     │
              └────────────────────┘   └────────────────────┘
```

## 2. Component Responsibilities

| Component | Responsibility | Deployed as |
|---|---|---|
| Ingestion jobs | Pull/normalize external data | Cloud Run Jobs, scheduled |
| BigQuery | Analytical store, source of truth for historical/curated data | Managed |
| cuDF feature pipeline | GPU-accelerated feature engineering | Kubernetes Job on GPU node pool |
| Spark RAPIDS job | Large historical batch joins/backfill | Kubernetes Job on GPU node pool |
| XGBoost inference service | Real-time-ish risk scoring per cycle | GKE Deployment (CPU-triggered, GPU-executed via node affinity) |
| FastAPI backend | Business logic, auth, orchestration of agents, API contracts | GKE Deployment (CPU pool), autoscaled 2–6 pods |
| PostgreSQL | Operational transactional store | Cloud SQL (managed) |
| Redis | Cache + lightweight task queue for agent jobs | GKE Deployment or Memorystore |
| Agent layer (ADK) | Forecaster/Triage/Dispatcher/Comms agents, tool-calling into backend APIs and BigQuery | Runs inside backend service process or as separate GKE Deployment, calling Gemini API |
| Frontend | Dashboard UI | Vercel (simplest) or GKE Deployment behind the same ingress |
| Looker Studio | Historical BI views | External embed, no infra to manage |

## 3. Network & Deployment Topology

- Single GKE cluster, two node pools:
  - **cpu-pool**: e2-standard-4 nodes, autoscaled 1–4, runs backend, frontend (if not on Vercel), Redis, agent services.
  - **gpu-pool**: single n1-standard-4 + T4 (or g2-standard-4 + L4) node, autoscaled **0–2** (scales to zero when idle to control cost), runs cuDF/Spark RAPIDS Jobs and the XGBoost inference Deployment.
- Cloud SQL (PostgreSQL) in the same VPC, private IP only, accessed via Cloud SQL Auth Proxy sidecar.
- Ingress via GKE Ingress + Google-managed TLS certificate, or Cloud Run for the frontend/backend if simplifying further for hackathon timeline.
- All external API calls (Gemini, Open-Meteo, OpenAQ) go through the backend only — frontend never calls third-party APIs directly (keeps API keys server-side).

## 4. Data Flow — End-to-End Example (flood scenario)

1. Open-Meteo poller ingests heavy rainfall reading for a Pune ward → `pune_live_signals`.
2. Feature pipeline (cuDF) recomputes features for affected zone.
3. XGBoost inference scores the zone → risk score 82, stored in `risk_scores`.
4. Forecaster Agent sees score ≥ threshold → creates `risk_alert_trigger`.
5. Dispatcher Agent drafts a `dispatch_plan` (pending).
6. Official reviews in Dispatch Queue UI, clicks Approve.
7. Comms Agent drafts multilingual `alert` (pending).
8. Official approves alert → simulated send via sandbox provider, `sent_at` recorded.
9. All 5 agent/human steps recorded in `agent_action_log`.
10. Dashboard map, feed, and chat all reflect the updated state within one refresh cycle.

## 5. Why This Architecture Maps to the Hackathon Judging Criteria
- **Google Cloud usage (2+ required):** BigQuery, Cloud Storage, GKE, Gemini/ADK, Looker — five components used meaningfully, not decoratively.
- **NVIDIA acceleration (2+ required):** cuDF/cudf.pandas + Spark RAPIDS on GPU-enabled GKE nodes, both benchmarked against CPU equivalents live in the product.
- **Decision intelligence, not just a dashboard:** the agent layer converts data into an actionable, human-approved recommendation, not just a chart.
