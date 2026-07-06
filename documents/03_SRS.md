# Software Requirements Specification (SRS)
## CityPulse

**Version:** 1.0 | **Conforms loosely to IEEE 830 structure**

---

## 1. Introduction

### 1.1 Purpose
This SRS defines the complete functional and non-functional requirements for CityPulse, an AI-powered civic decision intelligence platform, at a level of detail sufficient for independent implementation.

### 1.2 Scope
CityPulse ingests public civic and weather data (NYC 311, NOAA GSOD, Open-Meteo, OpenAQ), computes GPU-accelerated risk scores per geographic zone, runs a multi-agent AI layer to triage citizen reports and draft response plans, and exposes a web dashboard and natural-language chat interface to city officials and citizens.

### 1.3 Definitions

| Term | Definition |
|---|---|
| Zone | A geographic unit (NYC borough/community district, or Pune ward) used as the base granularity for risk scoring |
| Risk score | A 0–100 value per zone per time window indicating predicted likelihood/severity of civic incidents (flooding, service-request spikes) |
| Complaint | A citizen-submitted or 311-sourced report of a civic issue |
| Agent | An autonomous Gemini/ADK-driven component with a defined role (Forecaster, Triage, Dispatcher, Comms) |
| Dispatch plan | An agent-drafted, human-approved recommendation for resource allocation in response to elevated risk |
| Human-in-the-loop (HITL) | Requirement that no agent output with real-world effect executes without explicit human approval |

### 1.4 References
- PRD v1.0 (Doc 1), TRD v1.0 (Doc 2)
- Google Cloud BigQuery public dataset documentation
- Google Agent Development Kit documentation

## 2. Overall Description

### 2.1 Product Perspective
CityPulse is a new, standalone system. It reads from public/free external data sources and writes to its own operational store; it does not modify or write back to NYC's or Pune's actual civic systems (no real dispatch integration in v1).

### 2.2 Product Functions (summary)
1. Data ingestion & curation (batch + streaming poll)
2. GPU-accelerated feature engineering & risk modeling
3. Agent orchestration (forecast, triage, dispatch drafting, communications drafting)
4. Web dashboard (map, feed, chat, review queue)
5. Complaint submission (citizen-facing)
6. Audit logging

### 2.3 User Classes

| Class | Description | Access level |
|---|---|---|
| Citizen | Submits complaints, no login required for submission, optional account for tracking | Write: complaints. Read: own complaint status |
| Analyst | Views dashboards, risk maps, runs NL queries | Read: all analytical data. No approval rights |
| Dispatcher/Official | Approves/rejects agent-drafted dispatch plans and alerts | Read/write: dispatch plans, alerts |
| Admin | Manages users, zones, model retraining triggers, system config | Full access |

### 2.4 Operating Environment
Cloud-native, deployed on GKE. Client: modern evergreen browsers (Chrome, Edge, Safari, Firefox), responsive down to tablet width. No IE support.

### 2.5 Design & Implementation Constraints
- Must operate within BigQuery free-tier query budget (see Doc 2 §6 risk).
- All agent actions with real-world effect require HITL approval (see Doc 10).
- GPU workloads must be able to scale to zero to control cost.

## 3. Functional Requirements (detailed)

### FR-1: Data Ingestion
- FR-1.1 System shall run a scheduled job (daily, 02:00 UTC) that queries `bigquery-public-data.new_york_311.311_service_requests` for records created in the last ingestion window and writes curated rows to `citypulse.curated_complaints`.
- FR-1.2 System shall join curated complaints against `bigquery-public-data.noaa_gsod.gsod20*` on nearest weather station and date, producing `citypulse.complaints_weather_joined`.
- FR-1.3 System shall poll Open-Meteo (hourly) and OpenAQ (hourly) for Pune coordinates and append to `citypulse.pune_live_signals`.
- FR-1.4 On ingestion failure (API unreachable, schema mismatch), system shall log the error, retry with exponential backoff (max 3 attempts), and alert the admin dashboard with a visible status badge — not fail silently.

### FR-2: Feature Engineering & Risk Scoring
- FR-2.1 System shall compute, per zone per day: rolling complaint counts (7/14/30-day), category mix, precipitation sum, temperature extremes, and complaint growth rate, using cuDF.
- FR-2.2 System shall provide a toggle/benchmark mode that runs the identical feature pipeline on pandas (CPU) and cuDF (GPU) and records wall-clock time for both, exposed via API and dashboard.
- FR-2.3 System shall score every zone using a trained XGBoost model (GPU inference) to output a risk score (0–100) and top-5 contributing features.
- FR-2.4 System shall persist risk scores with a `model_version` and `computed_at` timestamp for traceability.
- FR-2.5 Risk score computation for all zones (NYC ~200 community districts equivalent + Pune wards) shall complete in under 2 minutes on the GPU path.

### FR-3: Agent Layer
- FR-3.1 **Forecaster Agent** shall run after each risk-scoring cycle, compare new scores against thresholds, and create a `risk_alert_trigger` record for any zone crossing its threshold.
- FR-3.2 **Triage Agent** shall, on new complaint submission, extract category, severity (1–5), geo-zone, and — if a photo is attached — a Gemini vision-derived description, and shall attempt to match the complaint to an existing open cluster within a configurable spatial/time/category radius before creating a new cluster.
- FR-3.3 **Dispatcher Agent** shall, for each `risk_alert_trigger`, draft a resource allocation plan (zone, recommended resource type/count, priority rank, rationale referencing contributing features) and submit it to the human review queue in `pending` state. It shall never set a plan to `approved` itself.
- FR-3.4 **Comms Agent** shall draft a citizen-facing alert message in English, Hindi, and Marathi for any dispatch plan a human has approved, and submit the draft to the review queue in `pending` state before any send action.
- FR-3.5 All agent actions shall be recorded in `agent_action_log` with full input/output payloads.

### FR-4: Natural Language Query Interface
- FR-4.1 System shall accept a free-text question from an authenticated Analyst/Official/Admin user.
- FR-4.2 System shall route the question to a query-generation agent that produces a parameterized BigQuery SQL query against approved views only (no arbitrary table access).
- FR-4.3 System shall execute the generated query, format results, and return a natural-language answer alongside the executed SQL for transparency.
- FR-4.4 If the agent cannot produce a valid, safe query (e.g., ambiguous question, requires data not present), system shall respond with a clarifying question rather than a fabricated answer.

### FR-5: Complaint Submission (Citizen-Facing)
- FR-5.1 System shall provide a public web form accepting: free-text description, optional photo upload (max 10MB, JPEG/PNG), optional geolocation (browser geolocation API or manual pin).
- FR-5.2 System shall return a complaint reference ID and estimated acknowledgment time immediately on submission (before agent processing completes), then update status asynchronously.

### FR-6: Dashboard & Review
- FR-6.1 Map view shall render zones color-coded by current risk score, updating on each scoring cycle.
- FR-6.2 Complaint feed shall show recent complaints with cluster grouping, category, and status.
- FR-6.3 Dispatch review queue shall show pending agent-drafted plans with an Approve/Reject/Edit action, restricted to Dispatcher/Official/Admin roles.
- FR-6.4 Chat panel shall expose the NL query interface with conversation history for the session.

### FR-7: Audit & Logging
- FR-7.1 Every state-changing action (approval, rejection, edit, alert send) shall be logged with actor user ID, timestamp, and before/after state.

## 4. Non-Functional Requirements

See Doc 2 §2.2 for the master list; detailed acceptance thresholds:

| ID | Requirement | Threshold |
|---|---|---|
| NFR-1 | Risk scoring latency | <2 min for full zone set on GPU |
| NFR-2 | Dashboard load time | <3s initial load (cached data), <1s subsequent navigation |
| NFR-3 | NL query response time | <5s for 90th percentile of common question templates |
| NFR-4 | Uptime during judging window | ≥99% |
| NFR-5 | Data staleness tolerance | Pune live data displayed with a "last updated" timestamp; flagged stale if >2 hours old |
| NFR-6 | Auditability | 100% of agent/human state changes logged, immutable |
| NFR-7 | Cost | $0 beyond free tier / provided credits for hackathon duration |

## 5. External Interface Requirements
See Doc 9 (API Specification) for full endpoint contracts, and Doc 7 (Database Design) for schema.

## 6. Traceability
Each FR above maps to one or more User Stories in Doc 4, and each NFR maps to a Test Plan section in Doc 11.
