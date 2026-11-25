import type {
  BetCategory,
  BetOption,
  DeliveryMode,
  Duration,
  Intensity,
  IntensityKey,
  KidSetting,
  StakeShape,
} from '../types'

export const CATEGORY_META: Record<
  BetCategory,
  { label: string; blurb: string }
> = {
  cash: {
    label: 'Cash & Covered',
    blurb: 'Money talks. The chat gets the receipt.',
  },
  shame: {
    label: 'Public Shame',
    blurb: 'Sidelines, group chats, and the school pickup line.',
  },
  sweat: {
    label: 'Sweat Equity',
    blurb: 'The body pays, and the league gets the clip.',
  },
  chores: {
    label: 'Chores & Drop-offs',
    blurb: 'Inconvenient, nearby, and photographed for the chat.',
  },
  social: {
    label: 'Texts & the Internet',
    blurb: 'The message itself is the evidence.',
  },
}

export const MODE_META: Record<
  DeliveryMode,
  { label: string; blurb: string }
> = {
  'in-person': {
    label: 'In person',
    blurb: 'Driveways, sidelines, hand-offs',
  },
  remote: {
    label: 'Remote',
    blurb: 'Texts, calls, videos you send',
  },
  online: {
    label: 'Online',
    blurb: 'Group chat and the public internet',
  },
}

export const DURATION_META: Record<
  Duration,
  { label: string; blurb: string }
> = {
  quick: {
    label: 'Quick',
    blurb: 'Under 15 minutes',
  },
  errand: {
    label: 'An errand',
    blurb: 'One drop-off or outing',
  },
  week: {
    label: 'All week',
    blurb: 'It lasts until Sunday',
  },
  season: {
    label: 'Season-long',
    blurb: 'A big mission before the next draft',
  },
}

export const KID_META: Record<KidSetting, { label: string; blurb: string }> = {
  around: {
    label: 'Kids around',
    blurb: 'Fine at practice and pickup',
  },
  bedtime: {
    label: 'After bedtime',
    blurb: 'Once the kids are down',
  },
}

export const ALL_MODES = Object.keys(MODE_META) as DeliveryMode[]
export const ALL_DURATIONS = Object.keys(DURATION_META) as Duration[]
export const ALL_KIDS = Object.keys(KID_META) as KidSetting[]

export const DEFAULT_CEILING: Intensity = {
  pain: 2,
  difficulty: 2,
  embarrassment: 2,
}

export const INTENSITY_DIALS: { key: IntensityKey; label: string }[] = [
  { key: 'pain', label: 'Pain' },
  { key: 'difficulty', label: 'Difficulty' },
  { key: 'embarrassment', label: 'Embarrassment' },
]

export { BET_OPTIONS } from './catalog.ts'

export function intensityLabel(score: number): string {
  if (score <= 0) return 'Chill'
  if (score <= 3) return 'Mild'
  if (score <= 6) return 'Spicy'
  if (score <= 10) return 'Brutal'
  return 'Nuclear'
}

export function betInRange(bet: BetOption, shape: StakeShape): boolean {
  const modeOk = bet.modes.some((mode) => shape.modes.includes(mode))
  const underCeiling =
    bet.intensity.pain <= shape.ceiling.pain &&
    bet.intensity.difficulty <= shape.ceiling.difficulty &&
    bet.intensity.embarrassment <= shape.ceiling.embarrassment
  const durationOk = shape.durations.includes(bet.duration)
  const kidsOk = bet.kids === 'either' || shape.kids.includes(bet.kids)
  const winnerOk = !shape.winnerPicks || bet.winnerPicks
  const toneOk = !bet.cheeky || shape.cheeky === true
  const flavorOk = !shape.categories?.length || shape.categories.includes(bet.category)
  return modeOk && underCeiling && durationOk && kidsOk && winnerOk && toneOk && flavorOk
}
