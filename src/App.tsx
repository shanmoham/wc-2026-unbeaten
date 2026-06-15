import { useMemo, useState } from 'react'
import {
  FORMATION,
  ROUNDS,
  draftChoices,
  drawOpponents,
  squadRating,
  buildTournament,
  type Player,
} from './game/engine'
import type { MatchResult, TournamentResult } from './game/engine'
import type { NationalTeam } from './data/teams'
import './App.css'

type Screen = 'title' | 'draft' | 'review' | 'tournament' | 'result'

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')

  // draft state
  const [slotIndex, setSlotIndex] = useState(0)
  const [squad, setSquad] = useState<(Player | null)[]>(
    () => FORMATION.map(() => null),
  )
  const [choices, setChoices] = useState<Player[]>([])

  // tournament state
  const [opponents, setOpponents] = useState<NationalTeam[]>([])
  const [tournament, setTournament] = useState<TournamentResult | null>(null)
  const [revealed, setRevealed] = useState(0)

  const takenIds = useMemo(
    () => new Set(squad.filter(Boolean).map((p) => (p as Player).id)),
    [squad],
  )
  const picked = squad.filter(Boolean) as Player[]
  const rating = squadRating(picked)

  // ── flow helpers ─────────────────────────────────────────────
  function startDraft() {
    const fresh = FORMATION.map(() => null)
    setSquad(fresh)
    setSlotIndex(0)
    setChoices(draftChoices(FORMATION[0].pos, new Set()))
    setScreen('draft')
  }

  function choose(player: Player) {
    const next = [...squad]
    next[slotIndex] = player
    setSquad(next)

    const nextIndex = slotIndex + 1
    if (nextIndex >= FORMATION.length) {
      setScreen('review')
      return
    }
    const taken = new Set(next.filter(Boolean).map((p) => (p as Player).id))
    setSlotIndex(nextIndex)
    setChoices(draftChoices(FORMATION[nextIndex].pos, taken))
  }

  function reroll() {
    setChoices(draftChoices(FORMATION[slotIndex].pos, takenIds))
  }

  function beginTournament() {
    const opps = drawOpponents()
    setOpponents(opps)
    setTournament(buildTournament(rating, opps))
    setRevealed(0)
    setScreen('tournament')
  }

  function revealNext() {
    if (!tournament) return
    const next = revealed + 1
    setRevealed(next)
    const justShown = tournament.results[next - 1]
    if (!justShown.advanced || next >= tournament.results.length) {
      setTimeout(() => setScreen('result'), 650)
    }
  }

  function playAgain() {
    setScreen('title')
    setSquad(FORMATION.map(() => null))
    setSlotIndex(0)
    setTournament(null)
    setRevealed(0)
  }

  return (
    <div className="app">
      <div className="bg-grad" />
      {screen === 'title' && <Title onStart={startDraft} />}
      {screen === 'draft' && (
        <Draft
          slotLabel={FORMATION[slotIndex].label}
          slotPos={FORMATION[slotIndex].pos}
          slotIndex={slotIndex}
          total={FORMATION.length}
          choices={choices}
          squad={squad}
          rating={rating}
          onChoose={choose}
          onReroll={reroll}
        />
      )}
      {screen === 'review' && (
        <Review squad={picked} rating={rating} onStart={beginTournament} />
      )}
      {screen === 'tournament' && tournament && (
        <Tournament
          results={tournament.results}
          revealed={revealed}
          opponents={opponents}
          onReveal={revealNext}
        />
      )}
      {screen === 'result' && tournament && (
        <Result result={tournament} squad={picked} rating={rating} onAgain={playAgain} />
      )}
    </div>
  )
}

// ── Title ───────────────────────────────────────────────────────────
function Title({ onStart }: { onStart: () => void }) {
  return (
    <div className="screen center">
      <div className="trophy">🏆</div>
      <h1 className="title">
        ROAD TO <span className="gold">GLORY</span>
      </h1>
      <div className="year">2026 · WORLD CUP</div>
      <p className="tagline">
        Draft your XI from the world's best. Survive the group stage and five
        knockout rounds. <strong>Win all 8 — go unbeaten.</strong>
      </p>
      <button className="btn primary big" onClick={onStart}>
        Start the draft
      </button>
      <div className="footnote">
        48 nations · 4-3-3 · one loss and you're out
      </div>
    </div>
  )
}

// ── Draft ───────────────────────────────────────────────────────────
function Draft(props: {
  slotLabel: string
  slotPos: string
  slotIndex: number
  total: number
  choices: Player[]
  squad: (Player | null)[]
  rating: number
  onChoose: (p: Player) => void
  onReroll: () => void
}) {
  const { slotLabel, slotPos, slotIndex, total, choices, squad, rating } = props
  return (
    <div className="screen draft">
      <div className="draft-head">
        <div>
          <div className="kicker">Pick {slotIndex + 1} of {total}</div>
          <h2 className="slot-title">
            Choose your <span className="gold">{slotLabel}</span>
          </h2>
        </div>
        <div className="rating-chip">
          <span>Squad</span>
          <strong>{rating ? rating.toFixed(1) : '—'}</strong>
        </div>
      </div>

      <div className="progress">
        <div className="progress-bar" style={{ width: `${(slotIndex / total) * 100}%` }} />
      </div>

      <div className="cards">
        {choices.map((p) => (
          <button key={p.id} className="player-card" onClick={() => props.onChoose(p)}>
            <div className="pc-flag">{p.flag}</div>
            <div className="pc-rating" data-tier={tier(p.rating)}>{p.rating}</div>
            <div className="pc-name">{p.name}</div>
            <div className="pc-meta">
              {p.pos} · {p.nation}
            </div>
          </button>
        ))}
        {choices.length === 0 && <div className="empty">No players left for {slotPos}.</div>}
      </div>

      <button className="btn ghost" onClick={props.onReroll}>
        🎲 Re-roll choices
      </button>

      <div className="xi-strip">
        {squad.map((p, i) => (
          <div key={i} className={`xi-slot ${p ? 'filled' : ''} ${i === slotIndex ? 'active' : ''}`}>
            <span className="xi-pos">{FORMATION[i].label}</span>
            <span className="xi-name">{p ? shortName(p.name) : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Review ──────────────────────────────────────────────────────────
function Review({ squad, rating, onStart }: { squad: Player[]; rating: number; onStart: () => void }) {
  const lines: { label: string; players: Player[] }[] = [
    { label: 'Forwards', players: squad.filter((p) => p.pos === 'FWD') },
    { label: 'Midfield', players: squad.filter((p) => p.pos === 'MID') },
    { label: 'Defence', players: squad.filter((p) => p.pos === 'DEF') },
    { label: 'Goalkeeper', players: squad.filter((p) => p.pos === 'GK') },
  ]
  return (
    <div className="screen review">
      <div className="kicker">Your starting XI</div>
      <h2 className="slot-title">
        Squad rating <span className="gold">{rating.toFixed(1)}</span>
      </h2>
      <div className="pitch">
        {lines.map((line) => (
          <div className="pitch-line" key={line.label}>
            {line.players.map((p) => (
              <div className="pitch-player" key={p.id}>
                <div className="pp-flag">{p.flag}</div>
                <div className="pp-name">{shortName(p.name)}</div>
                <div className="pp-rating" data-tier={tier(p.rating)}>{p.rating}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <button className="btn primary big" onClick={onStart}>
        Kick off the World Cup →
      </button>
    </div>
  )
}

// ── Tournament ──────────────────────────────────────────────────────
function Tournament(props: {
  results: MatchResult[]
  revealed: number
  opponents: NationalTeam[]
  onReveal: () => void
}) {
  const { results, revealed, opponents, onReveal } = props
  const done = revealed >= results.length
  const lastEliminated = revealed > 0 && !results[revealed - 1].advanced
  const canReveal = !done && !lastEliminated
  const nextRound = canReveal ? ROUNDS[revealed].name : null
  const nextOpp = canReveal ? opponents[revealed] : null

  return (
    <div className="screen tournament">
      <div className="kicker">The road to the final</div>
      <div className="match-list">
        {results.map((r, i) => {
          if (i >= revealed) {
            const upcoming = i === revealed && canReveal
            return (
              <div className={`match pending ${upcoming ? 'next' : ''}`} key={i}>
                <span className="m-round">{ROUNDS[i].name}</span>
                <span className="m-vs">
                  {upcoming ? `vs ${opponents[i].flag} ${opponents[i].name}` : '🔒'}
                </span>
                <span className="m-score">—</span>
              </div>
            )
          }
          return <MatchRow key={i} r={r} />
        })}
      </div>

      {canReveal && (
        <button className="btn primary big" onClick={onReveal}>
          Play {nextRound} · vs {nextOpp!.flag} {nextOpp!.name}
        </button>
      )}
    </div>
  )
}

function MatchRow({ r }: { r: MatchResult }) {
  const cls = r.advanced ? (r.outcome === 'win' ? 'win' : 'scrape') : 'loss'
  return (
    <div className={`match revealed ${cls}`}>
      <span className="m-round">{r.round}</span>
      <span className="m-vs">
        {r.opponent.flag} {r.opponent.name}
      </span>
      <span className="m-score">
        {r.myGoals}–{r.oppGoals}
        {r.pens && <em className="pens"> ({r.pens.me}–{r.pens.opp} pens)</em>}
      </span>
      <span className="m-tag">{tagFor(r)}</span>
    </div>
  )
}

function tagFor(r: MatchResult): string {
  if (!r.advanced) return 'OUT'
  if (r.pens) return 'PENS ✓'
  if (r.outcome === 'win') return 'WIN'
  if (r.outcome === 'draw') return 'DRAW'
  return ''
}

// ── Result ──────────────────────────────────────────────────────────
function Result({
  result,
  squad,
  rating,
  onAgain,
}: {
  result: TournamentResult
  squad: Player[]
  rating: number
  onAgain: () => void
}) {
  const wins = result.results.filter((r) => r.outcome === 'win').length
  const headline = result.perfect
    ? 'PERFECT RUN!'
    : result.champion
      ? 'CHAMPIONS!'
      : 'ELIMINATED'
  const emoji = result.perfect ? '🏆✨' : result.champion ? '🏆' : '💔'
  const sub = result.perfect
    ? 'Eight games, eight wins. Football immortality.'
    : result.champion
      ? 'You lifted the trophy — but not unbeaten in normal time.'
      : `Knocked out in the ${result.eliminatedAt}. ${wins} ${wins === 1 ? 'win' : 'wins'} on the run.`

  const [copied, setCopied] = useState(false)
  function share() {
    const text = buildShareText(result, rating)
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      },
      () => {},
    )
  }

  return (
    <div className="screen result center">
      <div className={`result-emoji ${result.champion ? 'spin' : ''}`}>{emoji}</div>
      <h1 className={`title ${result.champion ? 'gold' : 'fail'}`}>{headline}</h1>
      <p className="tagline">{sub}</p>

      <div className="result-grid">
        {result.results.map((r, i) => (
          <div key={i} className={`rg-cell ${r.advanced ? (r.outcome === 'win' ? 'win' : 'scrape') : 'loss'}`}>
            <div className="rg-round">{shortRound(r.round)}</div>
            <div className="rg-score">{r.myGoals}–{r.oppGoals}</div>
            <div className="rg-opp">{r.opponent.flag}</div>
          </div>
        ))}
      </div>

      <div className="squad-mini">
        {squad.map((p) => (
          <span key={p.id} className="mini-chip">
            {p.flag} {shortName(p.name)}
          </span>
        ))}
      </div>

      <div className="result-actions">
        <button className="btn primary" onClick={onAgain}>
          Play again
        </button>
        <button className="btn ghost" onClick={share}>
          {copied ? 'Copied! ✓' : 'Share result'}
        </button>
      </div>
    </div>
  )
}

// ── helpers ─────────────────────────────────────────────────────────
function tier(r: number): string {
  if (r >= 88) return 'elite'
  if (r >= 84) return 'gold'
  if (r >= 80) return 'silver'
  return 'bronze'
}

function shortName(name: string): string {
  const parts = name.split(' ')
  if (parts.length === 1) return name
  return parts[parts.length - 1]
}

function shortRound(name: string): string {
  return name
    .replace('Group Match ', 'GP')
    .replace('Round of ', 'R')
    .replace('Quarter-Final', 'QF')
    .replace('Semi-Final', 'SF')
}

function buildShareText(result: TournamentResult, rating: number): string {
  const squares = result.results
    .map((r) => (r.advanced ? (r.outcome === 'win' ? '🟩' : '🟨') : '🟥'))
    .join('')
  const status = result.perfect
    ? 'PERFECT 8-0 🏆'
    : result.champion
      ? 'CHAMPIONS 🏆'
      : `OUT @ ${result.eliminatedAt}`
  return `Road to Glory 2026 — ${status}\n${squares}\nSquad rating ${rating.toFixed(1)}\nCan you go unbeaten?`
}
