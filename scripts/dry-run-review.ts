/**
 * Runs the real Narrative Writer from the command line, with the real prompt
 * and the real fixtures — no browser, no dev server.
 *   npm run dry-run
 */
import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { buildUserMessage, SYSTEM_PROMPT } from '../server/prompt.ts'
import { GOALS, REVIEWEE, SAMPLE_RAMBLE, SIGNALS } from '../src/data/mock.ts'

const BASE_URL = process.env.PULSE_BASE_URL ?? 'https://api.anthropic.com'
const MODEL = process.env.PULSE_MODEL ?? 'claude-opus-5-5'
const EFFORT = (process.env.PULSE_EFFORT ?? 'high') as 'low' | 'medium' | 'high'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('✗ ANTHROPIC_API_KEY is not set.')
  process.exit(1)
}

console.log(`calling ${BASE_URL} as ${MODEL} at effort ${EFFORT}\n`)

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: BASE_URL })

const stream = client.messages.stream({
  model: MODEL,
  max_tokens: 16000,
  thinking: { type: 'adaptive', display: 'summarized' },
  output_config: { effort: EFFORT },
  system: SYSTEM_PROMPT,
  messages: [
    {
      role: 'user',
      content: buildUserMessage({
        reviewee: REVIEWEE,
        goals: GOALS,
        signals: SIGNALS,
        transcript: SAMPLE_RAMBLE,
      }),
    },
  ],
})

let text = ''
stream.on('text', (t) => {
  text += t
  process.stdout.write(t)
})

const final = await stream.finalMessage()

const body = text.replace(/_evidence:[\s\S]*$/, '').trim()
const paragraphs = body.split(/\n{2,}/).filter(Boolean)
const bolds = text.match(/\*\*[^*]+\*\*/g) ?? []
const evidence = text.match(/_evidence:\s*([^_]*)_/)?.[1]?.split(',').length ?? 0

console.log('\n\n---')
console.log(`stop reason : ${final.stop_reason}`)
console.log(`paragraphs  : ${paragraphs.length}${paragraphs.length === 3 ? ' ✓' : ' ✗ expected 3'}`)
console.log(`bold marks  : ${bolds.length}${bolds.length === 1 ? ' ✓' : ' ✗ expected 1'}`)
console.log(`headings    : ${(text.match(/^## /gm) ?? []).length} (expected 0)`)
console.log(`evidence ids: ${evidence}`)
console.log(`words       : ${body.split(/\s+/).length}`)
console.log(`tokens      : ${final.usage.input_tokens} in / ${final.usage.output_tokens} out`)
