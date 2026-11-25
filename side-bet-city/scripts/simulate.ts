// Synthetic popularity simulation for Side Bet City.
// Uses the real catalog and the real dial filter. League behavior is ASSUMED, not observed:
// treat results about "what people like" as a stress test of the scoring design, not as data.

import { ALL_DURATIONS, ALL_KIDS, ALL_MODES, betInRange } from '../src/data/bets.ts'
import { BET_OPTIONS } from '../src/data/catalog.ts'
import type { BetOption, DeliveryMode, Intensity, StakeShape } from '../src/types.ts'

// ---------- seeded randomness ----------
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
type Rand = () => number
const gauss = (r: Rand) => {
  const u = Math.max(r(), 1e-9)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r())
}
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const pick = <T>(arr: T[], r: Rand): T => arr[Math.floor(r() * arr.length)]

// ---------- families ----------
const FAMILY_RE = /^(.*)-(in-person|remote|online)-(quick|errand|week|season)-(around|bedtime)-(winner|set)$/
const familyOf = (bet: BetOption) => FAMILY_RE.exec(bet.id)?.[1] ?? bet.id

// ---------- assumed league archetypes ----------
type Persona = {
  name: string
  weight: number
  tolerance: Intensity
  ceilings: Intensity
  embLove: number
  diligence: number
  modes?: DeliveryMode[]
  taste: Partial<Record<BetOption['category'], number>>
}

const PERSONAS: Persona[] = [
  { name: 'Chill dads', weight: 0.35, tolerance: { pain: 2, difficulty: 3, embarrassment: 2 }, ceilings: { pain: 2, difficulty: 3, embarrassment: 2 }, embLove: -0.3, diligence: 0.05, taste: { cash: 0.3, chores: 0.2 } },
  { name: 'Roast crew', weight: 0.25, tolerance: { pain: 3, difficulty: 3, embarrassment: 5 }, ceilings: { pain: 3, difficulty: 3, embarrassment: 5 }, embLove: 0.5, diligence: 0, taste: { shame: 0.4, social: 0.3 } },
  { name: 'Hardcore', weight: 0.15, tolerance: { pain: 5, difficulty: 5, embarrassment: 4 }, ceilings: { pain: 5, difficulty: 5, embarrassment: 4 }, embLove: 0.2, diligence: 0.1, taste: { sweat: 0.4, chores: 0.1 } },
  { name: 'Remote friends', weight: 0.15, tolerance: { pain: 2, difficulty: 3, embarrassment: 3 }, ceilings: { pain: 2, difficulty: 3, embarrassment: 4 }, embLove: 0.1, diligence: -0.05, modes: ['remote', 'online'], taste: { social: 0.3 } },
  { name: 'Busy leagues', weight: 0.1, tolerance: { pain: 2, difficulty: 2, embarrassment: 3 }, ceilings: { pain: 2, difficulty: 2, embarrassment: 3 }, embLove: 0, diligence: -0.15, taste: { cash: 0.3 } },
]

type League = { id: number; persona: Persona; tolerance: Intensity; ceilings: Intensity }

function makeLeagues(count: number, r: Rand): League[] {
  return Array.from({ length: count }, (_, id) => {
    let roll = r()
    let persona = PERSONAS[PERSONAS.length - 1]
    for (const p of PERSONAS) {
      if ((roll -= p.weight) < 0) {
        persona = p
        break
      }
    }
    const jitter = (v: number) => clamp(Math.round(v + gauss(r) * 0.7), 1, 5)
    return {
      id,
      persona,
      tolerance: { pain: jitter(persona.tolerance.pain), difficulty: jitter(persona.tolerance.difficulty), embarrassment: jitter(persona.tolerance.embarrassment) },
      ceilings: { pain: jitter(persona.ceilings.pain), difficulty: jitter(persona.ceilings.difficulty), embarrassment: jitter(persona.ceilings.embarrassment) },
    }
  })
}

// Hidden "tickles this league" latent per league x family, so humor varies by group.
function makeTickle(leagues: League[], families: string[], r: Rand) {
  const table = new Map<string, number>()
  for (const l of leagues) for (const f of families) table.set(`${l.id}|${f}`, gauss(r) * 0.45)
  return table
}

// ---------- events ----------
type Event = {
  league: number
  persona: string
  family: string
  template: string
  accepted: boolean
  completed: boolean
  shared: boolean
  embarrassment: number
  ceilingTotal: number
}
type Run = { events: Event[]; sessions: number; emptyPool: number; fallbackDraws: number }

function randomSubset<T>(arr: T[], p: number, r: Rand): T[] {
  const out = arr.filter(() => r() < p)
  return out.length ? out : [pick(arr, r)]
}

function simulate(sessions: number, seed: number, leagueCount = 150): Run {
  const r = rng(seed)
  const leagues = makeLeagues(leagueCount, rng(7)) // same league population for every run
  const families = [...new Set(BET_OPTIONS.map(familyOf))]
  const tickle = makeTickle(leagues, families, rng(11))
  const events: Event[] = []
  let emptyPool = 0
  let fallbackDraws = 0

  for (let s = 0; s < sessions; s++) {
    const league = pick(leagues, r)
    const { persona } = league

    const mode = r()
    const ceiling: Intensity =
      mode < 0.15
        ? { pain: 5, difficulty: 5, embarrassment: 5 } // "show me the worst"
        : mode < 0.3
          ? { pain: 1 + Math.floor(r() * 5), difficulty: 1 + Math.floor(r() * 5), embarrassment: 1 + Math.floor(r() * 5) }
          : {
              pain: clamp(league.ceilings.pain + Math.round(gauss(r)), 1, 5),
              difficulty: clamp(league.ceilings.difficulty + Math.round(gauss(r)), 1, 5),
              embarrassment: clamp(league.ceilings.embarrassment + Math.round(gauss(r)), 1, 5),
            }

    const shape: StakeShape = {
      modes: persona.modes ? randomSubset(persona.modes, 0.8, r) : randomSubset(ALL_MODES, 0.7, r),
      durations: randomSubset(ALL_DURATIONS, 0.7, r),
      kids: randomSubset(ALL_KIDS, 0.7, r),
      winnerPicks: r() < 0.3,
      ceiling,
    }

    let pool = BET_OPTIONS.filter((b) => betInRange(b, shape))
    let relaxed = false
    if (pool.length === 0) {
      emptyPool++
      relaxed = true
      pool = BET_OPTIONS.filter((b) => betInRange(b, { ...shape, ceiling: { pain: 5, difficulty: 5, embarrassment: 5 } }))
      if (pool.length === 0) pool = BET_OPTIONS
    }

    for (let draw = 0; draw < 3; draw++) {
      const bet = pick(pool, r)
      if (relaxed) fallbackDraws++
      const family = familyOf(bet)
      const t = tickle.get(`${league.id}|${family}`) ?? 0

      const overshoot =
        Math.max(0, bet.intensity.pain - league.tolerance.pain) +
        Math.max(0, bet.intensity.difficulty - league.tolerance.difficulty) +
        Math.max(0, bet.intensity.embarrassment - league.tolerance.embarrassment)
      const logit =
        1.1 -
        0.95 * overshoot +
        persona.embLove * (bet.intensity.embarrassment - 3) * 0.5 +
        (persona.taste[bet.category] ?? 0) +
        t * 1.4 -
        (bet.duration === 'season' ? 0.4 : bet.duration === 'week' ? 0.15 : 0)
      const accepted = r() < sigmoid(logit)

      let completed = false
      let shared = false
      if (accepted) {
        const pComplete = clamp(
          0.95 -
            0.1 * (bet.intensity.difficulty - 1) -
            0.06 * (bet.intensity.pain - 1) -
            (bet.duration === 'season' ? 0.18 : bet.duration === 'week' ? 0.07 : 0) +
            persona.diligence,
          0.15,
          0.98,
        )
        completed = r() < pComplete
        if (completed) shared = r() < sigmoid(-1.7 + 0.45 * bet.intensity.embarrassment + 1.0 * t)
      }

      events.push({
        league: league.id,
        persona: persona.name,
        family,
        template: bet.id,
        accepted,
        completed,
        shared,
        embarrassment: bet.intensity.embarrassment,
        ceilingTotal: ceiling.pain + ceiling.difficulty + ceiling.embarrassment,
      })
      if (accepted) break
    }
  }
  return { events, sessions, emptyPool, fallbackDraws }
}

// ---------- scoring ----------
type Agg = { impressions: number; accepts: number; completes: number; shares: number; leagues: Set<number> }
const blank = (): Agg => ({ impressions: 0, accepts: 0, completes: 0, shares: 0, leagues: new Set() })

function aggregate(events: Event[], key: (e: Event) => string) {
  const map = new Map<string, Agg>()
  for (const e of events) {
    const k = key(e)
    const a = map.get(k) ?? blank()
    a.impressions++
    if (e.accepted) {
      a.accepts++
      a.leagues.add(e.league)
    }
    if (e.completed) a.completes++
    if (e.shared) a.shares++
    map.set(k, a)
  }
  return map
}

type Scored = { key: string; naive: number; rate: number; score: number; agg: Agg }

function score(map: Map<string, Agg>, keys: string[], shrink = 10): Scored[] {
  let imp = 0, acc = 0, com = 0, sha = 0
  for (const a of map.values()) { imp += a.impressions; acc += a.accepts; com += a.completes; sha += a.shares }
  const pA = acc / Math.max(imp, 1), pC = com / Math.max(acc, 1), pS = sha / Math.max(com, 1)
  return keys.map((key) => {
    const a = map.get(key) ?? blank()
    const accept = (a.accepts + pA * shrink) / (a.impressions + shrink)
    const complete = (a.completes + pC * shrink) / (a.accepts + shrink)
    const share = (a.shares + pS * shrink) / (a.completes + shrink)
    const rate = accept * complete
    return { key, naive: a.accepts, rate, score: rate * (1 + 0.5 * share) * Math.log2(1 + a.leagues.size), agg: a }
  })
}

function ranks(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0])
  const out = new Array<number>(values.length)
  for (let i = 0; i < order.length; ) {
    let j = i
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++
    const avg = (i + j) / 2
    for (let k = i; k <= j; k++) out[order[k][1]] = avg
    i = j + 1
  }
  return out
}
function spearman(a: number[], b: number[]): number {
  const ra = ranks(a), rb = ranks(b)
  const n = a.length
  const ma = ra.reduce((s, v) => s + v, 0) / n, mb = rb.reduce((s, v) => s + v, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb)
    da += (ra[i] - ma) ** 2
    db += (rb[i] - mb) ** 2
  }
  return da && db ? num / Math.sqrt(da * db) : 0
}
const topSet = (rows: Scored[], pickBy: (s: Scored) => number, n: number) =>
  new Set([...rows].sort((a, b) => pickBy(b) - pickBy(a)).slice(0, n).map((r) => r.key))
const overlap = (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x)).length

const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`
const TEMPLATES = BET_OPTIONS.map((b) => b.id)
const FAMILIES = [...new Set(BET_OPTIONS.map(familyOf))]

// ---------- report ----------
function main() {
  const N = 1000
  const run = simulate(N, 42)
  const ev = run.events
  const accepted = ev.filter((e) => e.accepted)
  console.log(`\n=== ${N} simulated sessions over ${BET_OPTIONS.length} templates / ${FAMILIES.length} families ===`)
  console.log(`draws shown: ${ev.length}   accepted: ${accepted.length} (${pct(accepted.length / ev.length)} of draws)`)
  console.log(`completed: ${pct(accepted.filter((e) => e.completed).length / accepted.length)} of accepted   shared: ${pct(accepted.filter((e) => e.shared).length / accepted.length)} of accepted`)
  console.log(`sessions where dials matched nothing: ${run.emptyPool} (${pct(run.emptyPool / N)})   draws served from the relaxed fallback: ${run.fallbackDraws}`)

  const byTemplate = aggregate(ev, (e) => e.template)
  const byFamily = aggregate(ev, (e) => e.family)
  const seen = [...byTemplate.values()].filter((a) => a.impressions > 0).length
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
  console.log(`templates ever shown: ${seen}/${BET_OPTIONS.length}   median impressions per shown template: ${med([...byTemplate.values()].map((a) => a.impressions))}   max: ${Math.max(...[...byTemplate.values()].map((a) => a.impressions))}`)
  console.log(`families: median impressions ${med([...byFamily.values()].map((a) => a.impressions))}`)

  // Exposure bias: what share of impressions go to low-embarrassment templates, by ceiling.
  console.log('\n--- exposure vs. dial setting (what the draw actually shows) ---')
  const bands = [[3, 6], [7, 9], [10, 12], [13, 15]] as const
  for (const [lo, hi] of bands) {
    const rows = ev.filter((e) => e.ceilingTotal >= lo && e.ceilingTotal <= hi)
    if (!rows.length) continue
    console.log(`ceiling sum ${String(lo).padStart(2)}-${String(hi).padStart(2)}: ${String(rows.length).padStart(4)} draws  avg embarrassment shown ${(rows.reduce((s, e) => s + e.embarrassment, 0) / rows.length).toFixed(2)}  accept ${pct(rows.filter((e) => e.accepted).length / rows.length)}`)
  }

  // Global leaderboard: naive vs smoothed, at family level.
  const famScored = score(byFamily, FAMILIES)
  console.log('\n--- family leaderboard: raw accepts vs. smoothed popularity score ---')
  const fmt = (s: Scored) => `${s.key.padEnd(14)} imp ${String(s.agg.impressions).padStart(3)} acc ${String(s.agg.accepts).padStart(3)} comp ${String(s.agg.completes).padStart(3)} shr ${String(s.agg.shares).padStart(3)} leagues ${String(s.agg.leagues.size).padStart(3)}  rate ${pct(s.rate)}  score ${s.score.toFixed(2)}`
  console.log('by smoothed score:')
  for (const s of [...famScored].sort((a, b) => b.score - a.score).slice(0, 8)) console.log('  ' + fmt(s))
  console.log('by raw accept count:')
  for (const s of [...famScored].sort((a, b) => b.naive - a.naive).slice(0, 8)) console.log('  ' + fmt(s))
  console.log('bottom 4 by smoothed score:')
  for (const s of [...famScored].sort((a, b) => a.score - b.score).slice(0, 4)) console.log('  ' + fmt(s))

  // Template-level: how much data is there really?
  const tmplScored = score(byTemplate, TEMPLATES)
  console.log('\n--- template-level leaderboard at this volume ---')
  for (const s of [...tmplScored].sort((a, b) => b.score - a.score).slice(0, 5)) {
    console.log(`  ${s.key.padEnd(46)} imp ${s.agg.impressions} acc ${s.agg.accepts} comp ${s.agg.completes} score ${s.score.toFixed(2)}`)
  }

  // Stability: split-half rank correlation as volume grows.
  console.log('\n--- how much volume before a ranking is trustworthy? (split-half Spearman, top-10 overlap) ---')
  console.log('sessions   templates raw  templates smooth  families raw  families smooth  top10 fam overlap')
  for (const n of [1000, 5000, 20000, 100000]) {
    const big = simulate(n, 1000 + n)
    const shuffled = [...big.events].sort(() => 0.5 - Math.random())
    const half = Math.floor(shuffled.length / 2)
    const A = shuffled.slice(0, half), B = shuffled.slice(half)
    const tA = score(aggregate(A, (e) => e.template), TEMPLATES), tB = score(aggregate(B, (e) => e.template), TEMPLATES)
    const fA = score(aggregate(A, (e) => e.family), FAMILIES), fB = score(aggregate(B, (e) => e.family), FAMILIES)
    const row = [
      spearman(tA.map((s) => s.naive), tB.map((s) => s.naive)),
      spearman(tA.map((s) => s.score), tB.map((s) => s.score)),
      spearman(fA.map((s) => s.naive), fB.map((s) => s.naive)),
      spearman(fA.map((s) => s.score), fB.map((s) => s.score)),
    ]
    const ov = overlap(topSet(fA, (s) => s.score, 5), topSet(fB, (s) => s.score, 5))
    console.log(`${String(n).padStart(8)}   ${row.map((v) => v.toFixed(2).padStart(13)).join('   ')}   ${ov}/5 (top 5)`)
  }

  // Segmentation: train on one half, evaluate on other. Does a per-persona leaderboard beat the global one?
  console.log('\n--- does "leagues like yours" beat the global list? (train/test, 20,000 sessions) ---')
  const big = simulate(20000, 99)
  const shuf = [...big.events].sort(() => 0.5 - Math.random())
  const train = shuf.slice(0, shuf.length / 2), test = shuf.slice(shuf.length / 2)
  const globalTop = topSet(score(aggregate(train, (e) => e.family), FAMILIES), (s) => s.score, 5)
  console.log(`global top 5: ${[...globalTop].join(', ')}`)
  for (const p of PERSONAS) {
    const trainP = train.filter((e) => e.persona === p.name)
    const testP = test.filter((e) => e.persona === p.name)
    const personaTop = topSet(score(aggregate(trainP, (e) => e.family), FAMILIES), (s) => s.score, 5)
    const win = (set: Set<string>) => {
      const rows = testP.filter((e) => set.has(e.family))
      return rows.length ? rows.filter((e) => e.accepted && e.completed).length / rows.length : 0
    }
    console.log(`${p.name.padEnd(15)} global-list accept&complete ${pct(win(globalTop))}   own-list ${pct(win(personaTop))}   overlap ${overlap(globalTop, personaTop)}/5   own top: ${[...personaTop].join(', ')}`)
  }
}

main()
