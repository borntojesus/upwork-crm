export type IdeaStatus = "idea" | "planned" | "wip" | "done";

export interface Idea {
  slug: string;
  title: string;
  description: string;
  status: IdeaStatus;
  priority: "p0" | "p1" | "p2";
  effort: "S" | "M" | "L" | "XL";
  impact: "high" | "medium" | "low";
  tags: string[];
  body: string; // markdown
}

export const IDEAS: Idea[] = [
  {
    slug: "lead-scoring",
    title: "Auto Lead Scoring",
    description:
      "Score inbound leads automatically based on message patterns, client history, and budget signals from conversation data.",
    status: "planned",
    priority: "p0",
    effort: "M",
    impact: "high",
    tags: ["ml", "conversations", "automation"],
    body: `## Overview

Automatically rank inbound client conversations by conversion likelihood so the team focuses effort on the highest-value leads first.

## Problem

Account managers review every new conversation manually. With 50+ active rooms the signal-to-noise ratio is low — high-value leads get the same attention as low-budget one-off gigs.

## Proposed Solution

Train a lightweight scoring model on historical conversation data:

- **Message sentiment** — positive framing, urgency language, budget mentions
- **Client history** — previous spend, hire rate, JSS
- **Thread depth** — more messages = higher intent
- **Budget signals** — explicit dollar mentions, hourly rate anchors

Score range: 0–100. Surface scores in the Conversations view as a badge.

## Implementation Plan

1. Export labeled historical data from \`fixtures/agent/conversations.json\`
2. Build feature extractor (regex + keyword dict initially)
3. Train logistic regression baseline
4. Wire score into the viewer sidebar

## Success Metrics

- Top-10 scored leads contain ≥7 actual conversions within 30 days
- Account manager review time per lead drops by 40%

## Risks

- Sparse training data in Phase 1 — start with heuristic rules, upgrade to ML in Phase 3
- Bias toward certain tech stacks if training set is skewed
`,
  },
  {
    slug: "response-time",
    title: "Response Time Analytics",
    description:
      "Track first-response time and follow-up cadence per client room. Alert when SLA thresholds are breached.",
    status: "wip",
    priority: "p0",
    effort: "S",
    impact: "high",
    tags: ["conversations", "sla", "analytics"],
    body: `## Overview

Measure how quickly the agency responds to client messages and flag rooms where response time exceeds agreed SLA thresholds.

## Problem

Slow responses are the #1 reason clients ghost or leave negative feedback on Upwork. We have no visibility into response-time distribution across rooms.

## Proposed Solution

For every room compute:

| Metric | Definition |
|--------|-----------|
| First Response Time | Time from client's first message to agency's first reply |
| Avg Response Time | Median gap across all client→agency exchanges |
| Max Gap | Longest period without a reply |
| SLA Breach | Any gap > configured threshold (default: 4 h business hours) |

Surface in the Conversations list as a heatmap column and a dedicated SLA dashboard card.

## Implementation Plan

1. Parse message timestamps from \`fixtures/agent/conversations.json\`
2. Compute per-room metrics in \`viewer/lib/metrics.ts\`
3. Add \`ResponseTimeCard\` to the room detail page
4. Add SLA breach count to the top-level KPI row

## Success Metrics

- Team reduces average response time from current baseline by 25% within 60 days
- Zero SLA breaches for P0 clients

## Configuration

\`\`\`jsonc
// viewer.config.ts (planned)
{
  "sla": {
    "defaultHours": 4,
    "businessHoursOnly": true,
    "timezone": "Europe/Kyiv"
  }
}
\`\`\`
`,
  },
  {
    slug: "client-segments",
    title: "Client Segmentation",
    description:
      "Cluster clients by tech stack, budget range, and engagement pattern to tailor outreach and staffing.",
    status: "idea",
    priority: "p1",
    effort: "M",
    impact: "high",
    tags: ["clients", "analytics", "ml"],
    body: `## Overview

Group the agency's client base into meaningful segments so outreach, proposals, and staffing can be tailored per segment rather than one-size-fits-all.

## Problem

The agency treats all clients the same — same proposal templates, same onboarding, same pricing. Clients who want a $200K React re-platform are pitched the same way as clients who need a $500 WordPress fix.

## Proposed Segments

| Segment | Budget | Tech | Engagement |
|---------|--------|------|-----------|
| Enterprise | >$50K/yr | Enterprise stack (Java, .NET, SAP) | Long-term contracts, slow decisions |
| Scale-up | $10K–50K/yr | Modern JS/TS, cloud-native | Fast, iterative, multiple hires |
| Startup | <$10K | Anything | One-time, high churn |
| Repeat Buyer | Any | Any | ≥3 past contracts |

## Data Sources

- Contract value and history from \`fixtures/agent/contracts.json\`
- Tech mentions extracted from conversation transcripts
- Job post keywords from proposal data

## Implementation Plan

1. Build keyword extractor for tech stack detection from messages
2. Cluster using k-means on (budget, contract_count, avg_contract_value)
3. Label clusters manually, store as \`segment\` field in client profile
4. Filter views in viewer by segment

## Success Metrics

- Proposal win rate improves by 15% for Enterprise segment after template customization
- Staffing pre-allocation accuracy improves for Scale-up segment
`,
  },
  {
    slug: "outreach-templates",
    title: "Smart Outreach Templates",
    description:
      "Generate and version proposal and follow-up templates per client segment with A/B performance tracking.",
    status: "idea",
    priority: "p1",
    effort: "M",
    impact: "high",
    tags: ["proposals", "templates", "automation"],
    body: `## Overview

Maintain a library of proven outreach templates, segmented by client type, with built-in A/B tracking so the team can iterate on what converts.

## Problem

Proposal writing is ad-hoc. Every account manager writes from scratch. There's no record of which approaches converted and which didn't.

## Proposed Solution

### Template Library Structure

\`\`\`
templates/
  enterprise/
    initial-contact.md
    follow-up-1w.md
    proposal-body.md
  scale-up/
    ...
  startup/
    ...
\`\`\`

### Variables

Templates use \`{{handlebars}}\` syntax:

- \`{{client.name}}\`, \`{{client.techStack}}\`
- \`{{agency.relevantCase}}\` — auto-selected case study
- \`{{proposal.budget}}\`, \`{{proposal.timeline}}\`

### A/B Tracking

Each sent proposal records which template variant was used. The viewer shows conversion rate per variant in the Proposals page.

## Implementation Plan

1. Audit 50 past winning proposals from conversation transcripts
2. Extract common patterns → draft 3 templates per segment
3. Build template renderer in \`viewer/lib/templates.ts\`
4. Tag proposals in the fixture with \`templateId\`

## Success Metrics

- Template usage rate ≥ 80% (vs. freeform writing)
- Template proposals convert 10% better than freeform baseline
`,
  },
  {
    slug: "deal-pipeline",
    title: "Visual Deal Pipeline",
    description:
      "Kanban board showing proposals and conversations at each funnel stage — from first contact to signed contract.",
    status: "planned",
    priority: "p0",
    effort: "L",
    impact: "high",
    tags: ["proposals", "pipeline", "ui"],
    body: `## Overview

Replace the flat proposals list with a kanban board that shows deal progression stage by stage, making bottlenecks instantly visible.

## Problem

The proposals list is a flat table. The team can't see at a glance how many deals are stuck at negotiation vs. awaiting client reply vs. ready to close.

## Pipeline Stages

| Stage | Trigger | Exit Condition |
|-------|---------|---------------|
| New Lead | Room created | First agency reply sent |
| Qualified | Response received | Proposal submitted |
| Proposal Sent | Proposal submitted | Client viewed/replied |
| Negotiating | Back-and-forth messages | Contract offered |
| Won | Contract signed | — |
| Lost | No reply >14 days or explicit decline | — |

## UI Design

- Horizontal scroll kanban with column counts and total value
- Cards show: client name, deal value estimate, last activity timestamp
- Drag-to-move cards to advance/revert stage (optimistic UI, writes to a local state file)
- Stage velocity chart: avg days per stage over last 90 days

## Implementation Plan

1. Map existing proposal statuses to pipeline stages
2. Build \`<PipelineBoard>\` client component with drag-and-drop
3. Add stage-velocity chart using Recharts
4. Wire to \`fixtures/agent/proposals.json\`

## Success Metrics

- Team identifies and unsticks 20% more stalled deals within first month
- Deal cycle time (New Lead → Won) reduces by 1 week average
`,
  },
  {
    slug: "earnings-forecast",
    title: "Earnings Forecasting",
    description:
      "Project 30/60/90-day revenue from active contracts, accounting for contract end dates and historical renewal rates.",
    status: "wip",
    priority: "p0",
    effort: "M",
    impact: "high",
    tags: ["earnings", "forecast", "analytics"],
    body: `## Overview

Give the agency leadership a forward-looking revenue number based on active contracts, historical renewal probability, and pipeline deals.

## Problem

Earnings visibility is retrospective only. Leadership sees last month's revenue but has no systematic view of next month's expected income.

## Forecast Model

### Committed Revenue

From active hourly contracts:
\`\`\`
committed = Σ (hourly_rate × estimated_hours_per_week × weeks_remaining)
\`\`\`

From active fixed-price contracts:
\`\`\`
committed = Σ remaining_milestones_value
\`\`\`

### Probabilistic Pipeline

Deals in the pipeline contribute weighted by stage conversion probability:

| Stage | Probability |
|-------|------------|
| Negotiating | 70% |
| Proposal Sent | 35% |
| Qualified | 15% |

### Renewal Uplift

Contracts expiring within the forecast window apply historical renewal rate (default: 60%) to extend revenue projection.

## Output

- KPI cards: Committed 30d / Expected 30d / Stretch 90d
- Waterfall chart breaking down by source (active contracts / renewals / pipeline)
- Per-contract contribution table

## Implementation Plan

1. Pull contract terms and end dates from \`fixtures/agent/contracts.json\`
2. Build forecast engine in \`viewer/lib/forecast.ts\`
3. Add \`EarningsChart\` to the dashboard home page
4. Allow configuring hourly estimates via a local \`config/estimates.json\`
`,
  },
  {
    slug: "talent-matching",
    title: "Talent Matching",
    description:
      "Match client project requirements to the best-fit freelancers in the agency roster based on skills and availability.",
    status: "idea",
    priority: "p1",
    effort: "L",
    impact: "high",
    tags: ["talent", "matching", "staffing"],
    body: `## Overview

When a new client project comes in, automatically surface the two or three best-fit freelancers from the agency's roster instead of relying on account managers' memory.

## Problem

Staffing decisions are made based on who is top-of-mind. Skilled freelancers who are available get overlooked, and the same high-profile freelancers are over-allocated.

## Matching Algorithm

### Input Signals

1. **Client requirements** — tech keywords extracted from the job post / conversation
2. **Freelancer skills** — from their Upwork profile + past contract tags
3. **Availability** — hours remaining in current contracts vs. capacity
4. **Client fit score** — past ratings from similar clients

### Scoring

\`\`\`
match_score =
  skill_overlap × 0.4 +
  availability × 0.3 +
  client_fit × 0.2 +
  recency_bonus × 0.1
\`\`\`

### Output

A ranked list of 3–5 freelancers with match score, skill overlap summary, and current workload percentage.

## Data Requirements

- Agency freelancer roster with skill tags (manual input initially)
- Active contract load per freelancer from contracts fixture
- Historical client ratings per freelancer

## Implementation Plan

1. Build \`data/roster.json\` — manual entry for agency members
2. Implement skill extractor from conversation keywords
3. Build matcher in \`viewer/lib/talent.ts\`
4. Add "Suggest staffing" button on the deal detail page

## Success Metrics

- Freelancer utilization variance decreases (more even distribution)
- Staffing decision time drops from avg 2 days to same-day
`,
  },
  {
    slug: "auto-followup",
    title: "Automated Follow-up Reminders",
    description:
      "Surface rooms and proposals that need a follow-up based on silence duration and deal stage, with suggested next actions.",
    status: "planned",
    priority: "p0",
    effort: "S",
    impact: "high",
    tags: ["automation", "reminders", "conversations"],
    body: `## Overview

Remind account managers to follow up on stalled conversations before the client goes cold, with context-aware suggestions for what to say.

## Problem

Promising leads go cold because nobody noticed the conversation hadn't moved in 5 days. There's no queue or urgency signal — it takes manual review of every room.

## Follow-up Rules

| Trigger | Condition | Suggested Action |
|---------|-----------|-----------------|
| New lead silence | Client replied, agency hasn't for >4h (business) | "Reply to keep momentum" |
| Proposal sent, no view | 48h after submission | "Resend with updated hook" |
| Proposal viewed, no reply | 72h after client viewed | "Gentle check-in" |
| Negotiating stalled | No messages for >5 business days | "Schedule a call" |
| Contract ending soon | 14 days before end date | "Discuss renewal" |

## UI

- **Follow-up queue** — dedicated sidebar section sorted by urgency score
- Each item shows: room/deal name, last activity, trigger reason, one-click suggested message draft
- Dismiss for 24h or snooze to custom date

## Implementation Plan

1. Compute staleness scores in \`viewer/lib/followup.ts\` from conversation timestamps
2. Render follow-up queue in the sidebar layout
3. Add "Draft follow-up" button that pre-fills a message template in clipboard
4. Persist dismissals in \`localStorage\` (local-only tool, no backend needed)

## Success Metrics

- Follow-up rate (% of stalled conversations actioned within 24h) improves from baseline to >85%
- Deals lost to silence reduce by 30%
`,
  },
  {
    slug: "competitor-intel",
    title: "Competitor Agency Intelligence",
    description:
      "Monitor competitor agency profiles, job post overlap, and pricing signals to inform positioning and bid strategy.",
    status: "idea",
    priority: "p2",
    effort: "XL",
    impact: "medium",
    tags: ["research", "competitive", "upwork-api"],
    body: `## Overview

Track what competing agencies on Upwork are doing — which jobs they bid on, how they position themselves, and what clients say about them — to sharpen Alpina's competitive positioning.

## Problem

Pricing and positioning decisions are made without any visibility into what competitors charge or how they win. We're effectively blind on competitive dynamics.

## Data Sources

Upwork's public data (no ToS violation):

- Agency profile pages (public) — specializations, team size, JSS, hourly rate range
- Job posts that competitors are shortlisted on (visible in some proposals contexts)
- Public reviews and client feedback on competitor profiles

## Monitoring Signals

| Signal | Insight |
|--------|---------|
| Competitor JSS trend | Rising → threat; Falling → opportunity |
| New specialization badge | They're expanding into our territory |
| Rate changes | Pricing pressure indicator |
| Client review sentiment | Weakness patterns to exploit in positioning |
| Shared job shortlists | Direct bid competition frequency |

## Ethical Constraints

- Only use public Upwork data, never scrape private content
- No automated applications or fake interactions (CLAUDE.md hard rule)
- Don't use insights to undercut below fair market rates

## Implementation Plan

1. Identify top 5–10 competitor agencies manually
2. Build a probe to fetch their public profile data via Upwork API
3. Store snapshots in \`fixtures/competitors/\`
4. Build a comparison table in the viewer

## Note

This is P2 — deferred until Phase 3 (CRM). Requires careful legal review of Upwork ToS on data usage.
`,
  },
  {
    slug: "weekly-digest",
    title: "Weekly Digest Report",
    description:
      "Auto-generate a structured weekly summary of pipeline health, earnings, response times, and top action items.",
    status: "idea",
    priority: "p1",
    effort: "M",
    impact: "medium",
    tags: ["reporting", "digest", "automation"],
    body: `## Overview

Every Monday morning, generate a one-page digest summarizing the agency's performance from the past week so leadership can start the week with full situational awareness.

## Problem

Weekly reviews currently require manual aggregation from Upwork's dashboard (which lacks agency-level views), Slack exports, and spreadsheets. This takes 1–2 hours and is often skipped.

## Digest Sections

### 1. Pipeline Summary
- New leads this week (count + value)
- Deals won / lost
- Stalled deals (>5 days no movement)

### 2. Earnings
- Billed this week vs. prior week (Δ%)
- Forecast vs. actual variance

### 3. Response Time
- Avg response time this week vs. prior week
- Any SLA breaches with room links

### 4. Top Action Items
- Auto-generated from follow-up queue (top 5 by urgency)

### 5. Team Utilization
- Freelancer load (% capacity) snapshot

## Output Formats

- **Markdown file** — \`notes/digest/YYYY-WW.md\` for Obsidian vault
- **CLI print** — \`pnpm cli digest:weekly\` prints to stdout
- **Clipboard** — ready to paste into Slack or email

## Implementation Plan

1. Build \`src/digest/weekly.ts\` — aggregates metrics from existing fixture readers
2. Add \`pnpm cli digest:weekly\` command
3. Add weekly digest viewer page at \`/digest\`
4. (Phase 3) Connect to email send via Resend or similar

## Success Metrics

- Weekly review meeting prep time drops from 1–2h to <5 minutes
- Digest usage rate ≥ 4 weeks out of every 5
`,
  },
];

export type IdeaStatuses = Record<IdeaStatus, number>;

export function ideaStatsByStatus(): IdeaStatuses {
  const counts: IdeaStatuses = { idea: 0, planned: 0, wip: 0, done: 0 };
  for (const idea of IDEAS) {
    counts[idea.status]++;
  }
  return counts;
}

export function getIdea(slug: string): Idea | undefined {
  return IDEAS.find((i) => i.slug === slug);
}

export function listIdeas(): Idea[] {
  return IDEAS;
}
