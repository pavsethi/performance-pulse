import { useEffect, useMemo, useRef, useState } from 'react'
import { composeReview, mineRamble, reviewToMarkdown } from '../agents/writer'
import type { ReviewSection } from '../agents/writer'
import type { Signal } from '../data/types'
import { REVIEWEE } from '../data/mock'

interface Props {
  signals: Signal[]
  transcript: string
  autoStart: boolean
  onConsumedAutoStart: () => void
}

/** Minimal inline markdown: **bold** only, which is all the writer emits. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

const STAGES = [
  'Goal Tracker → loading FY26 goals from Workday',
  'Narrative Writer → clustering evidence by goal',
  'Narrative Writer → ranking outcomes by impact',
  'Narrative Writer → folding in your spoken transcript',
  'Narrative Writer → drafting in your voice, not a template',
]

export default function ReviewView({
  signals,
  transcript,
  autoStart,
  onConsumedAutoStart,
}: Props) {
  const [sections, setSections] = useState<ReviewSection[] | null>(null)
  const [revealed, setRevealed] = useState(0)
  const [stage, setStage] = useState(-1)
  const [copied, setCopied] = useState(false)
  const timers = useRef<number[]>([])

  const insights = useMemo(() => mineRamble(transcript), [transcript])

  const total = useMemo(
    () => (sections ? sections.reduce((n, s) => n + s.heading.length + s.body.length, 0) : 0),
    [sections],
  )

  const generate = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setSections(null)
    setRevealed(0)
    setStage(0)

    STAGES.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => setStage(i), i * 420),
      )
    })
    timers.current.push(
      window.setTimeout(() => {
        setSections(composeReview(signals, insights))
        setStage(-1)
      }, STAGES.length * 420),
    )
  }

  useEffect(() => {
    if (autoStart) {
      onConsumedAutoStart()
      generate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Typewriter reveal.
  useEffect(() => {
    if (!sections || revealed >= total) return
    const id = window.setTimeout(() => setRevealed((r) => Math.min(total, r + 14)), 12)
    return () => clearTimeout(id)
  }, [sections, revealed, total])

  const copy = async () => {
    if (!sections) return
    await navigator.clipboard.writeText(reviewToMarkdown(sections))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  if (!sections) {
    return (
      <div className="card">
        <div className="empty">
          <h2>Your review is already written. You just have to ask.</h2>
          <p>
            {signals.length} pieces of evidence collected across Azure DevOps, Azure
            Repos, Teams and Glint
            {insights.length > 0 ? `, plus ${insights.length} statements from your own recording` : ''}
            . The narrative writer maps every claim back to a Workday goal.
          </p>
          <button className="btn primary" onClick={generate} disabled={stage >= 0}>
            {stage >= 0 ? 'Writing…' : 'Write my performance review'}
          </button>
          {stage >= 0 && (
            <div className="agent-log" style={{ marginTop: 22, maxHeight: 'none' }}>
              {STAGES.slice(0, stage + 1).map((s, i) => (
                <div key={i}>
                  {i < stage ? '✓' : '›'} {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  let cursor = 0
  const streaming = revealed < total

  return (
    <div className="card">
      <div className="card-head">
        <h2>
          {REVIEWEE.cycle} — draft {streaming ? '(writing…)' : '(ready)'}
        </h2>
        <div className="btn-row">
          <button className="btn" onClick={copy} disabled={streaming}>
            {copied ? 'Copied ✓' : 'Copy markdown'}
          </button>
          <button className="btn" onClick={generate}>
            Regenerate
          </button>
        </div>
      </div>

      <div className="review">
        {sections.map((s) => {
          const headStart = cursor
          cursor += s.heading.length
          const bodyStart = cursor
          cursor += s.body.length

          if (revealed <= headStart) return null
          const head = s.heading.slice(0, Math.max(0, revealed - headStart))
          const body = s.body.slice(0, Math.max(0, revealed - bodyStart))

          return (
            <section key={s.heading}>
              <h3>{head}</h3>
              {body
                .split('\n\n')
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i}>
                    <RichText text={p} />
                  </p>
                ))}
              {!streaming && s.evidence.length > 0 && (
                <div className="ev">
                  evidence: {s.evidence.length} signal(s) — {s.evidence.join(', ')}
                </div>
              )}
            </section>
          )
        })}
        {streaming && <span className="caret" />}
      </div>
    </div>
  )
}
