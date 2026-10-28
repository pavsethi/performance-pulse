import { GOALS, REVIEWEE } from '../data/mock'
import type { Signal } from '../data/types'

export interface WriterStatus {
  enabled: boolean
  model: string | null
  effort: string
}

export interface StreamHandlers {
  onThinking: (text: string) => void
  onText: (text: string) => void
  onDone: (info: { model: string; usage: { input: number; output: number } }) => void
  onError: (message: string) => void
}

/** Is a key configured on the dev server? Decides Claude vs. template mode. */
export async function writerStatus(): Promise<WriterStatus> {
  try {
    const res = await fetch('/api/review/status')
    if (!res.ok) throw new Error(String(res.status))
    return (await res.json()) as WriterStatus
  } catch {
    return { enabled: false, model: null, effort: 'n/a' }
  }
}

/**
 * Streams the review from Claude via the dev-server proxy. Thinking summaries
 * and answer text arrive as separate events so the UI can show the writer
 * reasoning before the draft starts landing.
 */
export async function streamReview(
  signals: Signal[],
  transcript: string,
  h: StreamHandlers,
  abort?: AbortSignal,
): Promise<void> {
  let res: Response
  try {
    res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: abort,
      body: JSON.stringify({
        reviewee: REVIEWEE,
        goals: GOALS,
        signals,
        transcript,
      }),
    })
  } catch (e) {
    h.onError(e instanceof Error ? e.message : 'Request failed')
    return
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    h.onError(detail || `Request failed with ${res.status}`)
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames are separated by a blank line.
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''

    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      let evt: any
      try {
        evt = JSON.parse(line.slice(6))
      } catch {
        continue
      }
      if (evt.type === 'thinking') h.onThinking(evt.text)
      else if (evt.type === 'text') h.onText(evt.text)
      else if (evt.type === 'done') h.onDone(evt)
      else if (evt.type === 'error') h.onError(evt.message)
    }
  }
}

export interface ParsedSection {
  heading: string
  body: string
  evidence: string[]
}

/**
 * Parses the streaming markdown into sections as it arrives, so a half-written
 * draft still renders cleanly.
 */
export function parseSections(markdown: string): ParsedSection[] {
  return markdown
    .split(/^## /m)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [heading, ...rest] = chunk.split('\n')
      let body = rest.join('\n').trim()
      let evidence: string[] = []

      const match = body.match(/_evidence:\s*([^_]+)_\s*$/)
      if (match) {
        evidence = match[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        body = body.slice(0, match.index).trim()
      }

      return { heading: heading.trim(), body, evidence }
    })
}
