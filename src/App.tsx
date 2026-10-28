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

  const goToReview = () => {
    setAutoWrite(true)
    setTab('review')
  }

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <div className="brand-mark">◆</div>
          <div>
            <h1>Performance Pulse</h1>
            <p>Your year, collected as it happens — so the review writes itself.</p>
          </div>
        </div>
        <div className="whoami">
          <strong>{REVIEWEE.name}</strong>
          {REVIEWEE.title} · {REVIEWEE.team}
          <br />
          {REVIEWEE.cycle} · Manager: {REVIEWEE.manager}
        </div>
      </header>

      <nav className="tabs" role="tablist">
        <button
          className="tab"
          role="tab"
          aria-selected={tab === 'pulse'}
          onClick={() => setTab('pulse')}
        >
          Pulse
          {harvesting && <span className="dot" />}
        </button>
        <button
          className="tab"
          role="tab"
          aria-selected={tab === 'ramble'}
          onClick={() => setTab('ramble')}
        >
          Ramble
          {spoken.length > 0 && <span className="dot" />}
        </button>
        <button
          className="tab"
          role="tab"
          aria-selected={tab === 'review'}
          onClick={() => setTab('review')}
        >
          Write the review
        </button>
      </nav>

      {tab === 'pulse' && (
        <Dashboard
          signals={allSignals}
          agentStates={agentStates}
          harvesting={harvesting}
          onResync={() => void sync()}
        />
      )}

      {tab === 'ramble' && (
        <Ramble
          transcript={transcript}
          setTranscript={setTranscript}
          onWriteReview={goToReview}
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
  )
}
