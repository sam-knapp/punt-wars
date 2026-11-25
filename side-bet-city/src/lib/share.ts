import type { DesignedBet, DrawnBet } from '../types'

export function encodeBet(bet: DesignedBet): string {
  const payload = JSON.stringify(bet)
  return btoa(unescape(encodeURIComponent(payload)))
}

export function decodeBet(hash: string): DesignedBet | null {
  try {
    const raw = decodeURIComponent(escape(atob(hash)))
    const parsed = JSON.parse(raw) as DesignedBet
    if (!parsed?.matchup || !Array.isArray(parsed.selectedIds)) return null
    if (Array.isArray(parsed.customBets)) {
      parsed.customBets = parsed.customBets.filter(isDrawnBet)
    }
    return parsed
  } catch {
    return null
  }
}

export function buildShareUrl(bet: DesignedBet): string {
  const encoded = encodeBet(bet)
  const url = new URL(window.location.href)
  url.hash = `bet=${encoded}`
  return url.toString()
}

export function formatBetSlipText(
  you: string,
  opponent: string,
  week: string,
  stakesList: { label: string; description: string }[],
): string {
  const stakes =
    stakesList.length === 0
      ? '(no stakes selected yet)'
      : stakesList
          .map((stake, i) => `${i + 1}. ${stake.label} — ${stake.description}`)
          .join('\n')

  return [
    '🏈 SIDE BET CITY',
    `Week ${week || '?'} — ${you || 'You'} vs ${opponent || 'Opponent'}`,
    '',
    'Stakes:',
    stakes,
    '',
    'Loser pays. Winner gloats.',
  ].join('\n')
}

function isDrawnBet(value: unknown): value is DrawnBet {
  if (!value || typeof value !== 'object') return false
  const bet = value as DrawnBet
  return (
    typeof bet.id === 'string' &&
    typeof bet.label === 'string' &&
    typeof bet.description === 'string' &&
    Array.isArray(bet.modes) &&
    typeof bet.intensity?.pain === 'number'
  )
}
