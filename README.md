# Performance Pulse

Your year, collected as it happens — so the performance review writes itself.

Most people write their year-end review from memory in a panicked afternoon in
November. The work that actually mattered — the Sev2 you ran in February, the
PR that halved p95, the mentee who now owns a service — is already recorded in
Azure DevOps, Azure Repos, Teams and Viva Glint. Performance Pulse collects it
all year, maps every piece of evidence to a Workday goal, and drafts the review
on demand.

## How it works

An orchestrator fans out to five sub-agents, each owning one system of record:

| Sub-agent | Source | What it returns |
| --- | --- | --- |
| **ADO Scout** | Azure DevOps | Work items, epics, sprint history |
| **Code Historian** | Azure Repos | PRs authored and reviewed, commit clusters |
| **Signal Listener** | Microsoft Teams | Incident threads, design reviews, commitments kept |
| **Kudos Collector** | Viva Glint | Recognition, quoted verbatim |
| **Goal Tracker** | Workday | FY goals, and evidence coverage per goal |

Each returns a normalized `Signal` — a dated, tagged, goal-mapped piece of
evidence with quantified outcomes attached. The **Narrative Writer** then
clusters signals by goal, ranks by impact, and drafts the review with every
claim traceable back to the signals that produced it.

### The Ramble

The systems of record know *what* you did. They don't know *why*, and they
never capture the work you did that left no ticket behind.

So hit the mic and talk for two minutes. Dictation runs in the browser via the
Web Speech API — no server, no key. The agent mines the transcript into
structured insights, matches each statement to a goal, and folds your own
voice into the draft, including the parts where you came up short. Spoken
evidence is weighted the same as a merged PR.

## Running it

```bash
npm install && npm run dev
```

Then open http://localhost:5173.

### Letting Claude write it

Without a key the app drafts locally from a template and says so in the byline.
To have Claude write the review instead:

```bash
cp .env.example .env   # then add your key
npm run check:claude   # confirms the key works before you need it
npm run dry-run        # writes a full review in the terminal, no browser
npm run dev
```

If your machine has `ANTHROPIC_BASE_URL` pinned to a corporate gateway, the SDK
would pick that up silently and the gateway will reject a personal `sk-ant-`
key with a 403. The app ignores it and calls `https://api.anthropic.com`;
override with `PULSE_BASE_URL` if you need the gateway.

The key is read by the Vite dev server and the model call runs in Node, so it
never enters the client bundle — the browser only talks to `/api/review`, which
streams the draft back over SSE. `.env` is gitignored.

Model defaults to `claude-opus-5-5` at `high` effort; override with
`PULSE_MODEL` / `PULSE_EFFORT`. Thinking summaries stream into the status
console while it works, then the draft streams in underneath.

The prompt ([`server/prompt.ts`](server/prompt.ts)) hands Claude the goals, the
full evidence record and the transcript, and asks for three paragraphs: what
you delivered, how you worked, and where you fell short. Every claim has to be
traceable, so the draft ends with the signal ids it drew on. If the call fails
for any reason, the app falls back to the local template writer — which writes
the same three paragraphs from the same evidence — and tells you why rather
than dying on stage.

- **Pulse** — the live evidence timeline, the sub-agents working, goal coverage
- **Ramble** — record or paste; watch statements get mapped to goals in real time
- **Write the review** — streams a goal-by-goal draft, copyable as markdown

## Demo-day notes

All connector data is fixtures in [`src/data/mock.ts`](src/data/mock.ts) — the
sub-agents replay them on a timer, so the demo is deterministic and runs with
no credentials and no network. If the room's microphone is uncooperative,
**Load sample ramble** drops in a pre-written transcript and the rest of the
flow is identical.

Swapping in real connectors means replacing `runHarvest` in
[`src/agents/agents.ts`](src/agents/agents.ts) with real API calls that return
the same `Signal` shape. Nothing downstream changes.

## Stack

React 18 + TypeScript + Vite. No UI framework, no backend, no API keys.
