import { GOALS, REVIEWEE } from '../data/mock'
import type { Goal, Signal } from '../data/types'

/** Keywords the ramble miner uses to attach spoken evidence to a goal. */
const GOAL_KEYWORDS: Record<string, string[]> = {
  G1: ['ingestion', 'ingest', 'v2', 'ga', 'cutover', 'launch', 'shipped', 'ship', 'pipeline', 'preview', 'downtime', 'early'],
  G2: ['latency', 'p95', 'performance', 'cache', 'fast', 'millisecond', 'query', 'speed', 'slow', 'second'],
  G3: ['mentor', 'priya', 'josh', 'on-call', 'oncall', 'pages', 'paging', 'review', 'coach', 'team', 'burning', 'burnout', 'people'],
  G4: ['partner', 'adoption', 'schema', 'standard', 'migrate', 'migration', 'org', 'cross-org'],
  G5: ['ai', 'llm', 'model', 'anomaly', 'ml', 'detection', 'eval', 'machine learning'],
}

const SHORTFALL_HINTS = [
  'came up short',
  'fell short',
  'wanted to',
  "didn't",
  'did not',
  'kept pushing',
  'too late',
  'was late',
  'next year',
  'wish',
  'could have',
  'should have',
  'struggled',
  'narrower',
]

export interface RambleInsight {
  text: string
  goalIds: string[]
  kind: 'accomplishment' | 'shortfall'
}

const sentences = (text: string): string[] =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25)

/** Pulls structured insights out of a spoken, unstructured ramble. */
export function mineRamble(transcript: string): RambleInsight[] {
  return sentences(transcript).map((text) => {
    const lower = text.toLowerCase()
    const goalIds = Object.entries(GOAL_KEYWORDS)
      .filter(([, words]) => words.some((w) => lower.includes(w)))
      .map(([id]) => id)
    const kind: RambleInsight['kind'] = SHORTFALL_HINTS.some((h) =>
      lower.includes(h),
    )
      ? 'shortfall'
      : 'accomplishment'
    return { text, goalIds, kind }
  })
}

/** Turns mined ramble insights into first-class Signals on the timeline. */
export function rambleSignals(insights: RambleInsight[]): Signal[] {
  return insights
    .filter((i) => i.goalIds.length > 0)
    .map((insight, i) => ({
      id: `r${i}`,
      source: 'ramble' as const,
      title: insight.kind === 'shortfall' ? 'Self-identified gap' : 'Said out loud',
      detail: insight.text,
      date: new Date().toISOString().slice(0, 10),
      impact: insight.kind === 'shortfall' ? ('low' as const) : ('medium' as const),
      tags: [insight.kind === 'shortfall' ? 'growth' : 'self-reported'],
      goalIds: insight.goalIds,
    }))
}

export interface ReviewSection {
  heading: string
  body: string
  /** Signal ids the paragraph was built from. */
  evidence: string[]
}

const metricsFor = (signals: Signal[]): string[] =>
  signals.flatMap((s) => s.metrics ?? [])

const joinList = (items: string[]): string =>
  items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

/**
 * Picks the signal that best represents a goal: most quantified, not shared
 * with another goal, and latest in the year when those tie.
 */
const leadSignal = (candidates: Signal[]): Signal | undefined =>
  [...candidates].sort((a, b) => {
    const score = (s: Signal) =>
      (s.metrics?.length ?? 0) * 2 + (s.goalIds.length === 1 ? 1 : 0)
    return score(b) - score(a) || b.date.localeCompare(a.date)
  })[0]

function goalSection(goal: Goal, signals: Signal[], insights: RambleInsight[]): ReviewSection {
  const mine = signals.filter((s) => s.goalIds.includes(goal.id))
  const high = mine.filter((s) => s.impact === 'high')
  const kudos = mine.filter((s) => s.source === 'glint')
  // The longest spoken line about this goal carries the most context.
  const spoken = insights
    .filter((i) => i.goalIds.includes(goal.id) && i.kind === 'accomplishment')
    .sort((a, b) => b.text.length - a.text.length)[0]

  const lead = leadSignal(high.filter((s) => s.source !== 'glint')) ?? high[0] ?? mine[0]
  // The lead's own numbers come first, then the rest of the goal's evidence.
  const pool = high.length ? high : mine
  const metrics = metricsFor([
    ...(lead ? [lead] : []),
    ...pool.filter((s) => s !== lead),
  ]).slice(0, 3)
  const parts: string[] = []

  if (lead) {
    parts.push(
      `**${goal.title}** — target was ${goal.target.toLowerCase()}. ${lead.detail}`,
    )
  } else {
    parts.push(
      `**${goal.title}** — target was ${goal.target.toLowerCase()}. Evidence for this goal is thin in the systems of record; worth talking through in the review conversation.`,
    )
  }

  if (metrics.length) {
    parts.push(`The numbers: ${joinList(metrics)}.`)
  }

  if (mine.length > 1) {
    const prs = mine.filter((s) => s.source === 'ado-pr').length
    const items = mine.filter((s) => s.source === 'ado-pbi').length
    const chatter = mine.filter((s) => s.source === 'teams').length
    const bits = [
      prs ? `${prs} pull request${prs > 1 ? 's' : ''}` : '',
      items ? `${items} work item${items > 1 ? 's' : ''}` : '',
      chatter ? `${chatter} working conversation${chatter > 1 ? 's' : ''}` : '',
    ].filter(Boolean)
    if (bits.length) {
      parts.push(`Backed by ${joinList(bits)} across the year.`)
    }
  }

  if (kudos.length) {
    parts.push(`Peer signal: ${kudos[0].detail} — ${kudos[0].from}`)
  }

  if (spoken) {
    parts.push(`In my own words: "${spoken.text}"`)
  }

  return {
    heading: `${goal.id} · ${goal.title}`,
    body: parts.join('\n\n'),
    evidence: mine.map((s) => s.id),
  }
}

export function composeReview(
  signals: Signal[],
  insights: RambleInsight[] = [],
): ReviewSection[] {
  const high = signals.filter((s) => s.impact === 'high')
  const kudos = signals.filter((s) => s.source === 'glint')
  const exceeded = GOALS.filter((g) => g.status === 'exceeded')
  const atRisk = GOALS.filter((g) => g.status === 'at-risk')

  // Headline = one before/after metric per goal, strongest first.
  const headline = GOALS.map((g) => {
    const metrics = metricsFor(
      high.filter((s) => s.goalIds.includes(g.id) && s.source !== 'glint'),
    )
    return metrics.find((m) => m.includes('→')) ?? metrics.find((m) => /\d/.test(m))
  })
    .filter((m): m is string => Boolean(m))
    .filter((m, i, all) => all.indexOf(m) === i)
    .slice(0, 3)

  const shortfalls = insights.filter((i) => i.kind === 'shortfall')

  const sections: ReviewSection[] = []

  sections.push({
    heading: 'Summary',
    body: [
      `${REVIEWEE.name}, ${REVIEWEE.title}, ${REVIEWEE.team} — ${REVIEWEE.cycle}.`,
      `This year is best read as one sustained delivery arc plus a quieter, equally real investment in the people around the work. Across ${signals.length} pieces of evidence drawn from Azure DevOps, Azure Repos, Teams and Viva Glint, ${high.length} represent high-impact outcomes, and ${exceeded.length} of ${GOALS.length} committed goals were exceeded rather than merely met.`,
      `The headline numbers: ${
        headline.length ? joinList(headline) : 'shipped the flagship platform work of the year'
      } — alongside ${kudos.length} unsolicited recognitions from peers and partner teams.`,
    ].join('\n\n'),
    evidence: high.slice(0, 4).map((s) => s.id),
  })

  for (const goal of GOALS) {
    sections.push(goalSection(goal, signals, insights))
  }

  sections.push({
    heading: 'Where I fell short',
    body: [
      shortfalls.length
        ? shortfalls.map((s) => `"${s.text}"`).join('\n\n')
        : atRisk.length
          ? `${atRisk[0].title} moved slower than committed. The work landed, but late in the cycle and narrower in scope than the goal described.`
          : 'No material shortfalls surfaced across the collected evidence.',
      'Stated plainly rather than softened, because a review that only lists wins is not useful to anyone reading it.',
    ].join('\n\n'),
    evidence: [],
  })

  sections.push({
    heading: 'Looking ahead',
    body: [
      atRisk.length
        ? `Front-load ${atRisk[0].title.toLowerCase()} rather than fitting it around delivery work — the pattern this year was that it got squeezed, not skipped.`
        : 'Carry the delivery cadence forward and pick up a larger architectural bet.',
      'Keep the mentorship load where it is; it produced the clearest second-order results of the year.',
    ].join('\n\n'),
    evidence: [],
  })

  return sections
}

/**
 * Flattens to the same markdown shape the Claude writer emits, so both paths
 * render and copy identically.
 */
export function reviewToMarkdown(sections: ReviewSection[]): string {
  return sections
    .map((s) =>
      [
        `## ${s.heading}`,
        '',
        s.body,
        ...(s.evidence.length ? ['', `_evidence: ${s.evidence.join(', ')}_`] : []),
      ].join('\n'),
    )
    .join('\n\n')
}
