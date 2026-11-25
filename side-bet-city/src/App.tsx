import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Link2, RotateCcw } from 'lucide-react'
import { BetToggle } from './components/BetToggle'
import { IntensityDials } from './components/IntensityDials'
import { IntensityMeters } from './components/IntensityMeters'
import { LotteryDraw } from './components/LotteryDraw'
import {
  ALL_DURATIONS,
  ALL_KIDS,
  ALL_MODES,
  BET_OPTIONS,
  CATEGORY_META,
  DEFAULT_CEILING,
  DURATION_META,
  KID_META,
  MODE_META,
  betInRange,
} from './data/bets'
import { buildShareUrl, decodeBet, formatBetSlipText } from './lib/share'
import type {
  BetCategory,
  DeliveryMode,
  DrawnBet,
  Duration,
  Intensity,
  KidSetting,
  Matchup,
  StakeShape,
} from './types'
import './App.css'

const EMPTY_MATCHUP: Matchup = { you: '', opponent: '', week: '' }
const CATEGORIES = Object.keys(CATEGORY_META) as BetCategory[]

const ZERO: Intensity = { pain: 0, difficulty: 0, embarrassment: 0 }

function addIntensity(acc: Intensity, next: Intensity): Intensity {
  return {
    pain: acc.pain + next.pain,
    difficulty: acc.difficulty + next.difficulty,
    embarrassment: acc.embarrassment + next.embarrassment,
  }
}

export default function App() {
  const [matchup, setMatchup] = useState<Matchup>(EMPTY_MATCHUP)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [modes, setModes] = useState<DeliveryMode[]>(ALL_MODES)
  const [durations, setDurations] = useState<Duration[]>(ALL_DURATIONS)
  const [kids, setKids] = useState<KidSetting[]>(ALL_KIDS)
  const [winnerPicks, setWinnerPicks] = useState(false)
  const [cheeky, setCheeky] = useState(false)
  const [flavors, setFlavors] = useState<BetCategory[]>([])
  const [ceilings, setCeilings] = useState<Intensity>(DEFAULT_CEILING)
  const [customBets, setCustomBets] = useState<DrawnBet[]>([])
  const [copied, setCopied] = useState<'link' | 'text' | null>(null)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash.startsWith('bet=')) return
    const loaded = decodeBet(hash.slice(4))
    if (!loaded) return
    setMatchup(loaded.matchup)
    setSelectedIds(loaded.selectedIds)
    if (loaded.modes?.length) setModes(loaded.modes)
    if (loaded.durations?.length) {
      setDurations(loaded.durations.filter((item) => ALL_DURATIONS.includes(item)))
    }
    if (loaded.kids?.length) {
      setKids(loaded.kids.filter((item) => ALL_KIDS.includes(item)))
    }
    if (typeof loaded.winnerPicks === 'boolean') setWinnerPicks(loaded.winnerPicks)
    if (typeof loaded.cheeky === 'boolean') setCheeky(loaded.cheeky)
    if (loaded.categories?.length) {
      setFlavors(loaded.categories.filter((item) => CATEGORIES.includes(item)))
    }
    if (loaded.ceilings) setCeilings(loaded.ceilings)
    if (loaded.customBets?.length) setCustomBets(loaded.customBets)
    setEntered(true)
  }, [])

  const selectedBets = useMemo(
    () =>
      selectedIds
        .map((id) => BET_OPTIONS.find((b) => b.id === id))
        .filter((bet): bet is (typeof BET_OPTIONS)[number] => Boolean(bet)),
    [selectedIds],
  )
  const slipBets = useMemo(
    () => [...selectedBets, ...customBets],
    [selectedBets, customBets],
  )
  const totals = useMemo(
    () => slipBets.reduce((acc, bet) => addIntensity(acc, bet.intensity), ZERO),
    [slipBets],
  )

  const shape = useMemo<StakeShape>(
    () => ({
      modes,
      ceiling: ceilings,
      durations,
      kids,
      winnerPicks,
      cheeky,
      categories: flavors,
    }),
    [modes, ceilings, durations, kids, winnerPicks, cheeky, flavors],
  )

  const visibleCount = useMemo(
    () => BET_OPTIONS.filter((bet) => betInRange(bet, shape)).length,
    [shape],
  )

  function toggleBet(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function toggleMode(mode: DeliveryMode) {
    setModes((prev) =>
      prev.includes(mode) ? prev.filter((item) => item !== mode) : [...prev, mode],
    )
  }

  function toggleDuration(duration: Duration) {
    setDurations((prev) =>
      prev.includes(duration) ? prev.filter((item) => item !== duration) : [...prev, duration],
    )
  }

  function toggleKid(setting: KidSetting) {
    setKids((prev) =>
      prev.includes(setting) ? prev.filter((item) => item !== setting) : [...prev, setting],
    )
  }

  function toggleFlavor(category: BetCategory) {
    setFlavors((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category],
    )
  }

  function acceptDraw(bet: DrawnBet) {
    if (BET_OPTIONS.some((option) => option.id === bet.id)) {
      setSelectedIds((prev) => (prev.includes(bet.id) ? prev : [...prev, bet.id]))
      return
    }
    setCustomBets((prev) => (prev.some((item) => item.id === bet.id) ? prev : [...prev, bet]))
  }

  function reset() {
    setSelectedIds([])
    setCustomBets([])
    setMatchup(EMPTY_MATCHUP)
    setModes(ALL_MODES)
    setDurations(ALL_DURATIONS)
    setKids(ALL_KIDS)
    setWinnerPicks(false)
    setCheeky(false)
    setFlavors([])
    setCeilings(DEFAULT_CEILING)
    setCopied(null)
    window.history.replaceState(null, '', window.location.pathname)
  }

  async function copyLink() {
    const url = buildShareUrl({
      matchup,
      selectedIds,
      modes,
      ceilings,
      durations,
      kids,
      winnerPicks,
      cheeky,
      categories: flavors,
      customBets,
    })
    await navigator.clipboard.writeText(url)
    window.history.replaceState(null, '', `#bet=${url.split('#bet=')[1]}`)
    setCopied('link')
    window.setTimeout(() => setCopied(null), 2000)
  }

  async function copyText() {
    const text = formatBetSlipText(
      matchup.you,
      matchup.opponent,
      matchup.week,
      slipBets,
    )
    await navigator.clipboard.writeText(text)
    setCopied('text')
    window.setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="app">
      <div className="skyline" aria-hidden="true" />

      <header className={`hero${entered ? ' hero-compact' : ''}`}>
        <p className="brand">Side Bet City</p>
        <h1 className="headline">Design the stakes. Survive the week.</h1>
        <p className="lede">
          Pick how the loser pays — in person, remote, or online — then turn
          up pain, difficulty, and embarrassment until the stake feels right.
        </p>
        {!entered ? (
          <button
            type="button"
            className="cta"
            onClick={() => setEntered(true)}
          >
            Open the board
          </button>
        ) : (
          <a className="cta cta-ghost" href="#designer">
            Jump to designer
          </a>
        )}
      </header>

      {entered && (
        <main id="designer" className="board">
          <section className="matchup" aria-labelledby="matchup-title">
            <h2 id="matchup-title">This week’s matchup</h2>
            <p className="section-lede">Who’s on the hook?</p>
            <div className="matchup-fields">
              <label>
                You
                <input
                  type="text"
                  placeholder="Your team"
                  value={matchup.you}
                  onChange={(e) =>
                    setMatchup((m) => ({ ...m, you: e.target.value }))
                  }
                />
              </label>
              <span className="vs" aria-hidden="true">
                VS
              </span>
              <label>
                Opponent
                <input
                  type="text"
                  placeholder="Their team"
                  value={matchup.opponent}
                  onChange={(e) =>
                    setMatchup((m) => ({ ...m, opponent: e.target.value }))
                  }
                />
              </label>
              <label className="week-field">
                Week
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="12"
                  value={matchup.week}
                  onChange={(e) =>
                    setMatchup((m) => ({ ...m, week: e.target.value }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="filters" aria-labelledby="filters-title">
            <div className="filters-copy">
              <h2 id="filters-title">What kind of punishment</h2>
              <p className="section-lede">
                {visibleCount} of {BET_OPTIONS.filter((bet) => cheeky || !bet.cheeky).length}{' '}
                stakes match. The league
                sees every one, or the proof lands in the chat.
              </p>
            </div>
            <div className="mode-row" role="group" aria-label="How it gets done">
              {ALL_MODES.map((mode) => {
                const on = modes.includes(mode)
                return (
                  <button
                    key={mode}
                    type="button"
                    className={`mode-chip${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleMode(mode)}
                  >
                    <span>{MODE_META[mode].label}</span>
                    <small>{MODE_META[mode].blurb}</small>
                  </button>
                )
              })}
            </div>
            <div className="choice-block">
              <span className="choice-label">How long it takes</span>
              <div className="choice-grid" role="group" aria-label="How long it takes">
                {ALL_DURATIONS.map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    className={`mode-chip${durations.includes(duration) ? ' is-on' : ''}`}
                    aria-pressed={durations.includes(duration)}
                    onClick={() => toggleDuration(duration)}
                  >
                    <span>{DURATION_META[duration].label}</span>
                    <small>{DURATION_META[duration].blurb}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="choice-block">
              <span className="choice-label">Who can be around, and who writes it</span>
              <div className="choice-grid" role="group" aria-label="Kids and winner details">
                {ALL_KIDS.map((setting) => (
                  <button
                    key={setting}
                    type="button"
                    className={`mode-chip${kids.includes(setting) ? ' is-on' : ''}`}
                    aria-pressed={kids.includes(setting)}
                    onClick={() => toggleKid(setting)}
                  >
                    <span>{KID_META[setting].label}</span>
                    <small>{KID_META[setting].blurb}</small>
                  </button>
                ))}
                <button
                  type="button"
                  className={`mode-chip${winnerPicks ? ' is-on' : ''}`}
                  aria-pressed={winnerPicks}
                  onClick={() => setWinnerPicks((on) => !on)}
                >
                  <span>Winner fills it in</span>
                  <small>Outfit, lines, or the order</small>
                </button>
              </div>
            </div>
            <div className="choice-block">
              <span className="choice-label">
                What flavor {flavors.length === 0 ? '(any)' : ''}
              </span>
              <div className="choice-grid" role="group" aria-label="What flavor">
                {CATEGORIES.map((category) => {
                  const on = flavors.includes(category)
                  return (
                    <button
                      key={category}
                      type="button"
                      className={`mode-chip${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggleFlavor(category)}
                    >
                      <span>{CATEGORY_META[category].label}</span>
                      <small>{CATEGORY_META[category].blurb}</small>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="choice-block">
              <span className="choice-label">Tone</span>
              <div className="choice-grid" role="group" aria-label="Tone">
                <button
                  type="button"
                  className={`mode-chip${cheeky ? ' is-on' : ''}`}
                  aria-pressed={cheeky}
                  onClick={() => setCheeky((on) => !on)}
                >
                  <span>Friends-only (cheeky)</span>
                  <small>
                    Bawdy, crude puns, awkward. Never explicit. Adults who opted in only.
                  </small>
                </button>
              </div>
            </div>
            <IntensityDials value={ceilings} onChange={setCeilings} />
          </section>

          <LotteryDraw
            shape={shape}
            acceptedIds={slipBets.map((bet) => bet.id)}
            onAccept={acceptDraw}
          />

          <section className="catalog" aria-label="Side bet catalog">
            {CATEGORIES.map((category) => {
              const meta = CATEGORY_META[category]
              const options = BET_OPTIONS.filter(
                (bet) =>
                  bet.category === category && betInRange(bet, shape),
              )
              if (options.length === 0) return null
              return (
                <div key={category} className="category">
                  <header className="category-header">
                    <h2>{meta.label}</h2>
                    <p>{meta.blurb}</p>
                  </header>
                  <div className="toggle-grid">
                    {options.map((option) => (
                      <BetToggle
                        key={option.id}
                        option={option}
                        checked={selectedIds.includes(option.id)}
                        onToggle={toggleBet}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
            {visibleCount === 0 && (
              <p className="catalog-empty">
                Nothing in range. Turn a dial up, or switch a time, kid setting,
                or delivery mode back on.
              </p>
            )}
          </section>

          <aside className="slip">
            <h2>Bet slip</h2>
            <p className="slip-matchup">
              {matchup.you || 'You'}{' '}
              <span className="slip-vs">vs</span>{' '}
              {matchup.opponent || 'Opponent'}
              {matchup.week ? ` · Wk ${matchup.week}` : ''}
            </p>
            <IntensityMeters totals={totals} />
            <ul className="slip-stakes">
              {slipBets.length === 0 ? (
                <li className="slip-empty">Draw a stake or flip one onto the slip.</li>
              ) : (
                slipBets.map((bet) => (
                  <li key={bet.id}>
                    <strong>{bet.label}</strong>
                    <span>{bet.description}</span>
                  </li>
                ))
              )}
            </ul>
            <div className="slip-actions">
              <button
                type="button"
                className="btn primary"
                onClick={copyLink}
                disabled={slipBets.length === 0}
              >
                {copied === 'link' ? <Check size={16} /> : <Link2 size={16} />}
                {copied === 'link' ? 'Link copied' : 'Copy share link'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={copyText}
                disabled={slipBets.length === 0}
              >
                {copied === 'text' ? <Check size={16} /> : <Copy size={16} />}
                {copied === 'text' ? 'Copied' : 'Copy as text'}
              </button>
              <button type="button" className="btn ghost" onClick={reset}>
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </aside>
        </main>
      )}

      <footer className="footer">
        <span>Side Bet City</span>
        <span>Friendly wagers only. Know your league.</span>
      </footer>
    </div>
  )
}
