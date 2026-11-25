// Explore LLM-generated stakes: run many draws across random dials and measure variety,
// reskin rate (too close to the catalog), dial compliance, and fallback rate.
//
//   OPENAI_API_KEY=... node --experimental-strip-types scripts/explore-draws.ts [count]
//   node --experimental-strip-types scripts/explore-draws.ts 200 --mock   # pipeline test, no key, no network

import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { ALL_DURATIONS, ALL_KIDS, ALL_MODES } from '../src/data/bets.ts'
import { BET_OPTIONS } from '../src/data/catalog.ts'
import { drawStake } from '../server/draw.ts'

const args = process.argv.slice(2)
const mock = args.includes('--mock')
const count = Number(args.find((a) => /^\d+$/.test(a)) ?? 40)

function envValue(name: string): string {
  if (process.env[name]) return process.env[name] as string
  try {
    const line = readFileSync('.env', 'utf8').split('\n').find((l) => l.startsWith(`${name}=`))
    return line ? line.slice(name.length + 1).trim() : ''
  } catch {
    return ''
  }
}

const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]
const subset = <T>(xs: readonly T[], p: number): T[] => {
  const out = xs.filter(() => Math.random() < p)
  return out.length ? out : [pick(xs)]
}
const tokens = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9']+/g) ?? [])
const jaccard = (a: Set<string>, b: Set<string>) => {
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  return inter / (a.size + b.size - inter || 1)
}

// ---- optional mock model: exercises prompt -> validator -> fallback without a key ----
async function startMock() {
  const ideas = [
    { label: 'Neighborhood Bingo Card', description: 'Loser photographs five items from a bingo card the winner writes, and posts the collage in the league chat.', category: 'social', tag: 'photo scavenger hunt' },
    { label: 'Formal Apology Letter', description: 'Loser mails the winner a handwritten, notarized-looking apology and posts a photo to the group chat.', category: 'shame', tag: 'handwritten apology' },
    { label: 'Pay in Quarters', description: 'Loser pays the winner $10 entirely in quarters, filmed counting them for the league.', category: 'cash', tag: 'coins payment' },
    { label: 'Wall Sit Review', description: 'Loser holds a two-minute wall sit while reading the winner\'s team name aloud, on video for the league.', category: 'sweat', tag: 'wall sit' },
    { label: 'Garage Sweep', description: 'Loser sweeps the winner\'s garage and sends a before-and-after photo to the group chat.', category: 'chores', tag: 'garage cleanup' },
    // deliberately bad ones to confirm the validator rejects them
    { label: 'Smoke Break', description: 'Loser smokes a cigarette on video for the league.', category: 'shame', tag: 'smoking' },
    { label: 'Everything Max', description: 'Loser does an extreme thing and posts a video.', category: 'sweat', tag: 'too much', pain: 5, difficulty: 5, embarrassment: 5 },
  ]
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      const user = JSON.parse(JSON.parse(body).messages[1].content)
      const idea = pick(ideas) as Record<string, unknown>
      const content = {
        modes: [pick(user.modes)],
        duration: pick(user.durations),
        pain: 1,
        difficulty: 1,
        embarrassment: Math.min(2, user.maxEmbarrassment),
        ...idea,
      }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }))
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return { baseUrl: `http://127.0.0.1:${port}/v1`, close: () => server.close() }
}

async function main() {
  const mockServer = mock ? await startMock() : null
  const apiKey = mock ? 'mock' : envValue('OPENAI_API_KEY')
  if (!apiKey) {
    console.error('No OPENAI_API_KEY (env or .env). Use --mock to test the pipeline without one.')
    process.exit(1)
  }
  const options = {
    apiKey,
    model: envValue('OPENAI_MODEL') || 'gpt-4o-mini',
    baseUrl: mockServer?.baseUrl ?? (envValue('OPENAI_BASE_URL') || undefined),
  }

  const catalogTokens = BET_OPTIONS.map((b) => tokens(b.description))
  const results: Awaited<ReturnType<typeof drawStake>>[] = []
  const history: string[] = []
  let next = 0
  const worker = async () => {
    while (next < count) {
      next++
      const ceiling = Math.random() < 0.2 ? 5 : 1 + Math.floor(Math.random() * 5)
      const result = await drawStake(
        {
          modes: subset(ALL_MODES, 0.7),
          durations: subset(ALL_DURATIONS, 0.7),
          kids: subset(ALL_KIDS, 0.7),
          winnerPicks: Math.random() < 0.3,
          ceilings: {
            pain: Math.max(1, ceiling + Math.round(Math.random() * 2 - 1)),
            difficulty: Math.max(1, ceiling + Math.round(Math.random() * 2 - 1)),
            embarrassment: Math.max(1, ceiling + Math.round(Math.random() * 2 - 1)),
          },
          avoidLabels: history.slice(-8),
        },
        options,
      )
      history.push(result.bet.label)
      results.push(result)
    }
  }
  await Promise.all(Array.from({ length: mock ? 1 : 4 }, worker))
  mockServer?.close()

  const model = results.filter((r) => r.source === 'model')
  console.log(`\n=== ${results.length} draws (${mock ? 'MOCK model' : options.model}) ===`)
  console.log(`served by model: ${model.length} (${((model.length / results.length) * 100).toFixed(0)}%)   catalog fallback: ${results.length - model.length}`)
  if (!model.length) return

  const tags = new Set(model.map((r) => r.bet.tag).filter(Boolean))
  const labels = new Set(model.map((r) => r.bet.label.toLowerCase()))
  console.log(`distinct labels: ${labels.size}/${model.length}   distinct mechanic tags: ${tags.size}`)

  const categories: Record<string, number> = {}
  for (const r of model) categories[r.bet.category ?? 'untagged'] = (categories[r.bet.category ?? 'untagged'] ?? 0) + 1
  console.log(`category spread: ${JSON.stringify(categories)}`)

  // Reskin check: how close is each generated description to its nearest catalog description?
  const nearest = model.map((r) => {
    const t = tokens(r.bet.description)
    return Math.max(...catalogTokens.map((c) => jaccard(t, c)))
  })
  const reskins = nearest.filter((j) => j >= 0.5).length
  console.log(`reskin rate (>=0.5 word overlap with a catalog bet): ${reskins}/${model.length}   mean nearest-overlap ${(nearest.reduce((s, v) => s + v, 0) / nearest.length).toFixed(2)}`)

  // Within-run similarity: do draws collapse onto each other?
  let pairs = 0
  let sim = 0
  const sample = model.slice(0, 60).map((r) => tokens(r.bet.description))
  for (let i = 0; i < sample.length; i++) for (let j = i + 1; j < sample.length; j++) { sim += jaccard(sample[i], sample[j]); pairs++ }
  console.log(`mean pairwise overlap between draws: ${(sim / Math.max(pairs, 1)).toFixed(2)} (lower = more variety)`)

  console.log('\nsamples:')
  for (const r of model.slice(0, 8)) console.log(`  [${r.bet.category ?? '?'} / ${r.bet.tag ?? '-'}] ${r.bet.label} — ${r.bet.description}`)
}

main()
