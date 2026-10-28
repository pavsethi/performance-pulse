import { useMemo, useState } from 'react'
import { SUB_AGENTS } from '../agents/agents'
import { GOALS } from '../data/mock'
import { SOURCES, sourceMeta } from '../data/types'
import type { Signal, SourceId } from '../data/types'

export interface AgentState {
  status: 'idle' | 'running' | 'done'
  logs: string[]
  count: number
}

interface Props {
  signals: Signal[]
  agentStates: Record<string, AgentState>
  harvesting: boolean
  onResync: () => void
}

export default function Dashboard({ signals, agentStates, harvesting, onResync }: Props) {
  const [filter, setFilter] = useState<SourceId | 'all'>('all')

  const stats = useMemo(() => {
    const prs = signals.filter((s) => s.source === 'ado-pr').length
    const kudos = signals.filter((s) => s.source === 'glint').length
    const covered = GOALS.filter((g) =>
      signals.some((s) => s.goalIds.includes(g.id)),
    ).length
    return { total: signals.length, prs, kudos, covered }
  }, [signals])

  const feed = useMemo(() => {
    const list = filter === 'all' ? signals : signals.filter((s) => s.source === filter)
    return [...list].sort((a, b) => b.date.localeCompare(a.date))
  }, [signals, filter])

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="n">{stats.total}</div>
          <div className="l">Signals captured</div>
        </div>
        <div className="stat">
          <div className="n">
            {stats.covered}/{GOALS.length}
          </div>
          <div className="l">Goals with evidence</div>
        </div>
        <div className="stat">
          <div className="n">{stats.prs}</div>
          <div className="l">PR milestones</div>
        </div>
        <div className="stat">
          <div className="n">{stats.kudos}</div>
          <div className="l">Recognitions</div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="card-head">
            <h2>Evidence timeline</h2>
            <span>{feed.length} items · FY26</span>
          </div>

          <div className="filters">
            <button
              className="chip"
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All sources
            </button>
            {SOURCES.filter(
              (s) => s.id !== 'ramble' || signals.some((x) => x.source === 'ramble'),
            ).map((s) => (
              <button
                key={s.id}
                className="chip"
                aria-pressed={filter === s.id}
                onClick={() => setFilter(s.id)}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          <div className="feed">
            {feed.length === 0 && (
              <p style={{ color: 'var(--dim)', fontSize: 13 }}>
                Nothing here yet — the sub-agents are still working.
              </p>
            )}
            {feed.map((s) => {
              const meta = sourceMeta(s.source)
              return (
                <div className="sig" key={s.id}>
                  <div
                    className="sig-icon"
                    style={{ color: meta.accent, borderColor: `${meta.accent}44` }}
                  >
                    {meta.icon}
                  </div>
                  <div>
                    <div className="sig-title">{s.title}</div>
                    <div className="sig-detail">{s.detail}</div>
                    <div className="sig-meta">
                      <span>{s.date}</span>
                      <span>·</span>
                      <span>{meta.system}</span>
                      {s.goalIds.map((g) => (
                        <span className="tag" key={g}>
                          {g}
                        </span>
                      ))}
                      {(s.metrics ?? []).map((m) => (
                        <span className="metric" key={m}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-head">
              <h2>Sub-agents</h2>
              <button className="btn" onClick={onResync} disabled={harvesting}>
                {harvesting ? 'Syncing…' : 'Re-sync'}
              </button>
            </div>
            <div className="agents">
              {SUB_AGENTS.map((a) => {
                const st = agentStates[a.id] ?? { status: 'idle', logs: [], count: 0 }
                return (
                  <div className={`agent ${st.status}`} key={a.id}>
                    <div className="agent-top">
                      {st.status === 'running' && <div className="spinner" />}
                      {st.status === 'idle' && <div className="idle-dot" />}
                      {st.status === 'done' && <span className="check">✓</span>}
                      <div>
                        <div className="agent-name">{a.name}</div>
                        <div className="agent-role">{a.role}</div>
                      </div>
                      {st.status === 'done' && a.sources.length > 0 && (
                        <div className="agent-count">+{st.count}</div>
                      )}
                    </div>
                    {st.logs.length > 0 && st.status !== 'done' && (
                      <div className="agent-log">
                        {st.logs.slice(-3).map((l, i) => (
                          <div key={i}>› {l}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Workday goals</h2>
              <span>FY26</span>
            </div>
            {GOALS.map((g) => {
              const hits = signals.filter((s) => s.goalIds.includes(g.id))
              const pct = Math.min(100, Math.round((hits.length / 5) * 100))
              return (
                <div className="goal" key={g.id}>
                  <div className="goal-top">
                    <span className="goal-id">{g.id}</span>
                    <span className="goal-title">{g.title}</span>
                    <span className={`pill ${g.status}`}>{g.status.replace('-', ' ')}</span>
                  </div>
                  <div className="goal-desc">{g.target}</div>
                  <div className="bar">
                    <i style={{ width: `${pct}%` }} />
                  </div>
                  <div className="bar-label">
                    <span>{g.category}</span>
                    <span>
                      {hits.length} piece{hits.length === 1 ? '' : 's'} of evidence
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
