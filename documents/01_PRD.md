# Product Requirements Document (PRD)
## CityPulse — AI-Powered Civic Decision Intelligence Platform

**Version:** 1.0
**Author:** Pratham Agarwal
**Status:** Draft for hackathon submission
**Last updated:** July 2026

---

## 1. Problem Statement

City agencies (public works, disaster management, sanitation, utilities) receive citizen complaints and environmental signals from many disconnected sources — 311-style grievance systems, weather feeds, field inspections, and social reports. Today, three failures repeat across almost every city:

1. **Reactive, not predictive.** Departments act only after a complaint is filed or a failure occurs (a flooded street, an overflowing drain, a burst pipe), not before.
2. **Manual triage at scale.** Human staff read, categorize, deduplicate, and route thousands of complaints by hand — a process that takes hours and doesn't scale during a crisis (storm, heatwave, festival crowding).
3. **No natural-language access to city data.** Officials without SQL/BI skills cannot ask "which wards are at risk tonight?" and get a grounded, real-time answer. They wait for an analyst to build a report.

CityPulse solves all three by combining large-scale public civic data (NYC 311 + NOAA weather, with a live Pune monsoon module), GPU-accelerated data processing, and an agentic AI layer that forecasts risk, triages incoming reports, drafts response/dispatch plans, and answers plain-language questions.

## 2. Goals

| # | Goal | Success metric |
|---|------|-----------------|
| G1 | Predict where citizen complaint volume / civic risk will spike, ahead of time | Risk model beats a naive baseline (rolling 7-day average) on precision@k for top-risk zones |
| G2 | Cut manual triage time for incoming reports | >80% of incoming complaints auto-categorized and geo-clustered with no human input |
| G3 | Give non-technical officials a natural-language interface to city data | NL query answered correctly (grounded in BigQuery) in <5 seconds for common question types |
| G4 | Demonstrate GPU acceleration materially changes time-to-insight | ≥10x speedup on feature engineering / model scoring vs CPU baseline, measured live |
| G5 | Produce a usable, understandable field: dispatch/response recommendation | Agent-drafted response plan requires only human approval, not authorship, in >70% of test cases |

## 3. Non-Goals (explicitly out of scope for v1)

- Real-time IoT sensor ingestion (flood sensors, smart drains) — future work, architecture leaves room for it.
- Legally binding automated dispatch (no agent action executes without human approval).
- Full multi-city onboarding UI/self-serve tenant configuration — v1 supports NYC + Pune as two hardcoded "city profiles."
- Mobile native apps — web-responsive only.
- Payment, billing, or citizen account management.

## 4. Target Users & Personas

### Persona 1 — "Meera," City Operations Analyst
Works in a public works or disaster-management cell. Needs to see, at a glance, which zones are trending toward high complaint/risk volume, and wants to ask follow-up questions in plain English instead of writing SQL.

### Persona 2 — "Officer Singh," Field Dispatch Coordinator
Needs a ranked, resourced action plan when conditions worsen (which zone, what resource, how urgent) — and needs to approve or reject it quickly, not compose it from scratch.

### Persona 3 — "Priya," Citizen
Wants to report a problem (flooded road, broken streetlight, garbage pileup) via text or photo and get a fast acknowledgment, without needing to know which department or category it belongs to.

### Persona 4 — "Director Rao," Department Head
Wants a weekly/monthly rollup: where is risk concentrated, is response time improving, where should budget for repairs/crews go next quarter.

## 5. Core User Stories (high level — see Doc 4 for full breakdown)

1. As Meera, I want a live map of predicted risk by zone, so I can proactively brief field teams before problems escalate.
2. As Meera, I want to type "which zones are likely to have flooding complaints this week if it rains 50mm?" and get a grounded, cited answer.
3. As Officer Singh, I want the system to propose a resource dispatch plan for high-risk zones, so I only need to approve/edit rather than build it from scratch.
4. As Priya, I want to submit a complaint with a photo and get instant categorization and an ETA, so I trust the system is doing something with my report.
5. As Director Rao, I want a weekly digest showing risk trends and department response performance.

## 6. Product Scope (v1 — hackathon deliverable)

**In scope:**
- Ingestion pipeline for NYC 311 (BigQuery public dataset) + NOAA GSOD weather (BigQuery public dataset) + a live Pune monsoon module (Open-Meteo API + OpenAQ).
- GPU-accelerated feature engineering (cuDF) and risk model training/scoring (XGBoost on GPU).
- Four-agent orchestration layer (Forecaster, Triage, Dispatcher, Comms) built on Gemini + Agent Development Kit (ADK).
- Web dashboard: live risk map, complaint feed, dispatch plan review queue, NL chat panel.
- Complaint submission flow (text + photo) with Gemini multimodal classification.
- Alerting (simulated SMS/WhatsApp — actual delivery via a sandbox provider, clearly labeled as demo-scope).
- Looker-embedded analytical views for historical trend reporting.

**Out of scope (see Non-Goals).**

## 7. Key Differentiators ("why this wins")

1. **Acceleration is the product, not a footnote** — every risk refresh is benchmarked live, CPU vs GPU, inside the dashboard itself.
2. **Grounded, not hallucinated** — the NL chat interface answers only from BigQuery/model outputs with citations to the underlying query, never free-floating LLM claims.
3. **Human-in-the-loop by design** — no agent action (dispatch, alert) fires without explicit approval, addressing responsible-AI judging criteria directly.
4. **Two cities, one platform** — NYC (data-rich validation) + Pune (real-world relevance) prove the architecture generalizes.

## 8. Assumptions & Constraints

- BigQuery public datasets (NYC 311, NOAA GSOD) remain freely queryable within the 1TB/month free tier for the project duration.
- A single GPU node (T4 or L4 class) on GKE is sufficient for demo-scale RAPIDS/XGBoost workloads.
- Pune live data is limited to what free APIs (Open-Meteo, OpenAQ) expose; no live PMC complaint feed is assumed to exist, so this module is explicitly labeled "monitoring + forecast" rather than "closed-loop dispatch."
- Development window: hackathon timeline (see Doc 12, Project Plan).

## 9. Success Criteria for Submission

- Live, running deployment (not just slides) reachable via a public URL.
- Demonstrated CPU-vs-GPU benchmark inside the actual product.
- At least one full closed-loop demo: incoming complaint → triage → risk update → agent-drafted plan → human approval → simulated alert.
- Clear labeling of every simulated/mocked component.
- README with architecture diagram, setup steps, and data source citations.

## 10. Risks Summary (see Doc 13 for full assessment)

- Public dataset schema drift or rate limits.
- GPU quota approval delays on GCP (request early).
- Scope creep across 4 agents — mitigate by building Forecaster + Triage first (they carry the core "acceleration" and "AI" story), Dispatcher + Comms as stretch.
