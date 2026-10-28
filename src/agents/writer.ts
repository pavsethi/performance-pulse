import { GOALS } from '../data/mock'
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


const metricsFor = (signals: Signal[]): string[] =>
  signals.flatMap((s) => s.metrics ?? [])

/** Lowercases only the first letter, so acronyms like GA and AI survive. */
const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1)

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

/** Best evidence for one goal, excluding recognition (quoted separately). */
const bestFor = (signals: Signal[], goal: Goal | undefined): Signal | undefined => {
  if (!goal) return undefined
  const mine = signals.filter((s) => s.goalIds.includes(goal.id) && s.source !== 'glint')
  const high = mine.filter((s) => s.impact === 'high')
  return leadSignal(high.length ? high : mine)
}

const byCategory = (name: string): Goal | undefined =>
  GOALS.find((g) => g.category.toLowerCase().includes(name))

/**
 * The whole review, as three paragraphs plus one evidence line — the same
 * shape the Claude writer is asked to produce.
 */
export function composeReview(
  signals: Signal[],
  insights: RambleInsight[] = [],
): string {
  const high = signals.filter((s) => s.impact === 'high')
  const kudos = signals.filter((s) => s.source === 'glint')
  const exceeded = GOALS.filter((g) => g.status === 'exceeded')
  const atRisk = GOALS.filter((g) => g.status === 'at-risk')
  const used = new Set<string>()
  const cite = <T extends Signal | undefined>(s: T): T => {
    if (s) used.add(s.id)
    return s
  }

  // --- 1. What I delivered -------------------------------------------------
  const first = cite(bestFor(signals, exceeded[0] ?? GOALS[0]))
  const second = cite(bestFor(signals, exceeded[1] ?? GOALS[1]))

  const headline = GOALS.map((g) => {
    const m = metricsFor(
      high.filter((s) => s.goalIds.includes(g.id) && s.source !== 'glint'),
    )
    return m.find((x) => x.includes('→')) ?? m.find((x) => /\d/.test(x))
  })
    .filter((m): m is string => Boolean(m))
    .filter((m, i, all) => all.indexOf(m) === i)
    .slice(0, 3)

  const p1 = [
    `Across ${signals.length} pieces of evidence from Azure DevOps, Azure Repos, Teams and Glint, ${exceeded.length} of my ${GOALS.length} goals came in ahead of target rather than merely met.`,
    first ? `${first.detail}` : '',
    second ? `${second.detail}` : '',
    headline.length
      ? `The numbers behind that: ${joinList([`**${headline[0]}**`, ...headline.slice(1)])}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  // --- 2. How I worked -----------------------------------------------------
  const people = cite(bestFor(signals, byCategory('people')))
  const influence = cite(bestFor(signals, byCategory('influence')))
  const quote = kudos.find((k) => k.impact === 'high') ?? kudos[0]
  if (quote) used.add(quote.id)

  const p2 = [
    people
      ? `The work I am least able to point at in a commit log mattered as much. ${people.detail}`
      : '',
    influence ? `Beyond my own team, ${lowerFirst(influence.detail)}` : '',
    quote ? `${quote.detail} — ${quote.from}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  // --- 3. Where I fell short, and what changes -----------------------------
  const spokenGap = insights.find((i) => i.kind === 'shortfall')
  const gapGoal = atRisk[0]

  const p3 = [
    spokenGap
      ? `In my own words: "${spokenGap.text}"`
      : gapGoal
        ? `${gapGoal.title} moved slower than I committed to. The work landed, but late in the cycle and narrower than the goal described.`
        : 'No material shortfall surfaced across the collected evidence, which is itself worth pressure-testing in the review conversation.',
    gapGoal
      ? `Next year I want to front-load ${lowerFirst(gapGoal.title)} instead of fitting it around delivery work — the pattern this year was that it got squeezed, not skipped.`
      : 'Next year I want to carry this delivery cadence into a larger architectural bet.',
    'Saying that plainly is more useful to both of us than a review that only lists wins.',
  ]
    .filter(Boolean)
    .join(' ')

  return [p1, p2, p3, `_evidence: ${[...used].join(', ')}_`].join('\n\n')
}
