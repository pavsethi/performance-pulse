import type { Goal, Signal } from './types'

export const REVIEWEE = {
  name: 'Pav Sethi',
  title: 'Senior Software Engineer',
  team: 'Telemetry Platform',
  manager: 'Dana Whitfield',
  cycle: 'FY26 Year-End Review',
}

/** Pulled from Workday at the start of the cycle. */
export const GOALS: Goal[] = [
  {
    id: 'G1',
    title: 'Ship Pulse Ingestion v2 to GA',
    category: 'Delivery',
    description:
      'Lead the rewrite of the ingestion pipeline and take it from private preview to general availability.',
    target: 'GA by end of Q3 with < 0.1% event loss',
    status: 'exceeded',
  },
  {
    id: 'G2',
    title: 'Cut platform p95 latency by 30%',
    category: 'Technical Excellence',
    description:
      'Drive end-to-end latency work across the query path so dashboards feel instant.',
    target: 'p95 from 1,800ms to under 1,260ms',
    status: 'exceeded',
  },
  {
    id: 'G3',
    title: 'Grow team capability through mentorship',
    category: 'People & Culture',
    description:
      'Mentor two engineers, raise the bar on code review, and make on-call sustainable.',
    target: '2 mentees ramped; on-call pages down 40%',
    status: 'on-track',
  },
  {
    id: 'G4',
    title: 'Drive cross-org adoption of telemetry standards',
    category: 'Influence',
    description:
      'Get partner teams onto the shared schema instead of bespoke pipelines.',
    target: '5 partner teams migrated',
    status: 'on-track',
  },
  {
    id: 'G5',
    title: 'Build depth in applied AI',
    category: 'Growth',
    description:
      'Move from consumer to contributor on AI tooling used by the org.',
    target: 'Ship one AI-backed feature to production',
    status: 'at-risk',
  },
]

/**
 * What the connectors "returned". In the real system these arrive from
 * Azure DevOps, Azure Repos, Microsoft Graph and Viva Glint. Here they are
 * fixtures so the demo runs with no network and no credentials.
 */
export const SIGNALS: Signal[] = [
  // ---------- Q1 ----------
  {
    id: 's01',
    source: 'ado-pbi',
    title: 'PBI 48217 — Ingestion v2 architecture spike',
    detail:
      'Closed a 3-week spike comparing Kafka-compatible vs. Event Hubs capture. Wrote the decision record the team still points at.',
    date: '2026-01-23',
    impact: 'high',
    tags: ['architecture', 'ownership'],
    goalIds: ['G1'],
    metrics: ['3 designs evaluated', 'ADR-0042 adopted by 4 teams'],
  },
  {
    id: 's02',
    source: 'commit',
    title: '41 commits to pulse-ingest/core',
    detail:
      'Stood up the new partitioned writer and the replay harness behind a feature flag.',
    date: '2026-02-04',
    impact: 'medium',
    tags: ['delivery'],
    goalIds: ['G1'],
    metrics: ['41 commits', '6,200 lines net'],
  },
  {
    id: 's03',
    source: 'ado-pr',
    title: 'PR 9931 — Backpressure-aware batch writer',
    detail:
      'Reviewed by 5 engineers across 2 teams. Shipped the change that stopped the nightly ingest stalls.',
    date: '2026-02-17',
    impact: 'high',
    tags: ['reliability', 'delivery'],
    goalIds: ['G1', 'G2'],
    metrics: ['Nightly stalls: 11/month → 0'],
  },
  {
    id: 's04',
    source: 'teams',
    title: 'Incident command during the Feb 22 ingest outage',
    detail:
      'Took IC for a Sev2, drove mitigation in 38 minutes and wrote the postmortem the same night.',
    date: '2026-02-22',
    impact: 'high',
    tags: ['reliability', 'leadership'],
    goalIds: ['G1', 'G3'],
    metrics: ['TTM 38 min', '0 customer-reported data loss'],
    from: '#telemetry-incidents',
  },
  {
    id: 's05',
    source: 'glint',
    title: 'Recognition from Dana Whitfield',
    detail:
      '"Pav ran the Sev2 like someone twice their tenure. Calm, clear comms, and the postmortem actually changed how we page."',
    date: '2026-02-24',
    impact: 'high',
    tags: ['leadership', 'recognition'],
    goalIds: ['G3'],
    from: 'Dana Whitfield (Manager)',
  },
  {
    id: 's06',
    source: 'ado-pbi',
    title: 'PBI 48902 — Query path profiling',
    detail:
      'Instrumented the read path end to end and found that 62% of p95 was spent in schema resolution.',
    date: '2026-03-11',
    impact: 'medium',
    tags: ['performance', 'analysis'],
    goalIds: ['G2'],
    metrics: ['62% of p95 isolated to one layer'],
  },

  // ---------- Q2 ----------
  {
    id: 's07',
    source: 'ado-pr',
    title: 'PR 10244 — Schema resolution cache',
    detail:
      'The single biggest latency win of the year. Cached resolved schemas with an invalidation hook on writer commit.',
    date: '2026-04-02',
    impact: 'high',
    tags: ['performance', 'architecture'],
    goalIds: ['G2'],
    metrics: ['p95 1,800ms → 1,105ms', '38% reduction'],
  },
  {
    id: 's08',
    source: 'teams',
    title: 'Design review with the Fabric ingestion team',
    detail:
      'Walked three partner teams through the shared schema and converted the "we\'ll build our own" position.',
    date: '2026-04-15',
    impact: 'high',
    tags: ['influence', 'communication'],
    goalIds: ['G4'],
    metrics: ['3 teams committed to migrate'],
    from: '#telemetry-standards',
  },
  {
    id: 's09',
    source: 'commit',
    title: '63 commits across 4 repos',
    detail:
      'Migration shims so partner teams could move to the shared schema without a rewrite.',
    date: '2026-04-28',
    impact: 'medium',
    tags: ['influence', 'delivery'],
    goalIds: ['G4'],
    metrics: ['63 commits', '4 repos'],
  },
  {
    id: 's10',
    source: 'glint',
    title: 'Recognition from Marcus Oyelaran',
    detail:
      '"The migration shim saved my team an entire sprint. Pav wrote it on their own initiative after one hallway conversation."',
    date: '2026-05-06',
    impact: 'medium',
    tags: ['influence', 'recognition'],
    goalIds: ['G4'],
    from: 'Marcus Oyelaran (Principal PM, Fabric)',
  },
  {
    id: 's11',
    source: 'ado-pbi',
    title: 'PBI 50118 — Ingestion v2 private preview',
    detail:
      'Shipped preview to 12 internal tenants, ran the feedback loop, closed 23 bugs in 5 weeks.',
    date: '2026-05-19',
    impact: 'high',
    tags: ['delivery', 'ownership'],
    goalIds: ['G1'],
    metrics: ['12 preview tenants', '23 bugs closed'],
  },
  {
    id: 's12',
    source: 'teams',
    title: 'Weekly mentoring with Priya Raman',
    detail:
      'Ran a standing 1:1 through the year. Priya went from supervised PRs to owning the retention service.',
    date: '2026-05-22',
    impact: 'high',
    tags: ['mentorship', 'leadership'],
    goalIds: ['G3'],
    metrics: ['1 mentee promoted to owning a service'],
    from: 'DM — Priya Raman',
  },
  {
    id: 's13',
    source: 'ado-pr',
    title: '87 pull requests reviewed',
    detail:
      'Median first-response time of 3.4 hours across the team, with review comments that people quote back.',
    date: '2026-06-01',
    impact: 'medium',
    tags: ['mentorship', 'craft'],
    goalIds: ['G3'],
    metrics: ['87 PRs reviewed', '3.4h median response'],
  },
  {
    id: 's14',
    source: 'commit',
    title: 'On-call tooling: auto-triage bot',
    detail:
      'Weekend project that routes pages by error signature. Cut noisy pages hard.',
    date: '2026-06-14',
    impact: 'high',
    tags: ['reliability', 'initiative'],
    goalIds: ['G3'],
    metrics: ['Pages/week 31 → 17', '45% reduction'],
  },

  // ---------- Q3 ----------
  {
    id: 's15',
    source: 'ado-pbi',
    title: 'PBI 51440 — Ingestion v2 GA readiness',
    detail:
      'Owned the GA checklist: SLOs, runbooks, load tests at 3x projected peak, and the rollback plan.',
    date: '2026-07-09',
    impact: 'high',
    tags: ['delivery', 'ownership', 'reliability'],
    goalIds: ['G1'],
    metrics: ['Load tested to 3x peak', '0 rollbacks needed'],
  },
  {
    id: 's16',
    source: 'ado-pr',
    title: 'PR 11802 — Zero-downtime cutover',
    detail:
      'Dual-write plus shadow-read cutover. Customers never knew it happened.',
    date: '2026-07-24',
    impact: 'high',
    tags: ['delivery', 'reliability'],
    goalIds: ['G1'],
    metrics: ['0 minutes downtime', '0.02% event loss vs 0.1% target'],
  },
  {
    id: 's17',
    source: 'teams',
    title: 'GA announcement to the org',
    detail:
      'Ingestion v2 declared GA two weeks ahead of the committed date.',
    date: '2026-08-01',
    impact: 'high',
    tags: ['delivery', 'communication'],
    goalIds: ['G1'],
    metrics: ['GA 2 weeks early'],
    from: '#telemetry-announcements',
  },
  {
    id: 's18',
    source: 'glint',
    title: 'Recognition from the Observability team',
    detail:
      '"v2 GA landed so quietly that half the org missed it. That is the highest compliment you can pay an infrastructure launch."',
    date: '2026-08-04',
    impact: 'high',
    tags: ['delivery', 'recognition'],
    goalIds: ['G1'],
    from: 'Observability Team (group kudos)',
  },
  {
    id: 's19',
    source: 'commit',
    title: 'Query planner rewrite — 38 commits',
    detail:
      'Second latency push: predicate pushdown and parallel shard fan-out.',
    date: '2026-08-21',
    impact: 'high',
    tags: ['performance'],
    goalIds: ['G2'],
    metrics: ['p95 1,105ms → 870ms', '52% cumulative reduction'],
  },
  {
    id: 's20',
    source: 'teams',
    title: 'Mentoring Josh Kim through his first design doc',
    detail:
      'Four review passes, no rewrites by me. He presented it himself and it was approved.',
    date: '2026-09-03',
    impact: 'medium',
    tags: ['mentorship'],
    goalIds: ['G3'],
    metrics: ['2nd mentee ramped'],
    from: 'DM — Josh Kim',
  },
  {
    id: 's21',
    source: 'ado-pbi',
    title: 'PBI 52901 — Partner migration wave 2',
    detail:
      'Drove two more teams onto the shared schema, bringing the total to five.',
    date: '2026-09-17',
    impact: 'medium',
    tags: ['influence'],
    goalIds: ['G4'],
    metrics: ['5 of 5 target teams migrated'],
  },

  // ---------- Q4 ----------
  {
    id: 's22',
    source: 'ado-pr',
    title: 'PR 13066 — Anomaly detection on ingest rates',
    detail:
      'First AI-backed feature in the platform: flags ingest anomalies before the SLO burn alert fires.',
    date: '2026-10-06',
    impact: 'high',
    tags: ['ai', 'initiative', 'reliability'],
    goalIds: ['G5', 'G2'],
    metrics: ['Catches 71% of incidents pre-alert', 'Shipped to production'],
  },
  {
    id: 's23',
    source: 'teams',
    title: 'Brown-bag: "Shipping with LLMs without shipping nonsense"',
    detail:
      'Ran an internal session on eval harnesses. 60+ attendees, deck reused by two other orgs.',
    date: '2026-10-14',
    impact: 'medium',
    tags: ['ai', 'influence', 'communication'],
    goalIds: ['G5', 'G4'],
    metrics: ['60+ attendees', 'Deck reused by 2 orgs'],
    from: '#eng-learning',
  },
  {
    id: 's24',
    source: 'glint',
    title: 'Recognition from Priya Raman',
    detail:
      '"A year ago I needed my PRs walked through line by line. I own a service now. That is on Pav."',
    date: '2026-10-20',
    impact: 'high',
    tags: ['mentorship', 'recognition'],
    goalIds: ['G3'],
    from: 'Priya Raman (Software Engineer II)',
  },
]

/** A pre-recorded ramble so the demo works even without a microphone. */
export const SAMPLE_RAMBLE = `Okay so this year. The big one was Ingestion v2 — I basically owned that from the architecture spike in January all the way to GA in August, and we landed it two weeks early with zero downtime on the cutover. The thing I'm actually proudest of is the cutover, because nobody noticed it happened.

Latency was the other big push. We were at 1.8 seconds p95 and it's down around 870 milliseconds now, so better than half. The schema cache was the big unlock there.

I spent a lot of time on people stuff this year too, which I don't always write down. Priya went from needing hand-holding on PRs to owning the retention service outright, and Josh wrote and defended his first design doc. I also built the auto-triage bot on a weekend because on-call was genuinely burning people out, and pages are down like 45%.

Where I came up short — I wanted to go deeper on the AI side earlier in the year and I kept pushing it. The anomaly detection work shipped in October, so it happened, but it was late and it's narrower than what I'd planned. Next year I want that to be the thing I start with instead of the thing I squeeze in.`
