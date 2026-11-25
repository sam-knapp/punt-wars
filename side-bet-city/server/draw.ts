import {
  ALL_DURATIONS,
  ALL_KIDS,
  ALL_MODES,
  BET_OPTIONS,
  betInRange,
} from '../src/data/bets.ts'
import type {
  BetCategory,
  BetOption,
  DeliveryMode,
  DrawResult,
  DrawnBet,
  Duration,
  Intensity,
  KidSetting,
  StakeShape,
} from '../src/types.ts'

export type Criteria = {
  shape: StakeShape
  avoidLabels: string[]
  remixOf?: {
    label: string
    description: string
    tag?: string
  }
}

const MODE_SET = new Set<DeliveryMode>(ALL_MODES)
const DURATION_SET = new Set<Duration>(ALL_DURATIONS)
const KID_SET = new Set<KidSetting>(ALL_KIDS)
const CATEGORY_SET = new Set<BetCategory>(['cash', 'shame', 'sweat', 'chores', 'social'])

export const SYSTEM_PROMPT = `You invent one fantasy-football side bet for a league of dads with young kids who live near each other.

Voice: specific, petty, funny, and actually doable before next Sunday. Match these:
- Text each league member individually: "good night, I love you and I'm sorry."
- Hard-boil, peel, and hand-deliver 12 eggs.
- Shotgun a Diet Coke in front of the winner.
- Wear an outfit of the winner's choosing to a kids' sporting event.
- Film 1,000 keepy-uppies with a balloon, no cuts.
- Do a genuine best-effort drawing or painting of the person who won.
- Pay the winner $25.
- Let the winner choose one fantasy transaction next week, such as a waiver pickup or a potentially unfair trade.
- Wear a dress to a farmers market.
- Host a three-hour league car wash at home in an outfit the league chooses.
- Complete an IKEA build and share the proof with the league.
- Give a short, lawful public-comment pitch for a silly civic improvement.

Rules:
- The league is always involved. They watch it happen, each receive a text, or get proof in the group chat: a photo, an uncut video, a screenshot, or a voice note. Say that proof in the description. Never write a bet only the winner sees.
- Kids may be nearby as an audience. They are never participants or the butt of the joke.
- No alcohol, smoking, tobacco, sexual or intimate-content punishments, driving stunts, injuries, choking or dangerous food challenges, self-harm imagery, trespassing, harassment, or anything illegal.
- Do not use a punishment to deceive, manipulate, threaten, or damage a spouse, family member, employer, or stranger relationship.
- Do not collect or reveal private information, including phone numbers, addresses, or identifiable photos of strangers.
- Public-facing punishments require consent, lawful public spaces, no disruption, and a clear opt-out.
- Drinks are soda. Physical stakes stay in the range of push-ups, a cold shower, or a silly performance.
- Invent a genuinely new stake. The examples and the "inspiration" list only show the league's taste: scale, pettiness, and doability. Do not copy them, lightly reskin them, or reuse their core mechanic (no more eggs, outfits, or goodnight texts unless that is the twist). Follow the "twist" and "lean" the user message gives you.
- Categories: cash means money is paid or spent as the core of the stake; shame means embarrassment or a silly public-facing act; sweat means physical effort; chores means useful work gets done; social means interaction, performance, or messages for the league. If "requiredCategories" is not null, the stake must truly belong to one of those categories (the money, effort, work, or embarrassment is the point, not decoration) and category must be one of them.
- If "remixOf" is present, preserve the appealing core of that stake but invent a meaningfully different mechanic, setting, or execution. Do not paraphrase it or make a cosmetic change. Keep all selected chips and required categories.
- Obey the maximum pain, difficulty, and embarrassment scores. 1 is a text or a coffee. 5 is a school-pickup costume, a peeled dozen, or 1,000 balloon touches.
- Use the headroom. The maximums are what the league said it will tolerate, so land close to them instead of playing it safe. When any maximum is 2 or higher, at least one score must equal its maximum, and the scores should total at least 60% of the maximums combined. A stake that is truly mild belongs at low maximums only. Score honestly: the numbers describe how the stake really feels, so never pad a score and never exceed a maximum.
- Use only the delivery modes, durations, and kid settings you are given.
- Duration quick is under 15 minutes, errand is one drop-off or outing, week lasts until next Sunday, season is a larger mission completed before the next draft.
- If winnerFillsIn is true, the winner chooses a concrete blank (outfit, lines, order, costume, or photo) and the description says so.

Return JSON with keys label, description, modes, duration, pain, difficulty, embarrassment, category, tag.
label is under 42 characters. description is one or two sentences starting with "Loser" and includes the proof.
modes is an array using only in-person, remote, online.
duration is quick, errand, week, or season.
pain, difficulty, and embarrassment are integers from 1 to 5 and must not exceed the maximums.
category is one of cash, shame, sweat, chores, social.
tag is two to four lowercase words naming the core mechanic, such as "handwritten apology" or "neighborhood scavenger hunt".`

type ModelOptions = { apiKey: string; model: string; baseUrl?: string }

const ATTEMPTS = 2

// Random angles so repeated draws with identical dials do not collapse to the same idea.
const TWISTS = [
  'something that happens at a grocery store or hardware store',
  'a handwritten or hand-made object delivered to the winner',
  'a short performance for the league (a speech, a toast, a reading, a song)',
  'a rule the loser must follow for a stretch of time, proven with check-ins',
  'a tiny awkward ceremony the winner presides over',
  'a skill the loser is bad at, practiced on camera',
  'a neighborhood landmark, park, or street',
  'an item the loser wears or carries around all day',
  'a task done for the winner, in the winner\'s style',
  'a ranking, list, or review the loser must publish to the league',
  'a mini competition or dare against the clock',
  'a delivery to each league member\'s doorstep',
  'a confession, apology, or compliment in an unexpectedly formal format',
  'a weird phrase or voice the loser must use for a while',
  'a craft or build project',
  'a small bit of public-space silliness that is lawful, brief, and easy to opt out of',
]

const LEANS: BetCategory[] = ['cash', 'shame', 'sweat', 'chores', 'social']

// Belt and suspenders: the prompt forbids these, but free-form text needs a hard check too.
const DENY_SHARED =
  "alcohol|beer|wine|liquor|vodka|whiskey|tequila|drunk|cigarettes?|smok\\w*|vap\\w*|tobacco|cannabis|weed|drugs?|nude|naked|onlyfans|condoms?|wax\\w*|porn\\w*|erotic\\w*|striptease|stripper|undress\\w*|lingerie|trespass\\w*|break in|driving|choke\\w*|self-harm|blood|stranger'?s? (phone|address|number)"
const DENY = new RegExp(`\\b(${DENY_SHARED}|sex\\w*)\\b`, 'i')
// Friends-only mode allows "sexy", "sultry", and innuendo, but not sex itself or anything explicit.
const DENY_CHEEKY = new RegExp(`\\b(${DENY_SHARED}|sex|sexual\\w*|sext\\w*)\\b`, 'i')

const CHEEKY_ADDENDUM = `

FRIENDS-ONLY MODE is on. Every member of this league is a consenting adult who opted in to bawdy humor with close friends. Make this stake cheeky: innuendo, crude-but-clever puns, sultry or romantic parody, fully clothed thirst-trap parody, cringe flirting confessions, over-the-top trash talk, or awkward dad-bod theatrics. Raunchy means the joke is risqué, not that anything is explicit.
This mode loosens the tone only. Still never: nudity, undressing, or anything implying it; sexual acts, touching, toys, or products; sexual content about or involving a spouse, partner, kids, or any third party; messaging, tricking, or involving anyone outside the league; public indecency; making someone's body, looks, or identity the butt of the joke. Keep everything PG-13 on camera, and every rule above still applies.
Unless "requiredCategories" says otherwise, set category to shame or social. Aim for embarrassment 3 or higher when the maximum allows it.`

function systemPrompt(criteria: { shape: { cheeky?: boolean } }): string {
  return criteria.shape.cheeky ? SYSTEM_PROMPT + CHEEKY_ADDENDUM : SYSTEM_PROMPT
}

export async function drawStake(
  input: unknown,
  options: ModelOptions,
): Promise<DrawResult> {
  const criteria = parseCriteria(input)
  const configured = options.apiKey.trim().length > 0

  if (!configured) {
    return { bet: fromCatalog(criteria), source: 'catalog', configured: false }
  }

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      // First attempt insists on using the headroom; the retry only insists on staying under it.
      const invented = await askModel(criteria, options, attempt === 0)
      if (invented) {
        return { bet: invented, source: 'model', configured: true }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'model request failed'
      console.error(`Draw model failed (attempt ${attempt + 1}): ${message}`)
    }
  }

  return { bet: fromCatalog(criteria), source: 'catalog', configured: true }
}

const FAMILY_RE = /^(.*)-(in-person|remote|online)-(quick|errand|week|season)-(around|bedtime)-(winner|set)$/

/** One catalog example per idea (not per variant), so every idea is equally likely to inspire. */
function inspirations(criteria: Criteria, count: number): string[] {
  const byFamily = new Map<string, BetOption[]>()
  for (const bet of BET_OPTIONS) {
    // Taste examples ignore the flavor filter so a narrow flavor still sees varied examples.
    if (!betInRange(bet, { ...criteria.shape, winnerPicks: false, categories: undefined })) continue
    const family = FAMILY_RE.exec(bet.id)?.[1] ?? bet.id
    byFamily.set(family, [...(byFamily.get(family) ?? []), bet])
  }
  const shuffled = shuffle([...byFamily.values()])
  // When flavors are chosen, lead with up to two examples of that flavor.
  const wanted = criteria.shape.categories ?? []
  const matching = wanted.length
    ? shuffled.filter((variants) => wanted.includes(variants[0].category)).slice(0, 2)
    : []
  const families = [...matching, ...shuffled.filter((variants) => !matching.includes(variants))]
  // Friends-only draws take half their inspiration from the cheeky lane so the tone carries.
  const cheekyFamilies = families.filter((variants) => variants[0].cheeky)
  const regularFamilies = families.filter((variants) => !variants[0].cheeky)
  const chosen = criteria.shape.cheeky
    ? [...cheekyFamilies.slice(0, Math.ceil(count / 2)), ...regularFamilies].slice(0, count)
    : regularFamilies.slice(0, count)
  return chosen
    .map((variants) => variants[Math.floor(Math.random() * variants.length)])
    .map((bet) => `${bet.label}: ${bet.description}`)
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const pickOne = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

export function parseCriteria(input: unknown): Criteria {
  const body = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const requested = Array.isArray(body.modes)
    ? body.modes.filter((mode): mode is DeliveryMode => MODE_SET.has(mode as DeliveryMode))
    : []
  const rawCeiling =
    body.ceilings && typeof body.ceilings === 'object'
      ? (body.ceilings as Record<string, unknown>)
      : {}

  const durations = Array.isArray(body.durations)
    ? body.durations.filter((item): item is Duration => DURATION_SET.has(item as Duration))
    : []
  const kids = Array.isArray(body.kids)
    ? body.kids.filter((item): item is KidSetting => KID_SET.has(item as KidSetting))
    : []

  return {
    shape: {
      modes: requested.length ? requested : [...ALL_MODES],
      ceiling: {
        pain: clampScore(rawCeiling.pain, 5),
        difficulty: clampScore(rawCeiling.difficulty, 5),
        embarrassment: clampScore(rawCeiling.embarrassment, 5),
      },
      durations: durations.length ? durations : [...ALL_DURATIONS],
      kids: kids.length ? kids : [...ALL_KIDS],
      winnerPicks: body.winnerPicks === true,
      cheeky: body.cheeky === true,
      categories: Array.isArray(body.categories)
        ? [...new Set(body.categories.filter((item): item is BetCategory => CATEGORY_SET.has(item as BetCategory)))]
        : [],
    },
    avoidLabels: Array.isArray(body.avoidLabels)
      ? body.avoidLabels.filter((label): label is string => typeof label === 'string').slice(0, 8)
      : [],
    remixOf:
      body.remixOf && typeof body.remixOf === 'object'
        ? {
            label: cleanText((body.remixOf as Record<string, unknown>).label, 42),
            description: cleanText((body.remixOf as Record<string, unknown>).description, 280),
            tag: cleanText((body.remixOf as Record<string, unknown>).tag, 40),
          }
        : undefined,
  }
}

function fromCatalog(criteria: Criteria): DrawnBet {
  const pool = candidatePool(criteria)
  const fresh = pool.filter((bet) => !criteria.avoidLabels.includes(bet.label))
  const choices = fresh.length ? fresh : pool
  const bet = choices[Math.floor(Math.random() * choices.length)]
  const modes = bet.modes.filter((mode) => criteria.shape.modes.includes(mode))
  return {
    id: bet.id,
    label: bet.label,
    description: bet.description,
    modes: modes.length ? modes : bet.modes,
    duration: bet.duration,
    winnerPicks: bet.winnerPicks,
    intensity: bet.intensity,
    category: bet.category,
    cheeky: bet.cheeky,
  }
}

function candidatePool(criteria: Criteria) {
  const exact = BET_OPTIONS.filter((bet) => betInRange(bet, criteria.shape))
  const openCeiling: Intensity = { pain: 5, difficulty: 5, embarrassment: 5 }
  if (criteria.shape.cheeky) {
    // In friends-only mode, a fallback draw should still be a cheeky one when any fit.
    const cheeky = exact.filter((bet) => bet.cheeky)
    if (cheeky.length) return cheeky
    const relaxedCheeky = BET_OPTIONS.filter(
      (bet) => bet.cheeky && betInRange(bet, { ...criteria.shape, ceiling: openCeiling }),
    )
    if (relaxedCheeky.length) return relaxedCheeky
  }
  if (exact.length) return exact
  const relaxed = BET_OPTIONS.filter((bet) =>
    betInRange(bet, { ...criteria.shape, ceiling: openCeiling }),
  )
  if (relaxed.length) return relaxed
  const winnerOnly = BET_OPTIONS.filter((bet) => !criteria.shape.winnerPicks || bet.winnerPicks)
  return winnerOnly.length ? winnerOnly : BET_OPTIONS
}

/** The per-draw request: dials plus random inspiration, twist, and lean. */
export function buildUserMessage(criteria: Criteria) {
  return {
    modes: criteria.shape.modes,
    durations: criteria.shape.durations,
    kids: criteria.shape.kids,
    winnerFillsIn: criteria.shape.winnerPicks,
    friendsOnly: criteria.shape.cheeky === true,
    maxPain: criteria.shape.ceiling.pain,
    maxDifficulty: criteria.shape.ceiling.difficulty,
    maxEmbarrassment: criteria.shape.ceiling.embarrassment,
    inspiration: inspirations(criteria, 4),
    twist: pickOne(TWISTS),
    requiredCategories: criteria.shape.categories?.length ? criteria.shape.categories : null,
    lean: pickOne(criteria.shape.categories?.length ? criteria.shape.categories : LEANS),
    remixOf: criteria.remixOf ?? null,
    doNotRepeat: criteria.avoidLabels,
  }
}

async function askModel(
  criteria: Criteria,
  options: ModelOptions,
  requireHeadroom: boolean,
): Promise<DrawnBet | null> {
  const base = (options.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      temperature: 1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt(criteria) },
        {
          role: 'user',
          content: JSON.stringify(buildUserMessage(criteria)),
        },
      ],
    }),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`OpenAI responded ${response.status}`)
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = payload.choices?.[0]?.message?.content
  if (!content) return null
  return normalizeModelBet(JSON.parse(content) as unknown, criteria, { requireHeadroom })
}

export function normalizeModelBet(
  value: unknown,
  criteria: Criteria,
  check: { requireHeadroom?: boolean } = {},
): DrawnBet | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const label = cleanText(raw.label, 42)
  let description = cleanText(raw.description, 280)
  if (label.length < 3 || description.length < 12) return null
  // Only patch descriptions that never mention the loser; "For one week, Loser ..." is fine as is.
  if (!/\bLoser\b/.test(description)) {
    description = `Loser: ${description}`
  }
  description = ensureLeagueProof(description)
  if (criteria.shape.winnerPicks && !/winner/i.test(description)) return null

  const modes = (Array.isArray(raw.modes) ? raw.modes : [])
    .filter((mode): mode is DeliveryMode => MODE_SET.has(mode as DeliveryMode))
    .filter((mode) => criteria.shape.modes.includes(mode))
  if (modes.length === 0) return null

  const banned = criteria.shape.cheeky ? DENY_CHEEKY : DENY
  if (banned.test(`${label} ${description}`)) return null
  if (criteria.avoidLabels.some((avoid) => avoid.toLowerCase() === label.toLowerCase())) return null

  // Free-form output must actually respect the dials. Reject (and retry) rather than relabel.
  if (!DURATION_SET.has(raw.duration as Duration)) return null
  const duration = raw.duration as Duration
  if (!criteria.shape.durations.includes(duration)) return null

  const pain = strictScore(raw.pain, criteria.shape.ceiling.pain)
  const difficulty = strictScore(raw.difficulty, criteria.shape.ceiling.difficulty)
  const embarrassment = strictScore(raw.embarrassment, criteria.shape.ceiling.embarrassment)
  if (pain === null || difficulty === null || embarrassment === null) return null
  if (check.requireHeadroom && !usesHeadroom({ pain, difficulty, embarrassment }, criteria.shape.ceiling)) {
    return null
  }

  const category = CATEGORY_SET.has(raw.category as BetCategory)
    ? (raw.category as BetCategory)
    : undefined
  // A flavor the league asked for is a requirement, not a hint.
  const wantedFlavors = criteria.shape.categories ?? []
  if (wantedFlavors.length && (!category || !wantedFlavors.includes(category))) return null
  const tag = cleanText(raw.tag, 40).toLowerCase()

  return {
    id: `draw-${crypto.randomUUID()}`,
    label,
    description,
    modes,
    duration,
    winnerPicks: criteria.shape.winnerPicks,
    intensity: { pain, difficulty, embarrassment },
    category,
    tag: tag.length >= 3 ? tag : undefined,
    cheeky: criteria.shape.cheeky ? true : undefined,
  }
}

/** "Go near the ceiling": one score at its maximum, and at least 60% of the combined maximums. */
export function usesHeadroom(score: Intensity, ceiling: Intensity): boolean {
  const keys = ['pain', 'difficulty', 'embarrassment'] as const
  if (Math.max(...keys.map((key) => ceiling[key])) < 2) return true
  const touchesCeiling = keys.some((key) => ceiling[key] >= 2 && score[key] === ceiling[key])
  const total = keys.reduce((sum, key) => sum + score[key], 0)
  const room = keys.reduce((sum, key) => sum + ceiling[key], 0)
  return touchesCeiling && total >= room * 0.6
}

function strictScore(value: unknown, max: number): number | null {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return null
  const rounded = Math.round(numeric)
  return rounded >= 1 && rounded <= max ? rounded : null
}

function ensureLeagueProof(description: string): string {
  if (/league chat|group chat|those texts|screenshot|video|photo|voice note/i.test(description)) {
    return description
  }
  const extra = ' Proof goes in the league chat.'
  return `${description}${extra}`.slice(0, 280)
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function clampScore(value: unknown, max: number): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return 1
  return Math.min(Math.max(1, max), Math.max(1, Math.round(numeric)))
}
