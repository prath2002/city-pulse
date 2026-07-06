# API Specification
## CityPulse — REST API Contract

**Version:** 1.0 | **Base URL:** `https://api.citypulse.app/v1` | **Format:** JSON | **Auth:** Bearer JWT (Firebase-issued, verified server-side), except where marked `public`

---

## 1. Conventions
- All timestamps ISO 8601 UTC.
- All list endpoints support `?limit=` (default 50, max 200) and `?cursor=` pagination.
- Error format:
```json
{ "error": { "code": "string", "message": "string", "details": {} } }
```
- Standard HTTP status codes: 200 (success), 201 (created), 400 (validation), 401 (unauthenticated), 403 (unauthorized role), 404, 409 (conflict/state), 429 (rate limited), 500.

## 2. Authentication

### `POST /auth/session` *(public)*
Exchanges a Firebase ID token for a CityPulse session (validates token, upserts user record, returns role-annotated JWT for subsequent calls).
- **Request:** `{ "firebase_id_token": "string" }`
- **Response 200:** `{ "token": "string", "user": { "id": "uuid", "role": "analyst", "name": "string" } }`

## 3. Zones

### `GET /zones?city=nyc|pune`
Returns all zones with current risk score.
- **Response 200:**
```json
{ "zones": [
  { "zone_id": "pune-ward-14", "city": "pune", "name": "Ward 14",
    "risk_score": 82, "risk_category": "high", "computed_at": "2026-07-06T10:00:00Z" }
] }
```

### `GET /zones/{zone_id}`
Zone detail: current + historical risk scores, contributing factors, recent complaints summary.
- **Response 200:**
```json
{ "zone_id": "pune-ward-14", "name": "Ward 14",
  "risk_history": [ { "score": 61, "computed_at": "..." }, { "score": 82, "computed_at": "..." } ],
  "contributing_factors": [
    { "feature": "rainfall_24h_mm", "value": 62, "importance": 0.41 },
    { "feature": "complaint_growth_rate", "value": 1.4, "importance": 0.27 }
  ],
  "recent_complaint_count": 12,
  "active_dispatch_plan_id": "uuid-or-null"
}
```

## 4. Complaints

### `POST /complaints` *(public)*
Citizen submits a new complaint.
- **Request:** `multipart/form-data`: `description` (string, required), `photo` (file, optional, ≤10MB), `lat`, `lon` (optional floats)
- **Response 201:**
```json
{ "complaint_id": "uuid", "reference_code": "CP-88213",
  "status": "received", "estimated_ack_minutes": 10 }
```

### `GET /complaints/{reference_code}/status` *(public)*
- **Response 200:** `{ "reference_code": "CP-88213", "status": "in_progress", "category": "flooding", "zone_name": "Ward 14" }`

### `GET /complaints?zone_id=&category=&status=&since=`
Authenticated feed listing, supports filters described in Doc 6.
- **Response 200:** `{ "complaints": [ {...}], "next_cursor": "string|null" }`

### `GET /complaints/clusters/{cluster_id}`
Returns cluster detail with all constituent complaints and the Triage Agent's dedup rationale.

## 5. Risk & Benchmark

### `GET /risk-scores/latest?city=nyc|pune`
Returns latest score per zone (used by map).

### `POST /risk-scores/recompute` *(role: admin)*
Manually triggers a scoring cycle (demo convenience endpoint).
- **Response 202:** `{ "job_id": "uuid", "status": "queued" }`

### `POST /benchmark/run`
Triggers the CPU-vs-GPU feature pipeline benchmark on demand.
- **Request:** `{ "dataset_window_days": 30 }`
- **Response 200:**
```json
{ "cpu_ms": 2472000, "gpu_ms": 53000, "speedup": 46.6,
  "rows_processed": 8412003, "engine_gpu": "cudf-24.x" }
```

## 6. Agents & Dispatch

### `GET /triggers?status=open`
List active risk alert triggers.

### `GET /dispatch-plans?status=pending|approved|rejected`
List dispatch plans for the review queue.
- **Response 200:**
```json
{ "plans": [
  { "id": "uuid", "zone_id": "pune-ward-14", "priority": 1,
    "resources": { "pumps": 2, "crew": 1 },
    "rationale": "Rainfall 62mm/24h, drainage capacity low, complaint growth +140%",
    "status": "pending", "created_by_agent": "dispatcher_agent_v1.2" }
] }
```

### `POST /dispatch-plans/{id}/approve` *(role: dispatcher, admin)*
- **Request:** `{ "edited_resources": { "pumps": 3, "crew": 1 } | null }`
- **Response 200:** `{ "id": "uuid", "status": "approved" | "edited_approved" }`
- **Side effect:** creates a `pending` Comms Agent alert draft automatically; logs action to `agent_action_log`.

### `POST /dispatch-plans/{id}/reject` *(role: dispatcher, admin)*
- **Request:** `{ "reason": "string" }`
- **Response 200:** `{ "id": "uuid", "status": "rejected" }`

### `GET /alerts?status=pending`
List draft alerts awaiting approval.

### `POST /alerts/{id}/approve` *(role: dispatcher, admin)*
- **Response 200:** `{ "id": "uuid", "status": "approved" }` — triggers simulated send, sets `sent_at`.

## 7. Natural Language Chat

### `POST /chat/query`
- **Request:** `{ "question": "which zones are highest risk this week?", "session_id": "uuid" }`
- **Response 200:**
```json
{ "answer": "Ward 14, Ward 9, and Ward 22 show the highest predicted risk this week, driven mainly by rainfall and complaint growth.",
  "sql_executed": "SELECT zone_id, score FROM `citypulse.risk_scores_history` WHERE ... ORDER BY score DESC LIMIT 3",
  "data": [ { "zone_id": "pune-ward-14", "score": 82 } ],
  "clarification_needed": false }
```
- If the agent cannot safely answer: `{ "clarification_needed": true, "clarifying_question": "Do you mean this week's forecasted risk, or last week's actual complaint volume?" }`

## 8. Admin

### `GET /admin/audit-log?entity_type=&entity_id=`  *(role: admin)*
Read-only paginated view of `agent_action_log`.

### `PATCH /admin/zones/{zone_id}/threshold`  *(role: admin)*
- **Request:** `{ "risk_threshold": 75 }`

### `GET /admin/models`  *(role: admin)*
Lists trained model versions, training date, validation metrics.

## 9. WebSocket (real-time updates)

### `WS /ws/dashboard`
Server pushes events on: new risk score computed, new complaint received, dispatch plan status change.
- **Event shape:** `{ "type": "risk_score_updated", "zone_id": "pune-ward-14", "score": 82 }`

## 10. Rate Limits
- Public endpoints (`/complaints`, `/complaints/*/status`): 20 requests/minute/IP.
- Authenticated endpoints: 120 requests/minute/user.
- `/chat/query`: 20 requests/minute/user (LLM cost control).

## 11. Versioning
All routes prefixed `/v1`. Breaking changes require `/v2`; additive fields are non-breaking and may be added to `/v1` responses at any time.
