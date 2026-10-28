import Anthropic from '@anthropic-ai/sdk'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildUserMessage, SYSTEM_PROMPT } from './prompt'
import type { ReviewPayload } from './prompt'

/**
 * The Narrative Writer runs here, in Node, so ANTHROPIC_API_KEY never reaches
 * the browser bundle. The client talks to /api/review over SSE.
 */

const MODEL = process.env.PULSE_MODEL ?? 'claude-opus-5-5'
const EFFORT = (process.env.PULSE_EFFORT ?? 'high') as
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max'

export const hasKey = () => Boolean(process.env.ANTHROPIC_API_KEY)

export const statusBody = () =>
  JSON.stringify({ enabled: hasKey(), model: hasKey() ? MODEL : null, effort: EFFORT })

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })

export async function handleReview(req: IncomingMessage, res: ServerResponse) {
  if (!hasKey()) {
    res.statusCode = 503
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not set' }))
    return
  }

  let payload: ReviewPayload
  try {
    payload = JSON.parse(await readBody(req))
  } catch {
    res.statusCode = 400
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'Malformed request body' }))
    return
  }

  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  })

  const send = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  try {
    const client = new Anthropic()

    // Opus 5.5 thinks adaptively by default; `summarized` lets the UI show the
    // writer reasoning instead of a dead pause before the first token.
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: { effort: EFFORT },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(payload) }],
    })

    for await (const event of stream) {
      if (event.type !== 'content_block_delta') continue
      if (event.delta.type === 'thinking_delta') {
        send({ type: 'thinking', text: event.delta.thinking })
      } else if (event.delta.type === 'text_delta') {
        send({ type: 'text', text: event.delta.text })
      }
    }

    const final = await stream.finalMessage()

    if (final.stop_reason === 'refusal') {
      send({ type: 'error', message: 'The model declined this request.' })
    } else {
      send({
        type: 'done',
        model: final.model,
        stopReason: final.stop_reason,
        usage: {
          input: final.usage.input_tokens,
          output: final.usage.output_tokens,
        },
      })
    }
  } catch (err) {
    const message =
      err instanceof Anthropic.AuthenticationError
        ? 'Invalid API key — check ANTHROPIC_API_KEY in .env'
        : err instanceof Anthropic.RateLimitError
          ? 'Rate limited. Try again in a moment.'
          : err instanceof Anthropic.APIError
            ? `API error ${err.status}: ${err.message}`
            : err instanceof Error
              ? err.message
              : 'Unknown error'
    console.error('[pulse] review failed:', message)
    send({ type: 'error', message })
  } finally {
    res.end()
  }
}
