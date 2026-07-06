# UI/UX Wireframes & Mockup Specification
## CityPulse

**Version:** 1.0 — Layout specification for frontend implementation (Next.js + Tailwind)

---

## 1. Design Principles
- **Decision-first, not data-first.** Every screen should answer "what should I do about this?" not just "here is data."
- **Trust through transparency.** Any AI-generated output (risk score, dispatch plan, chat answer) visibly shows its basis (contributing features, executed SQL, source data timestamp).
- **Calm under pressure.** This is used during actual emergencies (heavy rain, heat waves) — high information density but low visual noise; status colors used sparingly and consistently (red = high risk/urgent, amber = watch, green = normal, gray = stale/unknown).

## 2. Screen Inventory

| Screen | Primary user | Priority |
|---|---|---|
| S1. Login | All | P0 |
| S2. Risk Map Dashboard (home) | Analyst, Official, Admin | P0 |
| S3. Zone Detail Panel (slide-over) | Analyst, Official | P0 |
| S4. Complaint Feed | Analyst, Official | P0 |
| S5. Dispatch Review Queue | Official, Admin | P0 |
| S6. NL Chat Panel | Analyst, Official, Admin | P0 |
| S7. Benchmark Panel | All (demo-facing) | P0 |
| S8. Citizen Complaint Submission (public) | Citizen | P0 |
| S9. Complaint Status Tracker (public) | Citizen | P1 |
| S10. Admin: Users & Zones | Admin | P1 |
| S11. Weekly Digest / Looker Embed | Director | P1 |

## 3. Layout Specifications

### S2. Risk Map Dashboard (home screen)
```
┌─────────────────────────────────────────────────────────────────┐
│ Top bar: [CityPulse logo]  [City switcher: NYC / Pune]  [User ▾]│
├───────────────┬─────────────────────────────────────┬───────────┤
│ Left rail      │                                     │ Right rail│
│ - Nav:         │        MAP (zone choropleth)        │ - Chat    │
│   Map          │        colored by risk score        │   panel   │
│   Feed         │        click zone -> S3 slide-over  │   (S6)    │
│   Dispatch     │                                     │           │
│   Benchmark    │                                     │           │
│   Admin        │                                     │           │
├───────────────┴─────────────────────────────────────┴───────────┤
│ Bottom strip: [Last updated: 2m ago] [Model v: 1.3] [Engine: GPU]│
└─────────────────────────────────────────────────────────────────┘
```
- Map legend: 5-step color scale (gray = no data, green → amber → red).
- Zone hover: tooltip with zone name + current risk score only (detail on click, not hover, to avoid clutter).
- Top bar city switcher swaps the map's base layer and zone set (NYC community districts vs Pune wards) without a full page reload.

### S3. Zone Detail Panel (slide-over, right side, overlays map)
```
┌───────────────────────────────┐
│ [x] Zone: Ward 14 — Pune       │
│ Risk score: 82  [RED / HIGH]  │
│ Trend (7d): ▂▃▅▇█ (sparkline) │
│                                │
│ Top contributing factors:      │
│  • Rainfall last 24h: 62mm     │
│  • Complaint growth: +140%     │
│  • Drainage capacity: low      │
│                                │
│ Recent complaints (12)         │
│  [list, clickable, -> S4]      │
│                                │
│ [ Draft dispatch plan ] button │
│  (visible to Official/Admin)   │
└───────────────────────────────┘
```

### S4. Complaint Feed
```
┌──────────────────────────────────────────────────────────┐
│ Filters: [Category ▾] [Zone ▾] [Status ▾] [Search]        │
├──────────────────────────────────────────────────────────┤
│ ● Cluster (14 reports) — Flooded street — Ward 14 — 12m   │
│   [Open] [Photo thumbnail] [View cluster ->]              │
├──────────────────────────────────────────────────────────┤
│ ● Single report — Broken streetlight — Ward 9 — 40m       │
│   [Open]                                                   │
└──────────────────────────────────────────────────────────┘
```
- Each row: status dot (open/in-progress/resolved), category icon, cluster size badge if >1, relative timestamp.
- Clicking a cluster opens a detail view listing all constituent reports and the agent's dedup rationale (for transparency/debugging).

### S5. Dispatch Review Queue
```
┌──────────────────────────────────────────────────────────┐
│ Pending (3)   Approved today (5)   Rejected today (1)      │
├──────────────────────────────────────────────────────────┤
│ Ward 14 — Risk 82 — Recommend: 2 pumps, high priority      │
│ Rationale: rainfall 62mm/24h, drainage capacity low,        │
│ complaint growth +140% (agent: Dispatcher, v1.2)            │
│ [ Approve ]  [ Edit ]  [ Reject ]                           │
├──────────────────────────────────────────────────────────┤
│ Ward 9 — Risk 71 — Recommend: 1 crew, medium priority       │
│ [ Approve ]  [ Edit ]  [ Reject ]                           │
└──────────────────────────────────────────────────────────┘
```
- "Edit" opens an inline form to adjust resource count/priority before approval — approving an edited plan logs both the original agent output and the human-modified version.
- After approval, plan automatically appears in Comms Agent queue for alert drafting (separate approval step, not shown here — see S5b in Admin flows).

### S6. NL Chat Panel (right rail, persistent across dashboard)
```
┌───────────────────────────────┐
│ Ask CityPulse                  │
├───────────────────────────────┤
│ You: which zones are highest   │
│ risk this week?                │
│                                │
│ CityPulse: Ward 14, Ward 9,    │
│ and Ward 22 show the highest   │
│ predicted risk, driven mainly  │
│ by rainfall and complaint      │
│ growth.  [View SQL used ▾]     │
├───────────────────────────────┤
│ [ Type a question...      ]→  │
└───────────────────────────────┘
```
- "View SQL used" expands a monospace, read-only code block with the exact executed query — critical for judge/analyst trust.
- Chat history persists per session only (no long-term storage in v1, per Non-Goals).

### S7. Benchmark Panel (demo-facing)
```
┌──────────────────────────────────────────────────────────┐
│  GPU Acceleration Benchmark                                │
│                                                              │
│   CPU (pandas)   ████████████████████████████  41m 12s     │
│   GPU (cuDF)     █  53s                                     │
│                                                              │
│   Speedup: 46.6x         [ Run benchmark again ]            │
│                                                              │
│   Rows processed: 8,412,003     Engine: RAPIDS cuDF 24.x    │
└──────────────────────────────────────────────────────────┘
```
- This panel exists specifically to make the acceleration claim falsifiable/provable live during judging — do not skip building this even under time pressure.

### S8. Citizen Complaint Submission (public, no login required)
```
┌────────────────────────────────────┐
│ Report a problem                    │
├────────────────────────────────────┤
│ What's the issue? [text area]       │
│ [ Add photo (optional) ]            │
│ [ Use my location ] or [ Pin on map]│
│                                      │
│ [ Submit ]                          │
└────────────────────────────────────┘
        ↓ on submit
┌────────────────────────────────────┐
│ ✓ Reported. Reference: CP-88213     │
│ Estimated acknowledgment: ~10 min   │
│ [ Track status ]                    │
└────────────────────────────────────┘
```

## 4. Component Library (Tailwind-based, shared across screens)
- `RiskBadge` — colored pill, props: `score`, maps to red/amber/green/gray automatically.
- `ContributingFactorList` — bullet list with icon per factor type (rain, growth, capacity).
- `ApprovalActions` — Approve/Edit/Reject button group with confirmation modal on Reject.
- `SqlDisclosure` — collapsible monospace block for any AI-generated query.
- `StaleDataFlag` — small gray badge + tooltip, shown whenever a data source exceeds its freshness threshold (see SRS NFR-5).
- `Sparkline` — minimal 7-point trend line, no axes, used inline in list rows and detail panels.

## 5. Accessibility Requirements
- All interactive elements keyboard-navigable; focus states visible.
- Color is never the sole encoding of risk — always paired with a text label ("HIGH", "WATCH", "NORMAL").
- Minimum contrast ratio 4.5:1 for all text.
- Map has a non-visual list-view fallback (table of zones + scores) for screen reader users.

## 6. Next Step
Recommend generating high-fidelity click-through mockups (Figma or an HTML prototype) for S2, S5, and S6 specifically — these are the three screens judges will actually watch you operate live. I can generate an interactive HTML mockup of any of these screens directly in this chat if useful.
