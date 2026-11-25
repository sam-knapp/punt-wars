// Run draws "through the chat": the assistant plays the model, using the exact same prompt,
// request builder, and validator as the live API path.
//
//   node --experimental-strip-types scripts/chat-draws.ts prepare 24   # writes scripts/out/chat-requests.json
//   (assistant answers each request, writes scripts/out/chat-responses.json)
//   node --experimental-strip-types scripts/chat-draws.ts score

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { ALL_DURATIONS, ALL_KIDS, ALL_MODES } from '../src/data/bets.ts'
import { BET_OPTIONS } from '../src/data/catalog.ts'
import { buildUserMessage, normalizeModelBet, parseCriteria, usesHeadroom } from './../server/draw.ts'

const CHEEKY = process.argv.includes('--cheeky')
const SPREAD = process.argv.includes('--spread')
const FLAVORS = process.argv.includes('--flavors')
const FLAVOR_ORDER = ['cash', 'sweat', 'shame', 'chores', 'social']
const SUFFIX = SPREAD ? '-spread' : FLAVORS ? '-flavors' : CHEEKY ? '-cheeky' : ''
const REQUESTS = `scripts/out/chat-requests${SUFFIX}.json`
const RESPONSES = `scripts/out/chat-responses${SUFFIX}.json`

// --spread: 25 uniform dial levels (5 each at 1..5) plus 25 lopsided profiles, so the batch
// covers every region of the toggles. Every 4th request is friends-only.
const UNIFORM = [1, 2, 3, 4, 5].flatMap((level) => Array(5).fill([level, level, level]))
const LOPSIDED: [number, number, number][] = [
  [5, 1, 1], [1, 5, 1], [1, 1, 5], [5, 5, 1], [5, 1, 5], [1, 5, 5], [4, 2, 1], [2, 4, 1], [1, 2, 4],
  [3, 1, 5], [5, 3, 2], [2, 5, 3], [3, 3, 5], [5, 2, 4], [4, 4, 2], [1, 3, 5], [2, 1, 4], [4, 1, 2],
  [1, 4, 3], [3, 5, 1], [5, 4, 3], [2, 3, 5], [4, 5, 4], [1, 5, 3], [3, 2, 2],
]
const SPREAD_DIALS: [number, number, number][] = [...UNIFORM, ...LOPSIDED].sort(
  (a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]),
)

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

function prepare(count: number) {
  const requests = Array.from({ length: count }, (_, index) => {
    const ceiling = Math.random() < 0.2 ? 5 : 1 + Math.floor(Math.random() * 5)
    const jitter = () => Math.min(5, Math.max(1, ceiling + Math.round(Math.random() * 2 - 1)))
    const dial = SPREAD ? SPREAD_DIALS[index] : null
    const input = {
      modes: subset(ALL_MODES, 0.7),
      durations: subset(ALL_DURATIONS, 0.7),
      kids: subset(ALL_KIDS, 0.7),
      winnerPicks: Math.random() < 0.3,
      cheeky: SPREAD ? index % 4 === 3 : CHEEKY,
      categories: FLAVORS ? [FLAVOR_ORDER[index % FLAVOR_ORDER.length]] : [],
      ceilings: dial
        ? { pain: dial[0], difficulty: dial[1], embarrassment: dial[2] }
        : { pain: jitter(), difficulty: jitter(), embarrassment: jitter() },
      avoidLabels: [],
    }
    return { n: index + 1, input, message: buildUserMessage(parseCriteria(input)) }
  })
  mkdirSync('scripts/out', { recursive: true })
  writeFileSync(REQUESTS, JSON.stringify(requests, null, 2))
  console.log(`wrote ${requests.length} requests to ${REQUESTS}`)
}

function score() {
  const requests = JSON.parse(readFileSync(REQUESTS, 'utf8')) as {
    n: number
    input: unknown
    message: Record<string, unknown>
  }[]
  const responses = JSON.parse(readFileSync(RESPONSES, 'utf8')) as Record<string, unknown>[]
  const catalogTokens = BET_OPTIONS.map((b) => tokens(b.description))
  const seen: string[] = []
  const accepted: { n: number; bet: NonNullable<ReturnType<typeof normalizeModelBet>>; nearest: number }[] = []
  const rejected: { n: number; label: unknown }[] = []

  requests.forEach((request, i) => {
    const criteria = parseCriteria({ ...(request.input as object), avoidLabels: seen.slice(-8) })
    const bet = normalizeModelBet(responses[i], criteria)
    if (!bet) {
      rejected.push({ n: request.n, label: responses[i]?.label })
      return
    }
    seen.push(bet.label)
    const t = tokens(bet.description)
    accepted.push({ n: request.n, bet, nearest: Math.max(...catalogTokens.map((c) => jaccard(t, c))) })
  })

  console.log(`\n=== ${requests.length} draws played by the assistant ===`)
  console.log(`passed validator: ${accepted.length}   rejected: ${rejected.length}`)
  for (const r of rejected) console.log(`  rejected #${r.n}: ${String(r.label)}`)

  const lowHeadroom = accepted.filter((a) => {
    const m = requests[a.n - 1].message
    return !usesHeadroom(a.bet.intensity, {
      pain: Number(m.maxPain),
      difficulty: Number(m.maxDifficulty),
      embarrassment: Number(m.maxEmbarrassment),
    })
  })
  const fill = accepted.map((a) => {
    const m = requests[a.n - 1].message
    const room = Number(m.maxPain) + Number(m.maxDifficulty) + Number(m.maxEmbarrassment)
    return (a.bet.intensity.pain + a.bet.intensity.difficulty + a.bet.intensity.embarrassment) / room
  })
  console.log(`headroom check (one score at its max, 60%+ of combined max): ${accepted.length - lowHeadroom.length}/${accepted.length} pass   mean fill ${(fill.reduce((s, v) => s + v, 0) / Math.max(fill.length, 1)).toFixed(2)}`)
  for (const a of lowHeadroom) console.log(`  low headroom #${a.n}: ${a.bet.label}`)

  const cats: Record<string, number> = {}
  for (const a of accepted) cats[a.bet.category ?? 'untagged'] = (cats[a.bet.category ?? 'untagged'] ?? 0) + 1
  console.log(`distinct tags: ${new Set(accepted.map((a) => a.bet.tag)).size}/${accepted.length}   categories: ${JSON.stringify(cats)}`)
  const reskins = accepted.filter((a) => a.nearest >= 0.5)
  console.log(`reskins (>=0.5 overlap with catalog): ${reskins.length}   mean nearest overlap ${(accepted.reduce((s, a) => s + a.nearest, 0) / accepted.length).toFixed(2)}`)

  let pairs = 0
  let sim = 0
  for (let i = 0; i < accepted.length; i++)
    for (let j = i + 1; j < accepted.length; j++) {
      sim += jaccard(tokens(accepted[i].bet.description), tokens(accepted[j].bet.description))
      pairs++
    }
  console.log(`mean pairwise overlap between draws: ${(sim / Math.max(pairs, 1)).toFixed(2)}`)

  const dials = (a: (typeof accepted)[number], req = requests[a.n - 1].message) =>
    `max ${req.maxPain}/${req.maxDifficulty}/${req.maxEmbarrassment} -> ${a.bet.intensity.pain}/${a.bet.intensity.difficulty}/${a.bet.intensity.embarrassment}`
  console.log('')
  for (const a of accepted) {
    console.log(`#${String(a.n).padStart(2)} [${a.bet.category}/${a.bet.tag}] ${a.bet.label} (${a.bet.duration}, ${a.bet.modes.join('+')}${a.bet.winnerPicks ? ', winner picks' : ''}; ${dials(a)}; overlap ${a.nearest.toFixed(2)})`)
    console.log(`     ${a.bet.description}`)
  }
}

const [command, arg] = process.argv.slice(2)
if (command === 'prepare') prepare(Number(arg ?? 24))
else if (command === 'score') score()
else console.error('usage: chat-draws.ts prepare [count] | score')
