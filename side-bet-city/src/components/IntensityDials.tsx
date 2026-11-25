import { INTENSITY_DIALS } from '../data/bets'
import type { Intensity, IntensityKey } from '../types'

type Props = {
  value: Intensity
  onChange: (next: Intensity) => void
}

const MAX = 5

export function IntensityDials({ value, onChange }: Props) {
  function setLevel(key: IntensityKey, level: number) {
    const next = Math.min(MAX, Math.max(1, level))
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="dials">
      {INTENSITY_DIALS.map(({ key, label }) => (
        <div key={key} className="dial">
          <div className="dial-meta">
            <span>{label}</span>
            <span className="dial-value">{value[key]} / {MAX}</span>
          </div>
          <div className="dial-controls">
            <button
              type="button"
              className="dial-step"
              aria-label={`Lower ${label}`}
              disabled={value[key] <= 1}
              onClick={() => setLevel(key, value[key] - 1)}
            >
              −
            </button>
            <div className="dial-pips" role="group" aria-label={label}>
              {Array.from({ length: MAX }, (_, index) => {
                const level = index + 1
                const on = level <= value[key]
                return (
                  <button
                    key={level}
                    type="button"
                    className={`dial-pip dial-pip-${key}${on ? ' is-on' : ''}`}
                    aria-label={`${label} ${level}`}
                    aria-pressed={value[key] === level}
                    onClick={() => setLevel(key, level)}
                  />
                )
              })}
            </div>
            <button
              type="button"
              className="dial-step"
              aria-label={`Raise ${label}`}
              disabled={value[key] >= MAX}
              onClick={() => setLevel(key, value[key] + 1)}
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
