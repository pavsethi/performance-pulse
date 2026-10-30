import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { runHarvest, SUB_AGENTS } from './agents/agents'
import { mineRamble, rambleSignals } from './agents/writer'
import Dashboard from './components/Dashboard'
import type { AgentState } from './components/Dashboard'
import Ramble from './components/Ramble'
import ReviewView from './components/ReviewView'
import { REVIEWEE } from './data/mock'
import type { Signal } from './data/types'

type Tab = 'pulse' | 'ramble' | 'review'

const TABS: { id: Tab; label: string; blurb: string }[] = [
  { id: 'pulse', label: 'Your record', blurb: 'Everything collected across the year, mapped to your goals.' },
  { id: 'ramble', label: 'Talk it through', blurb: 'The only source that knows why any of it mattered.' },
  { id: 'review', label: 'Write the review', blurb: 'A draft built from the record, with every claim traceable.' },
]

const blankAgents = (): Record<string, AgentState> =>
  Object.fromEntries(
    SUB_AGENTS.map((a) => [a.id, { status: 'idle' as const, logs: [], count: 0 }]),
  )

export default function App() {
  const [tab, setTab] = useState<Tab>('pulse')
  const [harvested, setHarvested] = useState<Signal[]>([])
  const [agentStates, setAgentStates] = useState(blankAgents)
  const [harvesting, setHarvesting] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [autoWrite, setAutoWrite] = useState(false)
  const started = useRef(false)

  const sync = useCallback(async () => {
    setHarvesting(true)
    setHarvested([])
    setAgentStates(blankAgents())

    await runHarvest((e) => {
      setAgentStates((prev) => {
        const cur = prev[e.agentId]
        const next: AgentState = { ...cur }
        if (e.kind === 'start') next.status = 'running'
        if (e.kind === 'log') next.logs = [...cur.logs, e.text!]
        if (e.kind === 'done') {
          next.status = 'done'
          next.count = e.count ?? 0
        }
        return { ...prev, [e.agentId]: next }
      })
      if (e.kind === 'signal' && e.signal) {
        setHarvested((prev) =>
          prev.some((s) => s.id === e.signal!.id) ? prev : [...prev, e.signal!],
        )
      }
    })

    setHarvesting(false)
  }, [])

  useEffect(() => {
    if (started.current) return
    started.current = true
    void sync()
  }, [sync])

  const spoken = useMemo(() => rambleSignals(mineRamble(transcript)), [transcript])
  const allSignals = useMemo(() => [...harvested, ...spoken], [harvested, spoken])

  const active = TABS.find((t) => t.id === tab)!

  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-brand">
          <div className="glyph">P</div>
          <div>
            <b>Performance Pulse</b>
            <span>FY26 cycle</span>
          </div>
        </div>

        <nav className="rail-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className="nav-item"
              aria-current={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'pulse' && (
                <span className="tick">{harvesting ? 'syncing' : allSignals.length}</span>
              )}
              {t.id === 'ramble' && spoken.length > 0 && (
                <span className="tick">{spoken.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="rail-section">
          <h3>Connected sources</h3>
          {SUB_AGENTS.map((a) => {
            const st = agentStates[a.id] ?? { status: 'idle', logs: [], count: 0 }
            return (
              <div className="conn" key={a.id}>
                <div className="conn-row">
                  {st.status === 'running' && <div className="spinner" />}
                  {st.status === 'idle' && <div className="dot-idle" />}
                  {st.status === 'done' && <div className="dot-ok" />}
                  <span className="conn-name">{a.name}</span>
                  {st.status === 'done' && a.sources.length > 0 && (
                    <span className="conn-n">{st.count}</span>
                  )}
                </div>
                {st.status === 'running' && st.logs.length > 0 && (
                  <div className="conn-log">{st.logs[st.logs.length - 1]}</div>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{active.label}</h1>
            <p>{active.blurb}</p>
          </div>
          <div className="who">
            <b>{REVIEWEE.name}</b>
            {REVIEWEE.title}, {REVIEWEE.team}
            <br />
            Reviewed by {REVIEWEE.manager}
          </div>
        </header>

        <div className="content">
          {tab === 'pulse' && (
            <Dashboard
              signals={allSignals}
              harvesting={harvesting}
              onResync={() => void sync()}
            />
          )}

          {tab === 'ramble' && (
            <Ramble
              transcript={transcript}
              setTranscript={setTranscript}
              onWriteReview={() => {
                setAutoWrite(true)
                setTab('review')
              }}
            />
          )}

          {tab === 'review' && (
            <ReviewView
              signals={allSignals}
              transcript={transcript}
              autoStart={autoWrite}
              onConsumedAutoStart={() => setAutoWrite(false)}
            />
          )}
        </div>
      </main>
    </div>
  )
}
