# CityPulse

**AI-Powered Civic Decision Intelligence Platform** — predicts civic risk by zone (NYC + Pune), auto-triages citizen complaints with Gemini, drafts human-approved dispatch plans, and answers plain-language questions grounded in BigQuery. GPU-accelerated feature engineering (RAPIDS cuDF) benchmarked live, CPU vs GPU, inside the product.

> Full planning documentation lives in [`documents/`](documents/) (PRD, TRD, SRS, architecture, API spec, and the execution tracker [`documents/PROJECT_TASK_LIST.md`](documents/PROJECT_TASK_LIST.md)).

## Quick start (local development)

```bash
cp .env.example .env        # placeholder values are fine for the stub stack
docker compose up --build
```

- Backend health: http://localhost:8000/v1/health
- Frontend: http://localhost:3000

## Repository layout

| Path | Purpose |
|---|---|
| `backend/` | FastAPI application (REST + WebSocket + agent host) |
| `agents/` | ADK/Gemini agent layer (Forecaster, Triage, Dispatcher, Comms, NL chat) |
| `pipelines/` | Ingestion jobs + CPU/GPU feature pipelines + benchmark harness |
| `ml/` | XGBoost training + GPU inference service |
| `frontend/` | Next.js 14 dashboard + citizen flows |
| `infra/` | Terraform (GKE, Cloud SQL, BigQuery, GCS, IAM) |
| `k8s/` | Kubernetes manifests (kustomize base + overlays) |
| `documents/` | Planning docs 01–14 + project task list (source of truth) |

## Status

Phase 0 (Repository & Tooling Foundation) — see the [Progress Dashboard](documents/PROJECT_TASK_LIST.md#progress-dashboard).
