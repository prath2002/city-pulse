# User Stories & Acceptance Criteria
## CityPulse

Each story is sized for roughly one 1–3 day development task. Grouped by epic; epic order matches recommended build order in TRD §5.

---

## Epic A: Data Ingestion

**US-A1 — Ingest NYC 311 data**
*As the system, I need to pull curated NYC 311 records from BigQuery so that downstream features have raw complaint data.*
- AC1: A scheduled job queries `bigquery-public-data.new_york_311.311_service_requests` filtered by a date-partition window (never a full-table scan).
- AC2: Output is written to `citypulse.curated_complaints` with normalized column names (see Doc 7).
- AC3: Job logs row count ingested and completes in under 5 minutes for a 30-day window.
- AC4: Job is idempotent — re-running for the same window does not duplicate rows.

**US-A2 — Join weather to complaints**
*As an analyst, I need complaints joined to same-day weather so risk features can use precipitation/temperature.*
- AC1: Join uses nearest weather station by lat/long to complaint zone centroid.
- AC2: Missing weather values (`9999.9` NOAA sentinel) are converted to `NULL`, not treated as real values.
- AC3: Resulting table `citypulse.complaints_weather_joined` is queryable and documented.

**US-A3 — Poll Pune live signals**
*As the system, I need hourly Pune weather and AQI so the live monsoon module stays current.*
- AC1: Open-Meteo and OpenAQ are polled hourly via a Cloud Scheduler-triggered job.
- AC2: On API failure, last successful value is retained and marked `stale=true` after 2 hours.
- AC3: Data is stored in `citypulse.pune_live_signals` with ingestion timestamp.

---

## Epic B: GPU-Accelerated Feature Engineering & Risk Model

**US-B1 — Build feature pipeline (CPU baseline)**
*As a developer, I need a pandas-based feature pipeline so we have a correctness baseline before GPU optimization.*
- AC1: Pipeline computes rolling counts, category mix, weather aggregates per zone/day.
- AC2: Output schema matches the planned model's input schema exactly.
- AC3: Wall-clock time for the full historical dataset is recorded and logged.

**US-B2 — Port feature pipeline to cuDF**
*As a developer, I need the identical pipeline running on GPU so we can demonstrate acceleration.*
- AC1: Output of the cuDF pipeline is numerically identical (within floating point tolerance) to the CPU pipeline on the same input.
- AC2: Wall-clock time is at least 10x faster than the CPU baseline on the full historical dataset.
- AC3: A toggle in the API (`?engine=cpu|gpu`) allows switching engines for the live demo benchmark.

**US-B3 — Train risk model**
*As a data scientist, I need a trained XGBoost model predicting complaint-volume risk so zones can be ranked.*
- AC1: Model trained on historical features with a clear train/validation split by time (no leakage).
- AC2: Model beats a naive 7-day rolling average baseline on validation precision@10 (top 10 riskiest zones).
- AC3: Model artifact versioned and stored in Cloud Storage with a `model_version` tag.

**US-B4 — GPU inference service**
*As the system, I need to score all zones quickly so the dashboard reflects near-real-time risk.*
- AC1: Inference service loads the model once and scores all zones in a single batch call.
- AC2: Full-zone scoring completes in under 2 minutes.
- AC3: Each score includes top-5 contributing features (SHAP or feature importance).

---

## Epic C: Agent Layer

**US-C1 — Forecaster Agent triggers on threshold breach**
*As an official, I want to be notified when a zone's risk crosses a threshold so I don't have to watch the dashboard constantly.*
- AC1: Agent runs after every scoring cycle.
- AC2: Threshold is configurable per zone (default: risk score ≥ 70).
- AC3: A `risk_alert_trigger` record is created exactly once per breach event (no duplicate spam on every cycle while still above threshold).

**US-C2 — Triage Agent classifies incoming complaint**
*As a citizen, I want my complaint automatically categorized so it reaches the right department without me choosing from a confusing list.*
- AC1: Given text (and optional photo), agent returns category, severity (1–5), and geo-zone with a confidence score.
- AC2: If confidence is below a threshold, complaint is flagged for human review rather than silently mis-categorized.
- AC3: Processing completes in under 10 seconds per complaint.

**US-C3 — Triage Agent deduplicates complaints**
*As an analyst, I want duplicate reports of the same incident merged so the dashboard shows real incident counts, not raw complaint counts.*
- AC1: New complaints within a configurable radius/time/category window of an existing open cluster are attached to that cluster, not created as a new one.
- AC2: Cluster complaint count is visible in the dashboard.

**US-C4 — Dispatcher Agent drafts a plan**
*As a dispatch coordinator, I want a ready-to-review resource plan when risk spikes, so I don't have to build one from scratch under time pressure.*
- AC1: For each `risk_alert_trigger`, a `dispatch_plan` record is created in `pending` status with recommended resource type, quantity, and a rationale string referencing the top contributing features.
- AC2: Plan never auto-transitions to `approved` — only a human action can do that.

**US-C5 — Comms Agent drafts multilingual alert**
*As a dispatch coordinator, I want a ready-to-send citizen alert in the right languages, so I don't have to write and translate it myself under time pressure.*
- AC1: On dispatch plan approval, a draft alert is generated in English, Hindi, and Marathi.
- AC2: Draft requires a separate explicit "send" approval before any simulated delivery occurs.

**US-C6 — Human approval queue**
*As a dispatcher, I want a single queue of pending agent outputs so I can review and act quickly.*
- AC1: Queue shows all `pending` dispatch plans and alerts, sorted by risk score descending.
- AC2: Approve/Reject/Edit actions are logged with actor and timestamp.

---

## Epic D: Natural Language Interface

**US-D1 — Ask a grounded question**
*As Meera the analyst, I want to ask "which zones are highest risk this week" in plain English and get an answer backed by real data.*
- AC1: Agent generates a SQL query restricted to an approved view allowlist.
- AC2: Response includes the natural-language answer and the executed SQL, visible on click/expand.
- AC3: If no safe query can be generated, the system asks a clarifying question instead of guessing.

---

## Epic E: Frontend Dashboard

**US-E1 — Risk map**
*As Meera, I want a color-coded map of zone risk so I can see hotspots at a glance.*
- AC1: Map renders all zones with a color scale tied to risk score.
- AC2: Clicking a zone shows top contributing features and recent complaint count.
- AC3: Map refreshes automatically after each scoring cycle without a full page reload.

**US-E2 — Complaint feed**
*As Meera, I want a live feed of incoming complaints grouped by cluster.*
- AC1: Feed updates within 10 seconds of a new complaint being processed.
- AC2: Each entry shows category, severity, zone, and cluster size.

**US-E3 — Benchmark panel**
*As a judge/demo viewer, I want to see the CPU vs GPU timing comparison live, so the acceleration claim is provable, not asserted.*
- AC1: Panel shows most recent CPU and GPU run times for the same feature pipeline job.
- AC2: A "run benchmark now" button triggers both engines on demand during the demo.

**US-E4 — Citizen complaint submission form**
*As Priya, I want a simple form to submit a complaint with a photo.*
- AC1: Form validates required fields and file size/type before submission.
- AC2: On success, a reference ID and estimated acknowledgment time are shown immediately.

---

## Epic F: Security & Access

**US-F1 — Role-based access**
*As an admin, I want to restrict dispatch approval to authorized roles only.*
- AC1: Endpoints that approve/reject dispatch plans reject requests from users without `dispatcher` or `admin` role (HTTP 403).
- AC2: Role is derived from a verified JWT, never a client-supplied header.

(See Doc 10 for full security requirements and Doc 11 for corresponding test cases.)
