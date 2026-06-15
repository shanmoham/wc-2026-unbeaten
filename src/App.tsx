import { useMemo, useState } from 'react'
import {
  FORMATIONS,
  ROUNDS,
  draftChoices,
  drawOpponents,
  squadStrength,
  buildTournament,
  type Player,
  type Formation,
} from './game/engine'
import type { MatchResult, TournamentResult } from './game/engine'
import type { NationalTeam } from './data/teams'
import './App.css'

type Screen = 'title' | 'formation' | 'draft' | 'review' | 'tournament' | 'result'

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [formation, setFormation] = useState<Formation>(FORMATIONS[0])

  // draft state — squad is parallel to formation.slots
  const [slotIndex, setSlotIndex] = useState(0)
  const [squad, setSquad] = useState<(Player | null)[]>([])
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
  const strength = useMemo(() => squadStrength(picked), [picked])

  // ── flow helpers ─────────────────────────────────────────────
  function chooseFormation(f: Formation) {
    setFormation(f)
    const fresh = f.slots.map(() => null)
    setSquad(fresh)
    setSlotIndex(0)
    setChoices(draftChoices(f.slots[0].pos, new Set()))
    setScreen('draft')
  }

  function choose(player: Player) {
    const next = [...squad]
    next[slotIndex] = player
    setSquad(next)

    const nextIndex = slotIndex + 1
    if (nextIndex >= formation.slots.length) {
      setScreen('review')
      return
    }
    const taken = new Set(next.filter(Boolean).map((p) => (p as Player).id))
    setSlotIndex(nextIndex)
    setChoices(draftChoices(formation.slots[nextIndex].pos, taken))
  }

  function reroll() {
    setChoices(draftChoices(formation.slots[slotIndex].pos, takenIds))
  }

  function beginTournament() {
    const opps = drawOpponents()
    setOpponents(opps)
    setTournament(buildTournament(strength, formation, opps))
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
    setSquad([])
    setSlotIndex(0)
    setTournament(null)
    setRevealed(0)
  }

  return (
    <div className="app">
      <div className="bg-grad" />
      <div className="device">
      {screen === 'title' && <Title onStart={() => setScreen('formation')} />}
      {screen === 'formation' && <FormationSelect onPick={chooseFormation} />}
      {screen === 'draft' && (
        <Draft
          formation={formation}
          slotIndex={slotIndex}
          choices={choices}
          squad={squad}
          rating={strength.overall}
          onChoose={choose}
          onReroll={reroll}
        />
      )}
      {screen === 'review' && (
        <Review
          formation={formation}
          squad={squad}
          rating={strength.overall}
          onStart={beginTournament}
        />
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
        <Result
          result={tournament}
          formation={formation}
          squad={picked}
          rating={strength.overall}
          onAgain={playAgain}
        />
      )}
      </div>
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
        Pick a formation, draft your XI from the world's best, then survive the
        group stage and five knockout rounds.{' '}
        <strong>Win all 8 — go unbeaten.</strong>
      </p>
      <button className="btn primary big" onClick={onStart}>
        Start the draft
      </button>
      <div className="footnote">48 nations · 6 formations · one loss and you're out</div>
    </div>
  )
}

// ── Formation select ────────────────────────────────────────────────
function FormationSelect({ onPick }: { onPick: (f: Formation) => void }) {
  return (
    <div className="screen">
      <div className="kicker">Step 1 of 2</div>
      <h2 className="slot-title">
        Choose your <span className="gold">formation</span>
      </h2>
      <p className="tagline" style={{ margin: '6px 0 18px' }}>
        Shape changes who you draft — and how you play. More attackers score
        more but concede more.
      </p>
      <div className="formation-grid">
        {FORMATIONS.map((f) => (
          <button key={f.id} className="formation-card" onClick={() => onPick(f)}>
            <div className="fc-head">
              <span className="fc-name">{f.name}</span>
            </div>
            <MiniPitch formation={f} />
            <div className="fc-desc">{f.desc}</div>
            <div className="fc-meters">
              <Meter label="ATK" value={(f.atk + 0.1) / 0.45} accent="var(--green)" />
              <Meter label="DEF" value={(f.def + 0.25) / 0.55} accent="var(--gold)" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function MiniPitch({ formation }: { formation: Formation }) {
  return (
    <div className="mini-pitch">
      {formation.rows.map((row, i) => (
        <div className="mini-row" key={i}>
          {row.map((s) => (
            <span key={s.key} className={`dot dot-${s.pos.toLowerCase()}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

function Meter({ label, value, accent }: { label: string; value: number; accent: string }) {
  const pct = Math.max(6, Math.min(100, value * 100))
  return (
    <div className="meter">
      <span className="meter-label">{label}</span>
      <span className="meter-track">
        <span className="meter-fill" style={{ width: `${pct}%`, background: accent }} />
      </span>
    </div>
  )
}

// ── Draft ───────────────────────────────────────────────────────────
function Draft(props: {
  formation: Formation
  slotIndex: number
  choices: Player[]
  squad: (Player | null)[]
  rating: number
  onChoose: (p: Player) => void
  onReroll: () => void
}) {
  const { formation, slotIndex, choices, squad, rating } = props
  const slot = formation.slots[slotIndex]
  const total = formation.slots.length
  return (
    <div className="screen draft">
      <div className="draft-head">
        <div>
          <div className="kicker">
            {formation.name} · Pick {slotIndex + 1} of {total}
          </div>
          <h2 className="slot-title">
            Choose your <span className="gold">{slot.label}</span>
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
        {choices.length === 0 && <div className="empty">No players left for {slot.pos}.</div>}
      </div>

      <button className="btn ghost" onClick={props.onReroll}>
        🎲 Re-roll choices
      </button>

      <div className="xi-strip">
        {formation.slots.map((s, i) => {
          const p = squad[i]
          return (
            <div
              key={s.key}
              className={`xi-slot ${p ? 'filled' : ''} ${i === slotIndex ? 'active' : ''}`}
            >
              <span className="xi-pos">{s.label}</span>
              <span className="xi-name">{p ? shortName(p.name) : '—'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Review ──────────────────────────────────────────────────────────
function Review({
  formation,
  squad,
  rating,
  onStart,
}: {
  formation: Formation
  squad: (Player | null)[]
  rating: number
  onStart: () => void
}) {
  // map slot.key → drafted player (squad is parallel to formation.slots)
  const bySlot = new Map<string, Player | null>(
    formation.slots.map((s, i) => [s.key, squad[i]]),
  )
  return (
    <div className="screen review">
      <div className="kicker">{formation.name} · your starting XI</div>
      <h2 className="slot-title">
        Squad rating <span className="gold">{rating.toFixed(1)}</span>
      </h2>
      <div className="pitch">
        {formation.rows.map((row, i) => (
          <div className="pitch-line" key={i}>
            {row.map((s) => {
              const p = bySlot.get(s.key)
              return (
                <div className="pitch-player" key={s.key}>
                  <div className="pp-flag">{p ? p.flag : '⚪'}</div>
                  <div className="pp-name">{p ? shortName(p.name) : s.label}</div>
                  {p && (
                    <div className="pp-rating" data-tier={tier(p.rating)}>
                      {p.rating}
                    </div>
                  )}
                </div>
              )
            })}
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
  formation,
  squad,
  rating,
  onAgain,
}: {
  result: TournamentResult
  formation: Formation
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
    const text = buildShareText(result, formation, rating)
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
        <span className="mini-chip formation-chip">{formation.name}</span>
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

function buildShareText(result: TournamentResult, formation: Formation, rating: number): string {
  const squares = result.results
    .map((r) => (r.advanced ? (r.outcome === 'win' ? '🟩' : '🟨') : '🟥'))
    .join('')
  const status = result.perfect
    ? 'PERFECT 8-0 🏆'
    : result.champion
      ? 'CHAMPIONS 🏆'
      : `OUT @ ${result.eliminatedAt}`
  return `Road to Glory 2026 — ${status}\n${formation.name} · rating ${rating.toFixed(1)}\n${squares}\nCan you go unbeaten?`
}
