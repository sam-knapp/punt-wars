import { useEffect, useState } from 'react'
import { Dices } from 'lucide-react'
import { DURATION_META, MODE_META } from '../data/bets'
import type { DrawResult, DrawnBet, StakeShape } from '../types'

type Props = {
  shape: StakeShape
  acceptedIds: string[]
  onAccept: (bet: DrawnBet) => void
}

const BALL_WORDS = ['EGGS', 'TEXT', 'COKE', 'KIT', 'BALL', 'LAWN', 'SONG', 'SORRY']
const BALL_COUNT = 7
const SPIN_MS = 2400

export function LotteryDraw({ shape, acceptedIds, onAccept }: Props) {
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'landed'>('idle')
  const [words, setWords] = useState(() => pickWords())
  const [result, setResult] = useState<DrawResult | null>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    if (phase !== 'spinning') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = window.setInterval(() => setWords(pickWords()), 140)
    return () => window.clearInterval(id)
  }, [phase])

  async function draw(remix = false) {
    const canDraw =
      shape.modes.length > 0 && shape.durations.length > 0 && shape.kids.length > 0
    if (!canDraw || phase === 'spinning') return
    setPhase('spinning')
    setError('')
    const started = Date.now()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    try {
      const response = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modes: shape.modes,
          ceilings: shape.ceiling,
          durations: shape.durations,
          kids: shape.kids,
          winnerPicks: shape.winnerPicks,
          cheeky: shape.cheeky === true,
          categories: shape.categories ?? [],
          avoidLabels: history,
          remixOf: remix && result ? result.bet : undefined,
        }),
      })
      if (!response.ok) throw new Error('The draw missed')
      const next = (await response.json()) as DrawResult
      if (!next?.bet?.label) throw new Error('The draw missed')
      setHistory((labels) => [next.bet.label, ...labels].slice(0, 8))
      const wait = Math.max(0, (reduce ? 350 : SPIN_MS) - (Date.now() - started))
      await sleep(wait)
      setResult(next)
      setPhase('landed')
    } catch {
      setPhase(result ? 'landed' : 'idle')
      setError('The draw missed. Try shaking it again.')
    }
  }

  const accepted = result ? acceptedIds.includes(result.bet.id) : false

  return (
    <section className="draw" aria-labelledby="draw-title">
      <div className="filters-copy">
        <h2 id="draw-title">The draw</h2>
        <p className="section-lede">
          Shake the criteria. The balls rattle, then one stake drops.
        </p>
      </div>
      <div
        className={`chamber${phase === 'spinning' ? ' is-spinning' : ''}`}
        aria-hidden={phase !== 'spinning'}
      >
        {words.slice(0, BALL_COUNT).map((word, index) => (
          <span
            key={index}
            className={`ball ball-${index % 3}`}
            style={{ ['--i' as string]: index }}
          >
            {word}
          </span>
        ))}
      </div>
      <div className="draw-actions">
        <button
          type="button"
          className="btn primary"
          onClick={() => draw()}
          disabled={
            phase === 'spinning' ||
            shape.modes.length === 0 ||
            shape.durations.length === 0 ||
            shape.kids.length === 0
          }
        >
          <Dices size={16} />
          {phase === 'spinning' ? 'Drawing…' : result ? 'Draw again' : 'Draw a stake'}
        </button>
        {result && phase === 'landed' && (
          <button
            type="button"
            className="btn"
            onClick={() => draw(true)}
          >
            Remix this stake
          </button>
        )}
      </div>
      {error && <p className="draw-note">{error}</p>}
      {result && phase === 'landed' && (
        <article className="draw-card" aria-live="polite">
          <p className="draw-kicker">
            {result.source === 'model' ? 'Invented for this matchup' : 'Pulled from the board'}
          </p>
          <h3>{result.bet.label}</h3>
          <p>{result.bet.description}</p>
          <div className="bet-toggle-pips">
            {result.bet.modes.map((mode) => (
              <span key={mode} className={`pip pip-${mode}`}>
                {MODE_META[mode].label}
              </span>
            ))}
            {result.bet.duration && (
              <span className="pip">{DURATION_META[result.bet.duration].label}</span>
            )}
            {result.bet.winnerPicks && <span className="pip">Winner picks</span>}
            {result.bet.cheeky && <span className="pip">Friends-only</span>}
            <span className="pip">Pain {result.bet.intensity.pain}</span>
            <span className="pip">Diff {result.bet.intensity.difficulty}</span>
            <span className="pip">Emb {result.bet.intensity.embarrassment}</span>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => onAccept(result.bet)}
            disabled={accepted}
          >
            {accepted ? 'On the slip' : 'Put it on the slip'}
          </button>
          {!result.configured && (
            <p className="draw-note">
              Add an OpenAI key in <code>.env</code> and the next shake can invent a new one.
            </p>
          )}
        </article>
      )}
    </section>
  )
}

function pickWords(): string[] {
  return Array.from({ length: BALL_COUNT }, () => {
    return BALL_WORDS[Math.floor(Math.random() * BALL_WORDS.length)]
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
