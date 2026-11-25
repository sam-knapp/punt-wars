import { DURATION_META, MODE_META } from '../data/bets'
import type { BetOption } from '../types'

type Props = {
  option: BetOption
  checked: boolean
  onToggle: (id: string) => void
}

export function BetToggle({ option, checked, onToggle }: Props) {
  return (
    <button
      type="button"
      className={`bet-toggle${checked ? ' is-on' : ''}`}
      aria-pressed={checked}
      onClick={() => onToggle(option.id)}
    >
      <span className="bet-toggle-switch" aria-hidden="true">
        <span className="bet-toggle-knob" />
      </span>
      <span className="bet-toggle-copy">
        <span className="bet-toggle-label">{option.label}</span>
        <span className="bet-toggle-desc">{option.description}</span>
        <span className="bet-toggle-pips">
          {option.modes.map((mode) => (
            <span key={mode} className={`pip pip-${mode}`}>
              {MODE_META[mode].label}
            </span>
          ))}
          <span className="pip">{DURATION_META[option.duration].label}</span>
          {option.winnerPicks && <span className="pip">Winner picks</span>}
          <span className="pip" title="Pain">
            Pain {option.intensity.pain}
          </span>
          <span className="pip" title="Difficulty">
            Diff {option.intensity.difficulty}
          </span>
          <span className="pip" title="Embarrassment">
            Emb {option.intensity.embarrassment}
          </span>
        </span>
      </span>
    </button>
  )
}
