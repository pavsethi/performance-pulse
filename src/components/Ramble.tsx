import { useMemo } from 'react'
import { mineRamble } from '../agents/writer'
import { GOALS, SAMPLE_RAMBLE } from '../data/mock'
import { useSpeech } from '../hooks/useSpeech'

interface Props {
  transcript: string
  setTranscript: (v: string | ((p: string) => string)) => void
  onWriteReview: () => void
}

export default function Ramble({ transcript, setTranscript, onWriteReview }: Props) {
  const { recording, interim, error, supported, start, stop } = useSpeech((chunk) =>
    setTranscript((prev) => prev + chunk),
  )

  const insights = useMemo(() => mineRamble(transcript), [transcript])
  const mapped = insights.filter((i) => i.goalIds.length > 0)

  return (
    <div className="grid">
      <div className="card">
        <div className="card-head">
          <h2>Talk about your year</h2>
          <span>{transcript.trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>

        <div className="mic-wrap">
          <button
            className={`mic ${recording ? 'rec' : ''}`}
            onClick={recording ? stop : start}
            title={recording ? 'Stop recording' : 'Start recording'}
          >
            {recording ? '■' : '🎙'}
          </button>
          <div className="mic-hint">
            {recording
              ? 'Listening — ramble. Half-sentences are fine, the agent sorts it out.'
              : supported
                ? 'Hit the mic and talk for two minutes about your year. No structure needed.'
                : 'Speech capture is unavailable in this browser — type or paste below instead.'}
          </div>
        </div>

        {error && (
          <div className="note" style={{ color: 'var(--warn)' }}>
            {error}
          </div>
        )}

        <textarea
          className="transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Your transcript appears here as you speak…"
          style={{ marginTop: 16 }}
        />
        {interim && <div className="interim">…{interim}</div>}

        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={onWriteReview} disabled={!transcript.trim()}>
            Fold into my review →
          </button>
          <button className="btn" onClick={() => setTranscript(SAMPLE_RAMBLE)}>
            Load sample ramble
          </button>
          <button className="btn danger" onClick={() => setTranscript('')}>
            Clear
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>What the agent heard</h2>
          <span>
            {mapped.length} mapped · {insights.length - mapped.length} unmapped
          </span>
        </div>

        {mapped.length === 0 && (
          <p style={{ color: 'var(--dim)', fontSize: 13 }}>
            Nothing mined yet. As you speak, statements get matched to your Workday
            goals and added to the evidence timeline.
          </p>
        )}

        {mapped.map((ins, i) => (
          <div className={`insight ${ins.kind}`} key={i}>
            <div style={{ color: ins.kind === 'shortfall' ? 'var(--warn)' : 'var(--text)' }}>
              {ins.kind === 'shortfall' ? 'Gap · ' : 'Win · '}
              <span style={{ color: 'var(--muted)' }}>{ins.text}</span>
            </div>
            <div className="goals">
              {ins.goalIds.map((g) => (
                <span className="tag" key={g} title={GOALS.find((x) => x.id === g)?.title}>
                  {g}
                </span>
              ))}
            </div>
          </div>
        ))}

        <div className="note">
          Spoken evidence is weighted the same as a merged PR — it is the only source
          that knows <em>why</em> you did something.
        </div>
      </div>
    </div>
  )
}
