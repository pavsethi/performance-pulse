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
  const words = transcript.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="two-up">
      <div className="panel">
        <div className="bar">
          <h2>Recording</h2>
          <span className="sub">{words === 0 ? 'Nothing yet' : `${words} words`}</span>
        </div>

        <div className="panel-pad">
          <div className="recorder">
            <button
              className={`rec-btn ${recording ? 'live' : ''}`}
              onClick={recording ? stop : start}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
            >
              <span className="bead" />
            </button>
            <p>
              {recording
                ? 'Listening. Ramble — half-sentences are fine, the agent sorts it out.'
                : supported
                  ? 'Talk for two minutes about your year. No structure needed.'
                  : 'This browser has no speech engine. Type or paste below instead.'}
            </p>
          </div>

          {error && (
            <div className="hint" style={{ marginBottom: 14, color: 'var(--amber)' }}>
              {error}
            </div>
          )}

          <textarea
            className="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your words appear here as you speak."
          />
          {interim && <div className="live-text">{interim}</div>}

          <div className="btn-row" style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={onWriteReview} disabled={!transcript.trim()}>
              Use this in my review
            </button>
            <button className="btn" onClick={() => setTranscript(SAMPLE_RAMBLE)}>
              Load a sample
            </button>
            <button className="btn quiet" onClick={() => setTranscript('')}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="bar">
          <h2>What the agent heard</h2>
          <span className="sub">
            {mapped.length} matched to a goal
            {insights.length - mapped.length > 0
              ? `, ${insights.length - mapped.length} unmatched`
              : ''}
          </span>
        </div>

        <div className="panel-pad">
          {mapped.length === 0 ? (
            <p className="empty-note" style={{ margin: 0 }}>
              As you speak, what you say gets matched to your Workday goals and added to
              the evidence record alongside your pull requests.
            </p>
          ) : (
            mapped.map((ins, i) => (
              <div className={`heard ${ins.kind === 'shortfall' ? 'gap' : 'win'}`} key={i}>
                <div className="heard-kind">
                  {ins.kind === 'shortfall' ? 'Came up short' : 'Went well'}
                </div>
                <div className="heard-text">{ins.text}</div>
                <div className="heard-refs">
                  {ins.goalIds.map((g) => (
                    <span
                      className="goal-ref"
                      key={g}
                      title={GOALS.find((x) => x.id === g)?.title}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
