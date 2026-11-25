export type Intensity = {
  pain: number
  difficulty: number
  embarrassment: number
}

export type IntensityKey = keyof Intensity

export type DeliveryMode = 'in-person' | 'remote' | 'online'

export type Duration = 'quick' | 'errand' | 'week' | 'season'

export type KidSetting = 'around' | 'bedtime'

export type StakeShape = {
  modes: DeliveryMode[]
  ceiling: Intensity
  durations: Duration[]
  kids: KidSetting[]
  winnerPicks: boolean
  /** Friends-only lane: bawdy and crude-pun humor between consenting adults. Never explicit. */
  cheeky?: boolean
  /** Flavors the league wants. Empty or missing means any flavor. */
  categories?: BetCategory[]
}

export type BetCategory =
  | 'cash'
  | 'shame'
  | 'sweat'
  | 'chores'
  | 'social'

export type BetOption = {
  id: string
  label: string
  description: string
  category: BetCategory
  modes: DeliveryMode[]
  duration: Duration
  kids: KidSetting | 'either'
  winnerPicks: boolean
  intensity: Intensity
  /** Only shown when the league opts into the friends-only lane. */
  cheeky?: boolean
}

export type Matchup = {
  you: string
  opponent: string
  week: string
}

export type DesignedBet = {
  matchup: Matchup
  selectedIds: string[]
  modes?: DeliveryMode[]
  ceilings?: Intensity
  durations?: Duration[]
  kids?: KidSetting[]
  winnerPicks?: boolean
  cheeky?: boolean
  categories?: BetCategory[]
  customBets?: DrawnBet[]
}

export type DrawnBet = {
  id: string
  label: string
  description: string
  modes: DeliveryMode[]
  duration?: Duration
  winnerPicks?: boolean
  intensity: Intensity
  /** Coarse bucket for aggregate popularity (model-invented bets never repeat verbatim). */
  category?: BetCategory
  /** Short mechanic tag, e.g. "handwritten apology". Clusters free-form bets for scoring. */
  tag?: string
  /** Friends-only content. Keep out of any public or worldwide popularity list. */
  cheeky?: boolean
}

export type DrawResult = {
  bet: DrawnBet
  source: 'model' | 'catalog'
  configured: boolean
}
