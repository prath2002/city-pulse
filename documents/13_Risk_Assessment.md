# Risk Assessment
## CityPulse

**Version:** 1.0 | **Scale:** Likelihood (L) and Impact (I) rated 1 (low) – 5 (high). Priority = L × I.

---

## 1. Technical Risks

| # | Risk | L | I | Priority | Mitigation |
|---|---|---|---|---|---|
| T1 | GPU quota approval delay on GCP (T4/L4 quota not granted in time) | 3 | 5 | 15 | Request GPU quota increase on Day 1, not when needed. Have a CPU-only fallback demo path that still shows correct results, just without the live speed claim, as insurance. |
| T2 | RAPIDS/cuDF version incompatibility with GKE node image / CUDA driver mismatch | 3 | 4 | 12 | Pin exact RAPIDS + CUDA + driver versions from Day 1; test the GPU pipeline in isolation before integrating with the rest of the stack. |
| T3 | BigQuery wildcard queries (`gsod20*`) scan more data than expected, risking free-tier overage | 2 | 3 | 6 | Enforce explicit date/partition filters in every query; set a hard budget alert at low $ threshold; use `--dry_run` to estimate bytes scanned before running new queries. |
| T4 | Public dataset schema drift (column renamed/removed) | 1 | 3 | 3 | Pin ingestion queries to known-good schema; add a schema-validation check in the ingestion job that fails loudly rather than silently producing nulls. |
| T5 | Agent hallucination in NL-to-SQL layer produces an incorrect but plausible-looking answer | 3 | 4 | 12 | Always display the executed SQL alongside the answer (SEC/FR-4.3); validate generated SQL against an allowlist of approved views/columns before execution; add a "does this look right?" confidence flag when result set size is 0 or 1 (often indicates a bad query). |
| T6 | Real-time WebSocket updates add complexity/fragility under demo network conditions | 3 | 2 | 6 | Fall back to polling (every 5–10s) if WebSocket proves unstable close to the demo date; don't over-invest in real-time infra at the cost of core features. |
| T7 | Complaint photo classification (Gemini vision) misclassifies in front of judges | 2 | 3 | 6 | Pre-test with a curated set of realistic photos; show confidence score in UI; low-confidence results route to human review rather than displaying a wrong category confidently. |

## 2. Data Risks

| # | Risk | L | I | Priority | Mitigation |
|---|---|---|---|---|---|
| D1 | No live PMC (Pune) complaint feed exists — Pune module is weather/AQI only, not full parity with NYC | 5 | 3 | 15 | Be explicit in the product narrative: Pune module is "monitoring + forecast," NYC module is "full closed loop" — this is honest framing, not a weakness, if presented correctly (see PRD §8 Assumptions). |
| D2 | Historical data may not contain enough true "flood" events to validate the risk model rigorously | 3 | 3 | 9 | Use complaint-volume spikes (a broader, better-populated signal) as the primary validated target, and message flooding as one instance of the broader "civic risk spike" pattern the model predicts. |
| D3 | Synthetic/simulated data (pump inventory, PMC dispatch capacity) could be mistaken for real by judges if not labeled | 2 | 4 | 8 | Explicit, visible "Simulated data" badges in the UI wherever mock data is used (Doc 5 component library candidate: `SimulatedDataBadge`). |

## 3. Schedule Risks

| # | Risk | L | I | Priority | Mitigation |
|---|---|---|---|---|---|
| S1 | Scope creep across 4 agents consumes all remaining time before frontend/demo polish | 4 | 5 | 20 | Hard-cut order enforced in Doc 12: Forecaster + Triage are P0, Dispatcher + Comms are P1/stretch. Timebox each agent's build; if over time, ship a simplified/rule-based stub version rather than blocking the schedule. |
| S2 | Frontend polish underestimated (map interactions, responsive layout) | 3 | 3 | 9 | Start frontend scaffolding in parallel from Week 2 against mocked API responses (Doc 12 §3). |
| S3 | Demo day technical failure (live API down, GPU node not provisioned in time) | 2 | 5 | 10 | Record a backup demo video 48 hours before submission as an absolute fallback; rehearse the live demo at least twice on the actual deployed environment, not localhost. |

## 4. Team / Solo-Builder Risks

| # | Risk | L | I | Priority | Mitigation |
|---|---|---|---|---|---|
| P1 | Solo builder burnout / underestimating total scope of 14-document + full-stack build | 4 | 4 | 16 | Use Doc 12 §5 compressed timeline as the real fallback plan; it is fine — and expected — to ship a reduced feature set with 2 of 4 agents fully working rather than 4 agents half-working. Judges reward depth + honesty over breadth + fragility. |
| P2 | Over-investment in documentation (this document set) at the expense of build time | 2 | 3 | 6 | These 14 documents are a planning aid, not a deliverable judges will read line-by-line — timebox document refinement, prioritize the working product. |

## 5. Compliance / Ethical Risks

| # | Risk | L | I | Priority | Mitigation |
|---|---|---|---|---|---|
| C1 | Presenting an autonomous "dispatch" system could raise responsible-AI concerns if not clearly human-gated | 2 | 4 | 8 | Human-in-the-loop is architecturally enforced (SEC-5.1), not just a UI convention — call this out explicitly in the demo narrative as a design choice, since judging criteria mention "responsible and explainable AI." |
| C2 | Using real NYC citizen complaint data (even though public) without clear attribution | 1 | 2 | 2 | Cite BigQuery public dataset sources explicitly in the README and in-app footer. |

## 6. Top 3 Risks to Actively Manage This Week
1. **S1 — Agent scope creep** (Priority 20)
2. **P1 — Solo builder overload** (Priority 16)
3. **T1 — GPU quota delay** (Priority 15) / **D1 — Pune data parity** (Priority 15)
