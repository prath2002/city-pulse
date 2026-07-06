# Deployment & DevOps Plan
## CityPulse

**Version:** 1.0

---

## 1. Environments

| Env | Purpose | Infra |
|---|---|---|
| local | Development | Docker Compose (Postgres, Redis, backend, frontend); BigQuery via read-only service account key mounted locally (never committed) |
| staging | Pre-demo validation, E2E tests | GKE namespace `citypulse-staging`, small GPU node pool, sampled data |
| production/demo | Judging | GKE namespace `citypulse-prod`, full pipeline, live Pune polling |

## 2. Source Control & Branching
- Single GitHub repo, monorepo structure: `/backend`, `/frontend`, `/agents`, `/infra` (Terraform), `/docs` (this document set).
- Branching: `main` (protected, always deployable), `dev` (integration branch), feature branches `feat/<epic>-<short-desc>` merged into `dev` via PR, `dev` merged to `main` after passing CI + a manual smoke check on staging.
- Commit convention: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`) to keep a clean, judge-readable history.

## 3. CI Pipeline (GitHub Actions)

**On every PR:**
1. Lint (ruff/black for Python, eslint/prettier for TypeScript).
2. Unit tests (pytest, vitest) — must pass, coverage report generated.
3. Dependency vulnerability scan (`pip-audit`, `npm audit`).
4. Build Docker images (backend, frontend, agent service) — fail PR if build fails.
5. Accessibility scan (`axe-core`) against a locally rendered build of P0 screens.

**On merge to `dev`:**
1. All PR checks, plus:
2. Integration tests against an ephemeral Postgres (GitHub Actions service container) + mocked BigQuery/Gemini responses.
3. Push images to Artifact Registry tagged `dev-<short-sha>`.
4. Deploy to `citypulse-staging` GKE namespace automatically (Helm or `kubectl apply` via a deploy job).

**On merge to `main`:**
1. All `dev` checks, plus:
2. E2E test suite (Playwright) against the freshly deployed staging environment.
3. Manual approval gate (GitHub Environments protection rule) before promoting to `citypulse-prod`.
4. Push images tagged `prod-<short-sha>` and `latest`.
5. Deploy to `citypulse-prod` via rolling update.

## 4. Infrastructure as Code
- Terraform manages: GKE cluster + 2 node pools (cpu-pool, gpu-pool with autoscaling 0–2), Cloud SQL instance, Cloud Storage buckets (raw landing, model artifacts, complaint photos), BigQuery dataset + IAM, Artifact Registry, Secret Manager entries (referenced, not populated, by Terraform — actual secret values set out-of-band).
- State stored in a GCS backend bucket with versioning enabled.
- `terraform plan` required as a CI check on any `/infra` PR; `terraform apply` run manually by the infra owner (not auto-applied, given hackathon-scale team size and blast-radius concerns).

## 5. Containerization
- `backend/Dockerfile`: multi-stage build, Python 3.11-slim base, non-root user.
- `frontend/Dockerfile`: multi-stage Next.js build, served via Node standalone output (or deployed directly to Vercel instead of a container, if simplifying).
- `agents/Dockerfile`: shares base image with backend if agents run as a separate service; otherwise agents run in-process within the backend container for hackathon simplicity.
- GPU jobs (`cudf-pipeline`, `spark-rapids-job`): dedicated image based on an NVIDIA RAPIDS base image (`rapidsai/base` or similar), pinned version matching Doc 13 T2 mitigation.

## 6. Kubernetes Deployment Shape

| Workload | Kind | Node pool | Replicas | Notes |
|---|---|---|---|---|
| backend-api | Deployment | cpu-pool | 2–6 (HPA on CPU/requests) | Serves REST + WebSocket |
| frontend | Deployment (or external Vercel) | cpu-pool | 2 | |
| redis | Deployment (or Memorystore) | cpu-pool | 1 | |
| risk-inference-service | Deployment | gpu-pool | 1 (scales 0–1) | GPU node affinity/taint+toleration |
| feature-pipeline-job | Job (Kubernetes Job, not Deployment) | gpu-pool | on-demand | Triggered by scheduler or manual `/benchmark/run` |
| spark-rapids-backfill | Job | gpu-pool | on-demand | Historical backfill only, run rarely |
| ingestion-jobs | CronJob | cpu-pool | scheduled daily/hourly | NYC 311, NOAA, Pune pollers |

GPU node pool configured with `minNodes: 0` so it costs nothing when idle — critical for staying within budget (ties to NFR-6, Doc 13 T1/T3).

## 7. Monitoring & Observability
- Google Cloud Monitoring dashboards: request latency (p50/p95/p99) per endpoint, error rate, GPU node utilization, BigQuery bytes-scanned per day (budget tracking), agent action success/failure rate.
- Google Cloud Logging: structured JSON logs from backend and agents, queryable by `agent_name`, `action_type`, `request_id`.
- Alerting: budget alert ($ threshold on BigQuery + overall GCP spend), error-rate alert (>5% 5xx over 5 min), GPU job failure alert.
- Uptime check on the public dashboard URL and `/health` endpoint, checked every 60s during the judging window specifically.

## 8. Rollback Strategy
- Kubernetes rolling deployments with `maxUnavailable: 0` — old pods stay up until new ones are healthy.
- Every deploy tagged with the git short-SHA; rollback = redeploy previous tag via `kubectl rollout undo` or re-running the CI deploy job against the last known-good tag.
- Database migrations (Alembic) are additive-only in the days immediately before the demo (no destructive schema changes without a tested rollback migration).

## 9. Demo-Day Operational Checklist
1. Confirm GPU node pool is warmed up (not scaled to zero) 30 minutes before judging, to avoid cold-start latency during the live benchmark.
2. Confirm all three external dependencies (BigQuery, Open-Meteo, OpenAQ, Gemini API) are reachable — run a pre-flight health check script.
3. Confirm budget alert has not fired (would indicate unexpected cost/usage spike).
4. Have the backup demo video (Doc 13 S3 mitigation) loaded and ready as a fallback.
5. Confirm at least one seeded high-risk zone exists in the demo dataset so the dispatch/approval flow can be shown without depending on live weather cooperating.

## 10. Post-Hackathon Considerations (if continuing beyond submission)
- Move from `on-demand` GPU Jobs to a proper streaming/event-driven pipeline (Pub/Sub-triggered) for true real-time scoring.
- Add multi-tenancy support for onboarding additional cities beyond NYC/Pune (ties to PRD Non-Goals).
- Formal security review and compliance assessment (ties to Doc 10 SEC-7.2) before handling real citizen PII at scale.
