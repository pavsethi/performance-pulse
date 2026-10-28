import { useEffect, useMemo, useRef, useState } from 'react'
import { parseSections, streamReview, writerStatus } from '../agents/claude'
import type { WriterStatus } from '../agents/claude'
import { composeReview, mineRamble, reviewToMarkdown } from '../agents/writer'
import type { Signal } from '../data/types'
import { REVIEWEE } from '../data/mock'

interface Props {
  signals: Signal[]
  transcript: string
  autoStart: boolean
  onConsumedAutoStart: () => void
}

type Phase = 'idle' | 'thinking' | 'writing' | 'done' | 'error'

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

const TEMPLATE_STAGES = [
  'Loading your FY26 goals from Workday',
  'Grouping the evidence by goal',
  'Ranking outcomes by impact',
  'Folding in what you said out loud',
]

export default function ReviewView({
  signals,
  transcript,
  autoStart,
  onConsumedAutoStart,
}: Props) {
  const [status, setStatus] = useState<WriterStatus | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [draft, setDraft] = useState('')
  const [thoughts, setThoughts] = useState<string[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [usage, setUsage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const timers = useRef<number[]>([])
  const abort = useRef<AbortController | null>(null)

  const insights = useMemo(() => mineRamble(transcript), [transcript])
  const sections = useMemo(() => parseSections(draft), [draft])

  useEffect(() => {
    void writerStatus().then(setStatus)
  }, [])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  useEffect(
    () => () => {
      clearTimers()
      abort.current?.abort()
    },
    [],
  )

  /** No key configured (or Claude failed): reveal the local draft on a timer. */
  const runTemplate = (reason?: string) => {
    clearTimers()
    if (reason) setNote(reason)
    setPhase('thinking')
    setThoughts([])
    setDraft('')

    TEMPLATE_STAGES.forEach((s, i) =>
      timers.current.push(
        window.setTimeout(() => setThoughts((t) => [...t, s]), i * 380),
      ),
    )

    timers.current.push(
      window.setTimeout(() => {
        const markdown = reviewToMarkdown(composeReview(signals, insights))
        setPhase('writing')
        let i = 0
        const tick = () => {
          i = Math.min(markdown.length, i + 16)
          setDraft(markdown.slice(0, i))
          if (i < markdown.length) timers.current.push(window.setTimeout(tick, 12))
          else setPhase('done')
        }
        tick()
      }, TEMPLATE_STAGES.length * 380),
    )
  }

  const generate = () => {
    clearTimers()
    abort.current?.abort()
    setNote(null)
    setUsage(null)
    setDraft('')
    setThoughts([])

    if (!status?.enabled) {
      runTemplate(
        status
          ? 'No API key on the dev server, so this draft was built locally from the evidence.'
          : undefined,
      )
      return
    }

    setPhase('thinking')
    const controller = new AbortController()
    abort.current = controller
    let sawText = false

    void streamReview(
      signals,
      transcript,
      {
        onThinking: (t) => setThoughts((prev) => [prev.join('') + t]),
        onText: (t) => {
          if (!sawText) {
            sawText = true
            setPhase('writing')
          }
          setDraft((d) => d + t)
        },
        onDone: (info) => {
          setPhase('done')
          setUsage(`${info.usage.output.toLocaleString()} tokens written`)
        },
        onError: (message) => {
          if (sawText) {
            setPhase('error')
            setNote(message)
          } else {
            runTemplate(`Claude could not be reached (${message}), so this draft was built locally.`)
          }
        },
      },
      controller.signal,
    )
  }

  useEffect(() => {
    if (autoStart && status) {
      onConsumedAutoStart()
      generate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, status])

  const copy = async () => {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const working = phase === 'thinking' || phase === 'writing'
  const writerName = status?.enabled ? status.model : 'Local draft writer'

  const thinkingTail = thoughts
    .join(' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(-3)

  if (!draft) {
    return (
      <div className="panel">
        <div className="start">
          <h2>Your review is already written. You just have to ask.</h2>
          <p>
            {signals.length} pieces of evidence from Azure DevOps, Azure Repos, Teams and
            Glint
            {insights.length > 0
              ? `, plus ${insights.length} things you said in your own words`
              : ''}
            .{' '}
            {status?.enabled
              ? `${status.model} writes the draft, and every claim stays traceable to a source.`
              : 'Every claim stays traceable back to a source.'}
          </p>

          <button className="btn primary" onClick={generate} disabled={working || !status}>
            {working ? 'Writing' : 'Write my review'}
          </button>

          {status && !status.enabled && phase === 'idle' && (
            <div className="hint" style={{ maxWidth: 480, margin: '22px auto 0' }}>
              No <code>ANTHROPIC_API_KEY</code> on the dev server. Add one to{' '}
              <code>.env</code> and restart to have Claude write the review. Until then the
              local writer builds the draft from the same evidence.
            </div>
          )}

          {working && (
            <div className="worklog">
              <div className="lead">{writerName}</div>
              {(status?.enabled ? thinkingTail : thoughts).map((t, i) => (
                <div key={i}>{t}</div>
              ))}
              {status?.enabled && thinkingTail.length === 0 && <div>Reading the record…</div>}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="bar">
        <h2>{REVIEWEE.cycle}</h2>
        <div className="btn-row">
          <button className="btn" onClick={copy} disabled={working}>
            {copied ? 'Copied' : 'Copy for Workday'}
          </button>
          <button className="btn" onClick={generate} disabled={working}>
            Write it again
          </button>
        </div>
      </div>

      <div className="byline">
        {status?.enabled && <span className="live-pill">{status.model}</span>}
        <span>
          {working ? 'Writing now' : 'Draft ready'}
          {usage ? `, ${usage}` : ''}
          {note ? ` — ${note}` : ''}
        </span>
      </div>

      <div className="doc">
        {sections.map((s, i) => (
          <section key={i}>
            <h3>{s.heading}</h3>
            {s.body
              .split('\n\n')
              .filter(Boolean)
              .map((p, j) => (
                <p key={j}>
                  <RichText text={p.trim()} />
                </p>
              ))}
            {s.evidence.length > 0 && (
              <div className="cite">drawn from {s.evidence.join(', ')}</div>
            )}
          </section>
        ))}
        {working && <span className="caret" />}
      </div>
    </div>
  )
}
