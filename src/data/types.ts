export type SourceId =
  | 'ado-pbi'
  | 'ado-pr'
  | 'commit'
  | 'teams'
  | 'glint'
  | 'ramble'

export type Impact = 'high' | 'medium' | 'low'

/** One atomic piece of evidence about what you did this year. */
export interface Signal {
  id: string
  source: SourceId
  /** Short headline, as the agent would log it. */
  title: string
  /** The raw-ish payload the connector returned. */
  detail: string
  /** ISO date. */
  date: string
  impact: Impact
  /** Competency tags used by the narrative writer. */
  tags: string[]
  /** Workday goal ids this evidence rolls up to. */
  goalIds: string[]
  /** Quantified outcomes the writer can quote verbatim. */
  metrics?: string[]
  /** Who said it — for Teams / Glint signals. */
  from?: string
}

export type GoalStatus = 'on-track' | 'at-risk' | 'exceeded'

/** A Workday goal for the current review cycle. */
export interface Goal {
  id: string
  title: string
  category: string
  description: string
  target: string
  status: GoalStatus
}

export interface SourceMeta {
  id: SourceId
  label: string
  system: string
  icon: string
  accent: string
}

export const SOURCES: SourceMeta[] = [
  { id: 'ado-pbi', label: 'Work items', system: 'Azure DevOps', icon: '◆', accent: '#3b6fb6' },
  { id: 'ado-pr', label: 'Pull requests', system: 'Azure DevOps', icon: '⑂', accent: '#6d4aa8' },
  { id: 'commit', label: 'Commits', system: 'Azure Repos', icon: '●', accent: '#1f5f5b' },
  { id: 'teams', label: 'Conversations', system: 'Microsoft Teams', icon: '◇', accent: '#b4762a' },
  { id: 'glint', label: 'Recognition', system: 'Viva Glint', icon: '★', accent: '#a3384f' },
  { id: 'ramble', label: 'Your own words', system: 'Pulse recorder', icon: '◉', accent: '#2f7d4f' },
]

export const sourceMeta = (id: SourceId): SourceMeta =>
  SOURCES.find((s) => s.id === id) ?? SOURCES[0]
