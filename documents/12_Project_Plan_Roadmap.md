# Project Plan / Roadmap
## CityPulse

**Version:** 1.0
**Assumption:** A 4-week build window before submission, structured as weekly sprints. A compressed 48–72 hour version is included in §5 in case the actual hackathon window is shorter — adjust based on your real deadline.

---

## 1. Milestones

| Milestone | Target | Definition of Done |
|---|---|---|
| M1: Data foundation | End Week 1 | BigQuery access working, curated tables populated, Pune live poller running |
| M2: Acceleration core | End Week 2 | cuDF pipeline + CPU baseline + benchmark harness + trained risk model, GPU inference service live |
| M3: Agentic + API | End Week 3 | All 4 agents functional (at minimum Forecaster + Triage fully working, Dispatcher + Comms at least drafting), FastAPI backend complete, Postgres schema live |
| M4: Frontend + polish | End Week 4 (submission) | Full dashboard, E2E tests passing, deployed staging + prod, README + demo script rehearsed |

## 2. Sprint Breakdown

### Week 1 — Data Foundation
- Day 1–2: GCP project setup, billing alert, Terraform skeleton (GKE cluster, BigQuery dataset, Cloud Storage buckets), team/service account IAM.
- Day 2–3: NYC 311 + NOAA GSOD BigQuery exploration queries; validate the weather-complaint correlation hypothesis (per earlier analysis).
- Day 3–4: Build ingestion job (`curated_complaints`, `weather_daily`, joined table).
- Day 4–5: Pune live poller (Open-Meteo, OpenAQ) + `pune_live_signals` table.
- Day 5: Database schema (Doc 7) applied to Postgres via migration tool (Alembic).
- **Deliverable:** Data flowing end-to-end into both BigQuery and Postgres; demo-able via raw SQL queries.

### Week 2 — Acceleration Core
- Day 1–2: CPU (pandas) feature pipeline built and validated against fixture data.
- Day 2–3: Port to cuDF; build the `/benchmark/run` harness; confirm ≥10x speedup on real data volume.
- Day 3–4: Train XGBoost model; validate against naive baseline (US-B3).
- Day 4–5: GPU inference service; wire into `risk_scores` table; expose `/risk-scores/latest`.
- **Deliverable:** Live, provable acceleration story — this is the highest-priority milestone; do not let agent work start before this is solid.

### Week 3 — Agentic Layer & Backend API
- Day 1: Forecaster Agent (threshold detection → `risk_alert_triggers`).
- Day 2: Triage Agent (classification + dedup) — wire to `POST /complaints`.
- Day 3: Dispatcher Agent (plan drafting) — wire to `dispatch_plans`, human approval endpoints.
- Day 4: Comms Agent (multilingual alert drafting) — wire to `alerts`.
- Day 5: NL chat agent (SQL generation + guardrails per SEC-4.3).
- **Deliverable:** Full backend API surface (Doc 9) functional; agents callable and logged.

### Week 4 — Frontend, Testing, Deployment
- Day 1–2: Build map dashboard (S2/S3), complaint feed (S4).
- Day 2–3: Build dispatch queue (S5), chat panel (S6), benchmark panel (S7).
- Day 3: Citizen submission flow (S8/S9).
- Day 4: E2E test suite (Doc 11 §2.3), fix Sev-1/Sev-2 bugs.
- Day 5: Deploy to prod, dry-run full demo script, finalize README and submission materials.
- **Deliverable:** Submitted, deployed, rehearsed product.

## 3. Team Allocation (if solo, treat as personal task sequencing; if team, suggested split)

| Track | Owner focus | Overlaps with |
|---|---|---|
| Data & GPU pipeline | Backend/data-focused member | M1, M2 |
| Agents & API | Backend member | M3 |
| Frontend & UX | Frontend-focused member | M4, can start component scaffolding in parallel from Week 2 using mocked API responses |
| DevOps/Infra | Shared or one owner | Ongoing from Day 1, front-loaded in Week 1 |

If solo (matches Pratham's context): sequence exactly as written above; frontend scaffolding can start in Week 2 in parallel using mock JSON matching the API spec (Doc 9), so backend and frontend aren't strictly serialized.

## 4. Dependencies & Critical Path
Critical path: **BigQuery access → feature pipeline → risk model → agent layer → dispatch UI**. The frontend map/feed can be scaffolded early against mock data (unblocks parallel work), but the benchmark panel (S7) cannot be finished until the real CPU/GPU pipeline exists — treat that as the single highest-risk dependency for the demo's centerpiece claim.

## 5. Compressed 48–72 Hour Hackathon Version (if applicable)
If the actual event window is a single weekend:
- **Hour 0–8:** GCP setup, BigQuery exploration, confirm correlation, ingestion job (skip Terraform — click-ops is fine for a weekend).
- **Hour 8–20:** CPU + GPU feature pipeline + benchmark harness (this is non-negotiable — protect this time block above all else).
- **Hour 20–30:** Risk model + inference service.
- **Hour 30–42:** Forecaster + Triage agents only (cut Dispatcher/Comms to "simulated/mocked" if time-constrained — see PRD Non-Goals framing for how to present this honestly).
- **Hour 42–60:** Frontend — map, feed, benchmark panel, chat (in that priority order; cut chat last if forced to cut something, since map + benchmark are the visual centerpiece).
- **Hour 60–72:** Deploy, rehearse, fix critical bugs, submit.

## 6. Definition of "Submission Ready"
- Public URL live and stable.
- README with architecture diagram, data source citations, setup instructions, and a clearly labeled "what's simulated" section.
- 3–5 minute demo script rehearsed at least twice.
- All 14 planning documents (this set) available as supporting materials if judges want technical depth beyond the demo.
