/**
 * Confirms the key in .env actually works, before you need it on stage.
 *   npm run check:claude
 */
import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'

const MODEL = process.env.PULSE_MODEL ?? 'claude-opus-5-5'
const BASE_URL = process.env.PULSE_BASE_URL ?? 'https://api.anthropic.com'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('✗ ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.')
  process.exit(1)
}

if (process.env.ANTHROPIC_BASE_URL && process.env.ANTHROPIC_BASE_URL !== BASE_URL) {
  console.log(`  note: ignoring ANTHROPIC_BASE_URL=${process.env.ANTHROPIC_BASE_URL}`)
}
console.log(`  calling ${BASE_URL} as ${MODEL}`)

try {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: BASE_URL,
  })
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 64,
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: 'Reply with exactly: pulse ok' }],
  })
  const text = res.content.find((b) => b.type === 'text')?.text ?? ''
  console.log(`✓ ${res.model} responded: ${text.trim()}`)
  console.log(`  ${res.usage.input_tokens} in / ${res.usage.output_tokens} out`)
} catch (err) {
  console.error(`✗ ${MODEL} call failed: ${err.message}`)
  process.exit(1)
}
