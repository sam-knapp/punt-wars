import { intensityLabel } from '../data/bets'
import type { Intensity } from '../types'

type Props = {
  totals: Intensity
}

const METERS: { key: keyof Intensity; label: string }[] = [
  { key: 'pain', label: 'Pain' },
  { key: 'difficulty', label: 'Difficulty' },
  { key: 'embarrassment', label: 'Embarrassment' },
]

const MAX = 15

export function IntensityMeters({ totals }: Props) {
  const composite = totals.pain + totals.difficulty + totals.embarrassment

  return (
    <div className="meters" aria-live="polite">
      <div className="meters-header">
        <span className="meters-kicker">Threat level</span>
        <strong className={`threat threat-${intensityLabel(composite).toLowerCase()}`}>
          {intensityLabel(composite)}
        </strong>
      </div>
      <ul className="meter-list">
        {METERS.map(({ key, label }) => {
          const value = totals[key]
          const pct = Math.min(100, (value / MAX) * 100)
          return (
            <li key={key} className="meter">
              <div className="meter-meta">
                <span>{label}</span>
                <span className="meter-score">{value}</span>
              </div>
              <div
                className="meter-track"
                role="meter"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={MAX}
                aria-valuenow={value}
              >
                <div
                  className={`meter-fill meter-fill-${key}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
