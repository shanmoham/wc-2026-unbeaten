import { useMemo, useState } from 'react'
import {
  ROUNDS,
  SQUAD_SIZE,
  draftCountry,
  setupTournament,
  squadStrength,
  squadShape,
  buildTournament,
  type Player,
  type DraftDraw,
} from './game/engine'
import type { MatchResult, TournamentResult, QualifiedAs, GroupRow } from './game/engine'
import type { NationalTeam } from './data/teams'
import './App.css'

type Screen = 'title' | 'draft' | 'review' | 'tournament' | 'result'

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')

  // draft state — squad is the list of players picked so far (any positions)
  const [squad, setSquad] = useState<Player[]>([])
  const [draw, setDraw] = useState<DraftDraw | null>(null)

  // tournament state
  const [opponents, setOpponents] = useState<NationalTeam[]>([])
  const [groupName, setGroupName] = useState('')
  const [tournament, setTournament] = useState<TournamentResult | null>(null)
  const [revealed, setRevealed] = useState(0)

  const takenIds = useMemo(() => new Set(squad.map((p) => p.id)), [squad])
  const strength = useMemo(() => squadStrength(squad), [squad])
  const shape = useMemo(() => squadShape(squad), [squad])

  // ── flow helpers ─────────────────────────────────────────────
  function startDraft() {
    setSquad([])
    setDraw(draftCountry(new Set()))
    setScreen('draft')
  }

  function choose(player: Player) {
    const next = [...squad, player]
    setSquad(next)
    if (next.length >= SQUAD_SIZE) {
      setScreen('review')
      return
    }
    setDraw(draftCountry(new Set(next.map((p) => p.id))))
  }

  function reroll() {
    setDraw(draftCountry(takenIds))
  }

  function beginTournament() {
    const setup = setupTournament()
    setOpponents(setup.opponents)
    setGroupName(setup.groupName)
    setTournament(buildTournament(strength, setup))
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
    setDraw(null)
    setTournament(null)
    setRevealed(0)
  }

  return (
    <div className="app">
      <div className="bg-grad" />
      <div className="device">
        {screen === 'title' && <Title onStart={startDraft} />}
        {screen === 'draft' && draw && (
          <Draft
            draw={draw}
            squad={squad}
            rating={strength.overall}
            onChoose={choose}
            onReroll={reroll}
          />
        )}
        {screen === 'review' && (
          <Review
            squad={squad}
            strength={strength}
            shape={shape}
            onStart={beginTournament}
          />
        )}
        {screen === 'tournament' && tournament && (
          <Tournament
            results={tournament.results}
            revealed={revealed}
            opponents={opponents}
            groupName={groupName}
            qualifiedAs={tournament.qualifiedAs}
            groupStanding={tournament.groupStanding}
            groupTable={tournament.groupTable}
            onReveal={revealNext}
          />
        )}
        {screen === 'result' && tournament && (
          <Result
            result={tournament}
            shape={shape.label}
            groupName={groupName}
            squad={squad}
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
        Each pick, you're handed a country — draft any one of its players. Build
        an XI of 11, then survive the group stage and five knockout rounds.{' '}
        <strong>Win all 8 — go unbeaten.</strong>
      </p>
      <button className="btn primary big" onClick={onStart}>
        Start the draft
      </button>
      <div className="footnote">48 nations · build any XI · one loss and you're out</div>
    </div>
  )
}

// ── Draft ───────────────────────────────────────────────────────────
function Draft(props: {
  draw: DraftDraw
  squad: Player[]
  rating: number
  onChoose: (p: Player) => void
  onReroll: () => void
}) {
  const { draw, squad, rating } = props
  const picked = squad.length
  const groups: { pos: string; label: string }[] = [
    { pos: 'GK', label: 'Goalkeepers' },
    { pos: 'DEF', label: 'Defenders' },
    { pos: 'MID', label: 'Midfielders' },
    { pos: 'FWD', label: 'Forwards' },
  ]
  return (
    <div className="screen draft">
      <div className="draft-head">
        <div>
          <div className="kicker">Pick {picked + 1} of {SQUAD_SIZE}</div>
          <h2 className="slot-title">
            <span className="draw-flag">{draw.team.flag}</span> {draw.team.name}
          </h2>
        </div>
        <div className="rating-chip">
          <span>Squad</span>
          <strong>{rating ? rating.toFixed(1) : '—'}</strong>
        </div>
      </div>

      <div className="progress">
        <div className="progress-bar" style={{ width: `${(picked / SQUAD_SIZE) * 100}%` }} />
      </div>

      <div className="pick-bar">
        <span className="pick-prompt">Pick any {draw.team.name} player</span>
        <button className="btn ghost small" onClick={props.onReroll}>
          🎲 New country
        </button>
      </div>

      <div className="pick-list">
        {groups.map(({ pos, label }) => {
          const ps = draw.players.filter((p) => p.pos === pos)
          if (!ps.length) return null
          return (
            <div className="pick-group" key={pos}>
              <div className="pick-group-head">{label}</div>
              {ps.map((p) => (
                <button key={p.id} className="pick-row" onClick={() => props.onChoose(p)}>
                  <span className={`pr-pos pos-${pos.toLowerCase()}`}>{pos}</span>
                  <span className="pr-name">{p.name}</span>
                  <span className="pr-rating" data-tier={tier(p.rating)}>{p.rating}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>

      <div className="xi-strip">
        {Array.from({ length: SQUAD_SIZE }).map((_, i) => {
          const p = squad[i]
          return (
            <div key={i} className={`xi-slot ${p ? 'filled' : ''} ${i === picked ? 'active' : ''}`}>
              <span className="xi-pos">{p ? p.pos : '·'}</span>
              <span className="xi-name">{p ? `${p.flag} ${shortName(p.name)}` : '—'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Review ──────────────────────────────────────────────────────────
function Review({
  squad,
  strength,
  shape,
  onStart,
}: {
  squad: Player[]
  strength: { overall: number; attack: number; defense: number }
  shape: { label: string; gk: number }
  onStart: () => void
}) {
  const lines: { key: string; players: Player[] }[] = [
    { key: 'FWD', players: squad.filter((p) => p.pos === 'FWD') },
    { key: 'MID', players: squad.filter((p) => p.pos === 'MID') },
    { key: 'DEF', players: squad.filter((p) => p.pos === 'DEF') },
    { key: 'GK', players: squad.filter((p) => p.pos === 'GK') },
  ].filter((l) => l.players.length > 0)

  return (
    <div className="screen review">
      <div className="kicker">Shape {shape.label} · your XI</div>
      <h2 className="slot-title">
        Squad rating <span className="gold">{strength.overall.toFixed(1)}</span>
      </h2>

      <div className="strength-meters">
        <Meter label="ATK" value={(strength.attack - 45) / 50} accent="var(--green)" />
        <Meter label="DEF" value={(strength.defense - 45) / 50} accent="var(--gold)" />
      </div>

      {shape.gk === 0 && (
        <div className="warn-banner">⚠️ No goalkeeper — you'll concede heavily!</div>
      )}

      <div className="pitch">
        {lines.map((line) => (
          <div className="pitch-line" key={line.key}>
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

// ── Tournament ──────────────────────────────────────────────────────
function Tournament(props: {
  results: MatchResult[]
  revealed: number
  opponents: NationalTeam[]
  groupName: string
  qualifiedAs: QualifiedAs | null
  groupStanding: number
  groupTable: GroupRow[]
  onReveal: () => void
}) {
  const { results, revealed, opponents, groupName, qualifiedAs, groupStanding, groupTable, onReveal } =
    props
  const done = revealed >= results.length
  const lastEliminated = revealed > 0 && !results[revealed - 1].advanced
  const canReveal = !done && !lastEliminated
  const nextRound = canReveal ? ROUNDS[revealed].name : null
  const nextOpp = canReveal ? opponents[revealed] : null
  const groupDone = revealed >= 3
  const phaseLabel = revealed < 3 ? `${groupName} · group stage` : 'The road to the final'

  return (
    <div className="screen tournament">
      <div className="kicker">{phaseLabel}</div>
      {groupDone && qualifiedAs && (
        <div className="qual-banner">
          ✓ Through to the knockouts as <strong>{qualifiedAs}</strong>
        </div>
      )}
      {groupDone && (
        <GroupTable
          title={groupName}
          rows={groupTable}
          standing={groupStanding}
          qualifiedAs={qualifiedAs}
        />
      )}
      <div className="match-list">
        {ROUNDS.map((round, i) => {
          const result = results[i]
          // Always render all 8 rounds so the row count never reveals how far
          // you'll get. A round is only shown once it has been revealed.
          if (i < revealed && result) {
            return <MatchRow key={i} r={result} />
          }
          const upcoming = i === revealed && canReveal
          return (
            <div className={`match pending ${upcoming ? 'next' : ''}`} key={i}>
              <span className="m-round">{round.name}</span>
              <span className="m-vs">
                {upcoming ? `vs ${opponents[i].flag} ${opponents[i].name}` : '🔒'}
              </span>
              <span className="m-score">—</span>
            </div>
          )
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

function GroupTable({
  title,
  rows,
  standing,
  qualifiedAs,
}: {
  title: string
  rows: GroupRow[]
  standing: number
  qualifiedAs: QualifiedAs | null
}) {
  const thirdQualified = standing === 3 && qualifiedAs === 'best third'
  return (
    <div className="group-table">
      <div className="gt-row gt-head">
        <span className="gt-pos">#</span>
        <span className="gt-team">{title}</span>
        <span>W</span>
        <span>D</span>
        <span>L</span>
        <span className="gt-gd">GD</span>
        <span className="gt-pts">Pts</span>
      </div>
      {rows.map((r, i) => {
        const through = i < 2 || (i === 2 && thirdQualified)
        return (
          <div
            key={r.team}
            className={`gt-row ${r.me ? 'me' : ''} ${through ? 'through' : ''}`}
          >
            <span className="gt-pos">{i + 1}</span>
            <span className="gt-team">
              {r.flag} {r.team}
              {i === 2 && thirdQualified && <em className="gt-note"> best 3rd</em>}
            </span>
            <span>{r.w}</span>
            <span>{r.d}</span>
            <span>{r.l}</span>
            <span className="gt-gd">{r.gd > 0 ? `+${r.gd}` : r.gd}</span>
            <span className="gt-pts">{r.pts}</span>
          </div>
        )
      })}
    </div>
  )
}

function tagFor(r: MatchResult): string {
  if (!r.advanced) return 'OUT'
  if (r.pens) return 'PENS ✓'
  if (r.outcome === 'win') return 'WIN'
  if (r.outcome === 'draw') return 'DRAW'
  if (r.outcome === 'loss') return 'LOSS'
  return ''
}

// ── Result ──────────────────────────────────────────────────────────
function Result({
  result,
  shape,
  groupName,
  squad,
  rating,
  onAgain,
}: {
  result: TournamentResult
  shape: string
  groupName: string
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
  const outInGroup = result.eliminatedAt === 'Group Stage'
  const sub = result.perfect
    ? 'Eight games, eight wins. Football immortality.'
    : result.champion
      ? 'You lifted the trophy — but not unbeaten in normal time.'
      : outInGroup
        ? `Out in the group stage — finished ${ordinal(result.groupStanding)} in ${groupName}.`
        : `Knocked out in the ${result.eliminatedAt}. ${wins} ${wins === 1 ? 'win' : 'wins'} on the run.`

  const [copied, setCopied] = useState(false)
  function share() {
    const text = buildShareText(result, shape, rating)
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

      <GroupTable
        title={groupName}
        rows={result.groupTable}
        standing={result.groupStanding}
        qualifiedAs={result.qualifiedAs}
      />

      <div className="squad-mini">
        <span className="mini-chip formation-chip">{shape}</span>
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

function ordinal(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`
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

function buildShareText(result: TournamentResult, shape: string, rating: number): string {
  const squares = result.results
    .map((r) => (r.advanced ? (r.outcome === 'win' ? '🟩' : '🟨') : '🟥'))
    .join('')
  const status = result.perfect
    ? 'PERFECT 8-0 🏆'
    : result.champion
      ? 'CHAMPIONS 🏆'
      : `OUT @ ${result.eliminatedAt}`
  return `Road to Glory 2026 — ${status}\n${shape} · rating ${rating.toFixed(1)}\n${squares}\nCan you go unbeaten?`
}
