# Information Architecture
## CityPulse

**Version:** 1.0

---

## 1. Site Map

```
/                                → Redirect to /dashboard (if authed) or /report (public)
/login                           → S1 Login
/report                          → S8 Citizen complaint submission (public, no auth)
/report/status/:referenceId      → S9 Complaint status tracker (public)

/dashboard                       → S2 Risk Map Dashboard (home, authed)
  /dashboard?city=nyc|pune       → City switcher via query param, shallow route
  /dashboard/zone/:zoneId        → S3 Zone detail (rendered as slide-over over /dashboard,
                                     but deep-linkable as its own route)
/feed                            → S4 Complaint Feed
  /feed/cluster/:clusterId       → Cluster detail view
/dispatch                        → S5 Dispatch Review Queue
  /dispatch/:planId              → Individual plan detail/edit
/benchmark                       → S7 Benchmark Panel
/chat                            → S6 NL Chat (also embedded as persistent right-rail widget
                                     on /dashboard, /feed, /dispatch)
/reports/weekly                  → S11 Weekly digest (Looker embed)

/admin                           → S10 Admin home
/admin/users                     → User management
/admin/zones                     → Zone/threshold configuration
/admin/models                    → Model version history, retrain trigger
/admin/audit-log                 → Full agent_action_log viewer
```

## 2. Navigation Hierarchy

**Primary nav (left rail, authenticated app):**
1. Map (home)
2. Feed
3. Dispatch
4. Chat (also always-available right rail)
5. Benchmark
6. Reports
7. Admin (role-gated: only visible to Admin)

**Public nav (unauthenticated, citizen-facing):**
1. Report a problem
2. Track a report
3. Sign in (for officials)

## 3. Role-Based Visibility Matrix

| Route | Citizen (public) | Analyst | Official/Dispatcher | Admin |
|---|---|---|---|---|
| /report, /report/status | ✅ | – | – | – |
| /dashboard, /dashboard/zone | – | ✅ view only | ✅ view + draft trigger | ✅ |
| /feed | – | ✅ | ✅ | ✅ |
| /dispatch | – | ❌ (view read-only summary only) | ✅ full actions | ✅ |
| /chat | – | ✅ | ✅ | ✅ |
| /benchmark | – | ✅ | ✅ | ✅ |
| /reports/weekly | – | ✅ | ✅ | ✅ |
| /admin/* | – | ❌ | ❌ | ✅ |

## 4. Content Hierarchy Within Key Screens

**Risk Map Dashboard (information priority, top to bottom / most to least prominent):**
1. Overall highest-risk zone(s) — surfaced as a banner if any zone is in "HIGH" state
2. The map itself
3. Model/engine/freshness metadata (footer strip — present but de-emphasized)
4. Chat panel (always accessible, secondary to map)

**Zone Detail:**
1. Current risk score + trend
2. Contributing factors (the "why")
3. Recommended action (if a dispatch plan exists)
4. Raw recent complaints (supporting evidence, least prominent)

## 5. Search & Filtering Strategy
- Complaint feed: filter by category, zone, status, free-text search over description.
- Chat: not filterable — natural language replaces structured filters for ad hoc questions; feed filters remain for the structured/repetitive use case.
- No global search in v1 (explicitly deferred — feed + chat cover the two access patterns needed).

## 6. Labeling & Terminology Consistency
To avoid confusing officials switching between NYC and Pune views, use one consistent vocabulary across the whole app regardless of underlying source terminology:

| App term | NYC 311 source term | Pune equivalent |
|---|---|---|
| Zone | Community District | Ward |
| Complaint | Service Request | Citizen report |
| Category | Complaint Type | (Gemini-classified category) |
| Risk score | (derived, no source equivalent) | (derived, no source equivalent) |

This mapping is enforced in the data layer (Doc 7) so the frontend never needs source-specific branching logic.
