import type { BetOption } from '../types'

// Friends-only lane. Bawdy, crude-pun, cringe-flirting, thirst-trap-parody humor between
// consenting adults. Everything stays fully clothed and PG-13 on camera. No nudity, no sexual
// acts, no one outside the league involved. Hidden unless the league flips the lane on.

type Cheeky = Omit<BetOption, 'cheeky' | 'id'> & { key: string }

const ENTRIES: Cheeky[] = [
  {
    key: 'sultry-roster',
    label: 'Sultry roster reading, after bedtime',
    description:
      'Loser records a 60-second slow-jazz voice note reading the winner’s roster aloud like love poetry, as breathy and sincere as he can manage. It goes straight to the league chat.',
    category: 'social',
    modes: ['remote', 'online'],
    duration: 'quick',
    kids: 'bedtime',
    winnerPicks: false,
    intensity: { pain: 1, difficulty: 1, embarrassment: 4 },
  },
  {
    key: 'dating-bio',
    label: 'Winner’s fake dating bio, read straight',
    description:
      'Winner writes a dating-app bio for Loser. Loser reads it aloud in one uncut video with a straight face, and the video goes in the league chat. It is never posted anywhere else.',
    category: 'shame',
    modes: ['remote'],
    duration: 'quick',
    kids: 'bedtime',
    winnerPicks: true,
    intensity: { pain: 1, difficulty: 1, embarrassment: 4 },
  },
  {
    key: 'slow-jam',
    label: 'Slow-jam lip sync, full eye contact',
    description:
      'Loser lip-syncs a slow jam to the camera for 90 seconds with maximum eye contact and no smiling, fully clothed. The uncut video goes in the league chat.',
    category: 'shame',
    modes: ['remote'],
    duration: 'quick',
    kids: 'bedtime',
    winnerPicks: false,
    intensity: { pain: 1, difficulty: 1, embarrassment: 5 },
  },
  {
    key: 'thirst-trap',
    label: 'Fully clothed thirst trap',
    description:
      'Loser takes a deliberately ridiculous thirst-trap photo: oversized sweater, dramatic flex, soulful stare. The league rates it out of 10 in the league chat.',
    category: 'social',
    modes: ['online', 'remote'],
    duration: 'quick',
    kids: 'either',
    winnerPicks: false,
    intensity: { pain: 1, difficulty: 1, embarrassment: 4 },
  },
  {
    key: 'roast-reading',
    label: 'Winner’s roast, read with feeling',
    description:
      'Winner writes five lines of trash talk about Loser, and Loser reads them aloud with real feeling in one uncut video. The video goes in the league chat.',
    category: 'shame',
    modes: ['remote'],
    duration: 'quick',
    kids: 'either',
    winnerPicks: true,
    intensity: { pain: 1, difficulty: 1, embarrassment: 4 },
  },
  {
    key: 'cringe-hour',
    label: 'Cringe flirting confession',
    description:
      'On a late video call, Loser tells the league his most cringe flirting story in full, sound effects included. The winner holds a stopwatch and can demand more details, and the call is the proof.',
    category: 'social',
    modes: ['remote'],
    duration: 'quick',
    kids: 'bedtime',
    winnerPicks: false,
    intensity: { pain: 1, difficulty: 2, embarrassment: 4 },
  },
  {
    key: 'breakup-letter',
    label: 'Breakup letter to a benched player',
    description:
      'Loser reads a tearful soap-opera breakup letter to the player who burned him this week, in one uncut video. The video goes in the league chat.',
    category: 'shame',
    modes: ['remote'],
    duration: 'quick',
    kids: 'either',
    winnerPicks: false,
    intensity: { pain: 1, difficulty: 2, embarrassment: 3 },
  },
  {
    key: 'calendar-pose',
    label: 'Mr. Week 12, dad calendar pose',
    description:
      'A leaguemate shoots Loser in a fully clothed dad-calendar pose holding a rotisserie chicken, with moody lighting and a month caption. The photo goes in the league chat.',
    category: 'shame',
    modes: ['in-person'],
    duration: 'errand',
    kids: 'either',
    winnerPicks: false,
    intensity: { pain: 1, difficulty: 2, embarrassment: 4 },
  },
  {
    key: 'romance-cover',
    label: 'Romance novel cover shoot',
    description:
      'Winner picks the title and the fully clothed costume. A leaguemate shoots Loser on a windswept romance-novel cover pose, and the photo goes in the league chat.',
    category: 'shame',
    modes: ['in-person'],
    duration: 'errand',
    kids: 'either',
    winnerPicks: true,
    intensity: { pain: 1, difficulty: 2, embarrassment: 4 },
  },
  {
    key: 'pun-shirt-errand',
    label: 'Winner’s pun tee, one grocery run',
    description:
      'Winner picks a crude-pun T-shirt under $20 and keeps it PG-13. Loser wears it for one grocery run, and a selfie in the cereal aisle goes in the league chat.',
    category: 'shame',
    modes: ['in-person'],
    duration: 'errand',
    kids: 'bedtime',
    winnerPicks: true,
    intensity: { pain: 1, difficulty: 1, embarrassment: 4 },
  },
  {
    key: 'pickup-lines',
    label: 'Worst pickup line of the day',
    description:
      'All week, Loser posts his single worst pickup line in the league chat each morning, a little worse every day. The winner rates the set out of 10 on Sunday with a screenshot.',
    category: 'social',
    modes: ['online', 'remote'],
    duration: 'week',
    kids: 'either',
    winnerPicks: false,
    intensity: { pain: 1, difficulty: 2, embarrassment: 3 },
  },
  {
    key: 'pun-shirt-draft',
    label: 'Pun tee at the draft',
    description:
      'Winner picks a crude-pun T-shirt under $20, kept PG-13. Loser wears it all draft night, and the league photographs it.',
    category: 'shame',
    modes: ['in-person'],
    duration: 'season',
    kids: 'bedtime',
    winnerPicks: true,
    intensity: { pain: 1, difficulty: 1, embarrassment: 5 },
  },
  {
    key: 'dad-calendar',
    label: 'Season-long dad calendar',
    description:
      'Before the next draft, Loser stages twelve fully clothed dad-calendar poses with a leaguemate photographer. He prints a calendar for every league member, and photos of each month go in the league chat.',
    category: 'shame',
    modes: ['in-person'],
    duration: 'season',
    kids: 'either',
    winnerPicks: false,
    intensity: { pain: 1, difficulty: 4, embarrassment: 4 },
  },
]

export const CHEEKY_OPTIONS: BetOption[] = ENTRIES.map(({ key, ...bet }) => ({
  ...bet,
  id: `cheeky-${key}`,
  cheeky: true,
}))
