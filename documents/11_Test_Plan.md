# Test Plan
## CityPulse

**Version:** 1.0

---

## 1. Testing Scope & Objectives
Validate that CityPulse meets the functional requirements (Doc 3), acceptance criteria (Doc 4), non-functional thresholds (Doc 3 §4), and security requirements (Doc 10) before the hackathon demo, with a pragmatic level of coverage given the build timeline.

## 2. Test Levels

### 2.1 Unit Tests
- **Scope:** Individual functions — feature engineering transforms, SQL-query-safety validator, risk score categorization logic, dedup-matching logic.
- **Tooling:** `pytest` (Python backend), `vitest`/`jest` (Next.js frontend components).
- **Target coverage:** ≥70% on backend business logic (feature pipeline, agent tool functions, API route handlers); UI components tested for critical interactive states (map click, approve/reject buttons) rather than exhaustive coverage.
- **Examples:**
  - `test_feature_pipeline_cpu_gpu_parity()` — asserts cuDF and pandas outputs match within tolerance (ties to US-B2 AC1).
  - `test_sql_validator_rejects_non_select()` — asserts NL-chat SQL guard blocks `DROP`, `DELETE`, `;`-chained statements (ties to SEC-4.3).
  - `test_dedup_matches_within_radius()` — asserts two complaints 50m apart within 1 hour, same category, are clustered together.
  - `test_dispatch_plan_cannot_self_approve()` — asserts no code path allows an agent-authenticated request to set `dispatch_plans.status = 'approved'`.

### 2.2 Integration Tests
- **Scope:** API endpoints against a real (test) Postgres + mocked BigQuery/Gemini responses.
- **Tooling:** `pytest` + `httpx` test client; a seeded test database reset per test run.
- **Examples:**
  - `POST /complaints` → verify row created, Triage Agent invoked (mocked), cluster assignment correct.
  - `POST /dispatch-plans/{id}/approve` with a `dispatcher` role → 200; with an `analyst` role → 403.
  - `POST /chat/query` with an ambiguous question → `clarification_needed: true`, no query executed.
  - Ingestion job against a small fixture BigQuery dataset → correct row counts in `curated_complaints`.

### 2.3 End-to-End (E2E) Tests
- **Scope:** Full user flows through the actual deployed frontend + backend + staging database.
- **Tooling:** Playwright.
- **Critical flows (must pass before demo):**
  1. Citizen submits complaint with photo → reference code shown → status trackable.
  2. Simulated risk breach → dispatch plan appears in queue → official approves → alert draft appears → official approves alert → status becomes `sent`.
  3. Analyst asks a natural-language question → answer + SQL shown.
  4. Benchmark panel: trigger run → both CPU and GPU times populate, speedup calculated correctly.
  5. Role enforcement: analyst account cannot see Approve/Reject buttons; dispatcher account can.

### 2.4 Performance / Load Testing
- **Tooling:** `locust` or `k6` against staging.
- **Scenarios:**
  - 50 concurrent complaint submissions — verify no dropped requests, response time <2s for the initial 201.
  - Risk scoring cycle for full zone set — verify NFR-1 (<2 min GPU) under realistic data volume.
  - Chat endpoint under 10 concurrent NL queries — verify rate limiting engages correctly at defined thresholds without crashing the service.

### 2.5 GPU Benchmark Validation (project-specific, high priority)
- **Objective:** Prove the acceleration claim is real and reproducible, not a one-off lucky run.
- **Method:** Run the CPU-vs-GPU benchmark 3 times on the same dataset window; record min/max/mean speedup; document results in the submission README so judges can independently verify by re-running `/benchmark/run`.
- **Pass criteria:** GPU path is consistently ≥10x faster across all 3 runs (Doc 4 US-B2 AC2).

### 2.6 Security Testing (lightweight, hackathon scope)
- Manual verification of role-gated endpoints (attempt every state-changing call with each role, confirm correct 200/403 behavior).
- Manual prompt-injection test: submit a complaint whose text attempts to instruct the agent to approve plans or reveal secrets; verify no effect (ties to SEC-5.2).
- Automated dependency vulnerability scan (`pip-audit`, `npm audit`) run in CI (ties to Doc 14 CI/CD pipeline).

### 2.7 Accessibility Testing
- Automated: `axe-core` scan on all P0 screens (Doc 5) as part of CI.
- Manual: keyboard-only navigation through complaint submission and dispatch approval flows.

## 3. Test Data Strategy
- Unit/integration tests use fixture data (small synthetic complaint/weather sets) checked into the repo under `/tests/fixtures`.
- E2E/staging tests use a curated 30-day slice of real NYC 311 + NOAA data (small enough to keep BigQuery costs and staging DB size manageable) plus synthetic Pune events for demonstrating the flood-trigger flow reliably during judging (clearly documented as a rehearsed scenario, not live-only, so the demo isn't dependent on real rain occurring at the exact judging moment).

## 4. Entry & Exit Criteria

**Entry criteria for E2E test pass:** all unit and integration tests green in CI; staging environment deployed and seeded.

**Exit criteria for demo readiness:**
- All 5 critical E2E flows (§2.3) pass on staging.
- Benchmark validation (§2.5) documented with 3 consistent runs.
- No open Sev-1 bugs (crashes, data corruption, security bypass) in the tracker.
- Sev-2 bugs (visual glitches, non-blocking edge cases) documented as known issues in the README, not silently left undocumented.

## 5. Defect Severity Classification

| Severity | Definition | Example |
|---|---|---|
| Sev-1 | Blocks core demo flow or corrupts data | Approve button doesn't persist state; agent can self-approve |
| Sev-2 | Degrades experience but has a workaround | Map tooltip misaligned; slow chat response under load |
| Sev-3 | Cosmetic | Inconsistent spacing, minor copy issues |

## 6. Test Schedule
Aligned to Doc 12 Project Plan — unit/integration tests written alongside each epic's implementation (not deferred to the end); E2E and benchmark validation run in the final 2 days before submission, with one full dry-run demo day before the actual judging session.
