import { SIGNALS } from '../data/mock'
import type { Signal, SourceId } from '../data/types'

export interface SubAgent {
  id: string
  name: string
  role: string
  /** Which connectors this agent owns. */
  sources: SourceId[]
  /** What it says while it works. */
  steps: string[]
}

/**
 * The sub-agents the orchestrator fans out to. Each one owns a single
 * system of record and returns normalized Signals.
 */
export const SUB_AGENTS: SubAgent[] = [
  {
    id: 'ado-scout',
    name: 'ADO Scout',
    role: 'Reads work items, epics and sprint history',
    sources: ['ado-pbi'],
    steps: [
      'Authenticating to dev.azure.com/contoso-telemetry',
      'Querying work items assigned or closed by @pav',
      'Filtering to the FY26 review window',
      'Normalizing acceptance criteria into outcomes',
    ],
  },
  {
    id: 'code-historian',
    name: 'Code Historian',
    role: 'Mines pull requests, reviews and commit history',
    sources: ['ado-pr', 'commit'],
    steps: [
      'Scanning 7 repositories for authored commits',
      'Collecting pull requests authored and reviewed',
      'Measuring review latency and blast radius',
      'Clustering commits into shipped units of work',
    ],
  },
  {
    id: 'signal-listener',
    name: 'Signal Listener',
    role: 'Surfaces impact buried in Teams conversations',
    sources: ['teams'],
    steps: [
      'Indexing channels and DMs via Microsoft Graph',
      'Detecting incident threads and design reviews',
      'Extracting commitments made and kept',
      'Redacting anything not about you',
    ],
  },
  {
    id: 'kudos-collector',
    name: 'Kudos Collector',
    role: 'Gathers Glint recognition and peer praise',
    sources: ['glint'],
    steps: [
      'Pulling Viva Glint recognition feed',
      'Attributing kudos to the work that earned them',
      'Keeping quotable language verbatim',
    ],
  },
  {
    id: 'goal-tracker',
    name: 'Goal Tracker',
    role: 'Holds the Workday goals and maps evidence to them',
    sources: [],
    steps: [
      'Fetching FY26 goals from Workday',
      'Scoring each goal against collected evidence',
      'Flagging goals with thin coverage',
    ],
  },
]

export type AgentEventKind = 'start' | 'log' | 'signal' | 'done'

export interface AgentEvent {
  agentId: string
  kind: AgentEventKind
  text?: string
  signal?: Signal
  count?: number
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Simulated fan-out. In production each sub-agent would hit its own API;
 * here they replay fixtures on a timer so the demo is deterministic.
 */
export async function runHarvest(
  onEvent: (e: AgentEvent) => void,
  speed = 1,
): Promise<Signal[]> {
  const collected: Signal[] = []

  for (const agent of SUB_AGENTS) {
    onEvent({ agentId: agent.id, kind: 'start' })
    await wait(180 / speed)

    for (const step of agent.steps) {
      onEvent({ agentId: agent.id, kind: 'log', text: step })
      await wait(190 / speed)
    }

    const mine = SIGNALS.filter((s) => agent.sources.includes(s.source)).sort(
      (a, b) => a.date.localeCompare(b.date),
    )

    for (const signal of mine) {
      collected.push(signal)
      onEvent({ agentId: agent.id, kind: 'signal', signal })
      await wait(90 / speed)
    }

    onEvent({ agentId: agent.id, kind: 'done', count: mine.length })
    await wait(140 / speed)
  }

  return collected
}
