import { useMemo, useState } from 'react'
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
  harvesting: boolean
  onResync: () => void
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const niceDate = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${MONTHS[Number(m) - 1]} ${Number(d)}`
}

const STATUS_WORD: Record<string, string> = {
  exceeded: 'Exceeded',
  'on-track': 'On track',
  'at-risk': 'Behind',
}

export default function Dashboard({ signals, harvesting, onResync }: Props) {
  const [filter, setFilter] = useState<SourceId | 'all'>('all')

  const figures = useMemo(() => {
    const prs = signals.filter((s) => s.source === 'ado-pr').length
    const kudos = signals.filter((s) => s.source === 'glint').length
    const covered = GOALS.filter((g) => signals.some((s) => s.goalIds.includes(g.id))).length
    return { total: signals.length, prs, kudos, covered }
  }, [signals])

  const entries = useMemo(() => {
    const list = filter === 'all' ? signals : signals.filter((s) => s.source === filter)
    return [...list].sort((a, b) => b.date.localeCompare(a.date))
  }, [signals, filter])

  const busiest = useMemo(
    () =>
      Math.max(
        0,
        ...GOALS.map((g) => signals.filter((s) => s.goalIds.includes(g.id)).length),
      ),
    [signals],
  )

  const visibleSources = SOURCES.filter(
    (s) => s.id !== 'ramble' || signals.some((x) => x.source === 'ramble'),
  )

  return (
    <>
      <div className="figures">
        <div className="figure">
          <div className="v">{figures.total}</div>
          <div className="k">Pieces of evidence</div>
        </div>
        <div className="figure">
          <div className="v">
            {figures.covered} of {GOALS.length}
          </div>
          <div className="k">Goals with evidence</div>
        </div>
        <div className="figure">
          <div className="v">{figures.prs}</div>
          <div className="k">Pull request milestones</div>
        </div>
        <div className="figure">
          <div className="v">{figures.kudos}</div>
          <div className="k">Times someone thanked you</div>
        </div>
      </div>

      <div className="block">
        <div className="block-head">
          <h2>Goals</h2>
          <span className="sub">From Workday, at the start of the cycle</span>
        </div>
        <div className="panel">
          {GOALS.map((g) => {
            const hits = signals.filter((s) => s.goalIds.includes(g.id))
            // Relative to the best-covered goal, so the bars actually compare.
            const pct = busiest ? Math.round((hits.length / busiest) * 100) : 0
            return (
              <div className="goal-row" key={g.id}>
                <div>
                  <div className="goal-name">{g.title}</div>
                  <div className="goal-target">{g.target}</div>
                </div>
                <div>
                  <div className="meter">
                    <i
                      style={{
                        width: `${pct}%`,
                        background: g.status === 'at-risk' ? 'var(--amber)' : undefined,
                      }}
                    />
                  </div>
                  <div className="meter-k">
                    {hits.length} {hits.length === 1 ? 'item' : 'items'} of evidence
                  </div>
                </div>
                <span className={`status ${g.status}`}>{STATUS_WORD[g.status]}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="block">
        <div className="block-head">
          <h2>Evidence</h2>
          <div className="btn-row">
            <span className="sub">{entries.length} entries</span>
            <button className="btn" onClick={onResync} disabled={harvesting}>
              {harvesting ? 'Syncing' : 'Sync again'}
            </button>
          </div>
        </div>

        <div className="filters">
          <button
            className="filter"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            Everything
          </button>
          {visibleSources.map((s) => (
            <button
              key={s.id}
              className="filter"
              aria-pressed={filter === s.id}
              onClick={() => setFilter(s.id)}
            >
              <span className="swatch" style={{ background: s.accent }} />
              {s.label}
            </button>
          ))}
        </div>

        <div className="panel">
          {entries.length === 0 && (
            <div className="panel-pad empty-note">
              {harvesting
                ? 'Collecting from your connected sources.'
                : 'Nothing matches that filter yet.'}
            </div>
          )}
          {entries.map((s) => {
            const meta = sourceMeta(s.source)
            return (
              <article className="entry" key={s.id}>
                <div className="entry-when">
                  <span className="swatch" style={{ background: meta.accent }} />
                  {niceDate(s.date)}
                </div>
                <div>
                  <h3 className="entry-title">{s.title}</h3>
                  <p className="entry-body">{s.detail}</p>
                  <div className="entry-foot">
                    <span className="src">{s.from ?? meta.system}</span>
                    {s.goalIds.map((g) => (
                      <span className="goal-ref" key={g}>
                        {g}
                      </span>
                    ))}
                    {(s.metrics ?? []).map((m) => (
                      <span className="figure-chip" key={m}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </>
  )
}
