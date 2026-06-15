import { useMemo, useState } from 'react'
import {
  ROUNDS,
  SQUAD_SIZE,
  FORMATIONS,
  draftCountry,
  neededPositions,
  remainingNeed,
  setupTournament,
  squadStrength,
  buildTournament,
  simulateWorldCup,
  predictRun,
  type Player,
  type Formation,
  type DraftDraw,
} from './game/engine'
import type {
  MatchResult,
  TournamentResult,
  QualifiedAs,
  GroupRow,
  WorldCupResult,
  Prediction,
} from './game/engine'
import type { NationalTeam } from './data/teams'
import type { Position } from './data/players'
import './App.css'

type Screen = 'title' | 'formation' | 'draft' | 'review' | 'tournament' | 'result'

const POS_LABELS: { pos: Position; label: string }[] = [
  { pos: 'GK', label: 'Goalkeepers' },
  { pos: 'DEF', label: 'Defenders' },
  { pos: 'MID', label: 'Midfielders' },
  { pos: 'FWD', label: 'Forwards' },
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [formation, setFormation] = useState<Formation>(FORMATIONS[0])

  // draft state — squad is the list of players picked so far
  const [squad, setSquad] = useState<Player[]>([])
  const [draw, setDraw] = useState<DraftDraw | null>(null)

  // tournament state
  const [opponents, setOpponents] = useState<NationalTeam[]>([])
  const [groupName, setGroupName] = useState('')
  const [tournament, setTournament] = useState<TournamentResult | null>(null)
  const [worldCup, setWorldCup] = useState<WorldCupResult | null>(null)
  const [revealed, setRevealed] = useState(0)

  const takenIds = useMemo(() => new Set(squad.map((p) => p.id)), [squad])
  const strength = useMemo(() => squadStrength(squad), [squad])
  const remaining = useMemo(() => remainingNeed(formation, squad), [formation, squad])
  // bookies' verdict — only computed once the XI is complete (on the review screen)
  const prediction = useMemo<Prediction | null>(
    () => (squad.length === SQUAD_SIZE ? predictRun(strength, formation, squad) : null),
    [squad, formation, strength],
  )

  // ── flow helpers ─────────────────────────────────────────────
  function chooseFormation(f: Formation) {
    setFormation(f)
    setSquad([])
    setDraw(draftCountry(new Set(), neededPositions(f, [])))
    setScreen('draft')
  }

  function choose(player: Player) {
    if (remaining[player.pos] <= 0) return // position already full
    const next = [...squad, player]
    setSquad(next)
    if (next.length >= SQUAD_SIZE) {
      setScreen('review')
      return
    }
    setDraw(draftCountry(new Set(next.map((p) => p.id)), neededPositions(formation, next)))
  }

  function reroll() {
    setDraw(draftCountry(takenIds, neededPositions(formation, squad)))
  }

  function beginTournament() {
    const setup = setupTournament()
    setOpponents(setup.opponents)
    setGroupName(setup.groupName)
    setTournament(buildTournament(strength, formation, squad, setup))
    setWorldCup(simulateWorldCup())
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
    setWorldCup(null)
    setRevealed(0)
  }

  return (
    <div className="app">
      <div className="bg-grad" />
      <div className="device">
        {screen === 'title' && <Title onStart={() => setScreen('formation')} />}
        {screen === 'formation' && <FormationSelect onPick={chooseFormation} />}
        {screen === 'draft' && draw && (
          <Draft
            formation={formation}
            draw={draw}
            squad={squad}
            remaining={remaining}
            rating={strength.overall}
            onChoose={choose}
            onReroll={reroll}
          />
        )}
        {screen === 'review' && (
          <Review
            formation={formation}
            squad={squad}
            strength={strength}
            prediction={prediction}
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
            shape={formation.name}
            groupName={groupName}
            squad={squad}
            rating={strength.overall}
            worldCup={worldCup}
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
        Pick a formation, then draft an XI to fill it — a country a time. Survive
        the group stage and five knockout rounds.{' '}
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
        It sets how many of each position you'll draft — and your tactical tilt.
        More attackers score more but concede more.
      </p>
      <div className="formation-grid">
        {FORMATIONS.map((f) => (
          <button key={f.id} className="formation-card" onClick={() => onPick(f)}>
            <span className="fc-name">{f.name}</span>
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
  const rows: { pos: Position; n: number }[] = [
    { pos: 'FWD', n: formation.need.FWD },
    { pos: 'MID', n: formation.need.MID },
    { pos: 'DEF', n: formation.need.DEF },
    { pos: 'GK', n: formation.need.GK },
  ]
  return (
    <div className="mini-pitch">
      {rows.map((r) => (
        <div className="mini-row" key={r.pos}>
          {Array.from({ length: r.n }).map((_, j) => (
            <span key={j} className={`dot dot-${r.pos.toLowerCase()}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

function Bookies({ prediction }: { prediction: Prediction }) {
  const [title, sub] = verdict(prediction.tipStage)
  const pct = (x: number) => `${Math.round(x * 100)}%`
  return (
    <div className="bookies">
      <div className="bk-head">📊 The bookies' verdict</div>
      <div className="bk-verdict">{title}</div>
      <div className="bk-sub">{sub}</div>
      <div className="bk-stats">
        <div className="bk-stat">
          <strong>{prediction.oddsToWin}</strong>
          <span>to win it</span>
        </div>
        <div className="bk-stat">
          <strong>{pct(prediction.koPct)}</strong>
          <span>reach knockouts</span>
        </div>
        <div className="bk-stat">
          <strong>{pct(prediction.winPct)}</strong>
          <span>lift the trophy</span>
        </div>
      </div>
    </div>
  )
}

function verdict(stage: string): [string, string] {
  switch (stage) {
    case 'Champions':
      return ['Tournament favourites 🏆', 'The bookies make you the team to beat.']
    case 'Final':
      return ['Genuine contenders', 'Tipped to go all the way to the final.']
    case 'Semi-Final':
      return ['Serious dark horses', 'Fancied for a run to the semi-finals.']
    case 'Quarter-Final':
      return ['Tipped for a deep run', 'Backed to reach the quarter-finals.']
    case 'Round of 16':
      return ['Plucky underdogs', 'Expected to reach the last 16.']
    case 'Round of 32':
      return ['Rank outsiders', 'Tipped to fall in the Round of 32.']
    default:
      return ['No-hopers', 'Tipped to crash out in the group stage.']
  }
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
  draw: DraftDraw
  squad: Player[]
  remaining: Record<Position, number>
  rating: number
  onChoose: (p: Player) => void
  onReroll: () => void
}) {
  const { formation, draw, squad, remaining, rating } = props
  const picked = squad.length
  return (
    <div className="screen draft">
      <div className="draft-head">
        <div>
          <div className="kicker">
            {formation.name} · pick {picked + 1} of {SQUAD_SIZE}
          </div>
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

      <div className="needs">
        {POS_LABELS.map(({ pos }) => (
          <span key={pos} className={`need-chip ${remaining[pos] === 0 ? 'done' : ''}`}>
            <span className={`pr-pos pos-${pos.toLowerCase()}`}>{pos}</span>
            {remaining[pos] === 0 ? '✓' : `×${remaining[pos]}`}
          </span>
        ))}
      </div>

      <div className="pick-bar">
        <span className="pick-prompt">Pick a {draw.team.name} player to fill a slot</span>
        <button className="btn ghost small" onClick={props.onReroll}>
          🎲 New country
        </button>
      </div>

      <div className="pick-list">
        {POS_LABELS.map(({ pos, label }) => {
          const ps = draw.players.filter((p) => p.pos === pos)
          if (!ps.length) return null
          const full = remaining[pos] === 0
          return (
            <div className={`pick-group ${full ? 'full' : ''}`} key={pos}>
              <div className="pick-group-head">
                {label}
                <span className="pgh-need">{full ? '✓ filled' : `need ${remaining[pos]}`}</span>
              </div>
              {ps.map((p) => (
                <button
                  key={p.id}
                  className="pick-row"
                  disabled={full}
                  onClick={() => props.onChoose(p)}
                >
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
  formation,
  squad,
  strength,
  prediction,
  onStart,
}: {
  formation: Formation
  squad: Player[]
  strength: { overall: number; attack: number; defense: number }
  prediction: Prediction | null
  onStart: () => void
}) {
  const lines = POS_LABELS.slice()
    .reverse()
    .map((l) => ({ key: l.pos, players: squad.filter((p) => p.pos === l.pos) }))
    .filter((l) => l.players.length > 0)

  return (
    <div className="screen review">
      <div className="kicker">{formation.name} · your XI</div>
      <h2 className="slot-title">
        Squad rating <span className="gold">{strength.overall.toFixed(1)}</span>
      </h2>

      <div className="strength-meters">
        <Meter label="ATK" value={(strength.attack - 45) / 50} accent="var(--green)" />
        <Meter label="DEF" value={(strength.defense - 45) / 50} accent="var(--gold)" />
      </div>

      {prediction && <Bookies prediction={prediction} />}

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
            return <MatchRow key={i} r={result} defaultOpen={i === revealed - 1} />
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

function MatchRow({ r, defaultOpen }: { r: MatchResult; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  const cls = r.advanced ? (r.outcome === 'win' ? 'win' : 'scrape') : 'loss'
  return (
    <div className={`match revealed ${cls} ${open ? 'open' : ''}`}>
      <button className="match-head" onClick={() => setOpen((o) => !o)}>
        <span className="m-round">{r.round}</span>
        <span className="m-vs">
          {r.opponent.flag} {r.opponent.name}
        </span>
        <span className="m-score">
          {r.myGoals}–{r.oppGoals}
          {r.pens && <em className="pens"> ({r.pens.me}–{r.pens.opp} pens)</em>}
        </span>
        <span className="m-tag">{tagFor(r)}</span>
      </button>
      {open && <MatchDetail r={r} />}
    </div>
  )
}

function MatchDetail({ r }: { r: MatchResult }) {
  const { stats } = r
  return (
    <div className="match-detail">
      <div className="md-scorers">
        <div className="md-col">
          {r.myScorers.length === 0 ? (
            <span className="md-none">No goals</span>
          ) : (
            r.myScorers.map((g, i) => (
              <span key={i} className="md-goal">
                ⚽ {g.minute}' {shortName(g.name)}
              </span>
            ))
          )}
        </div>
        <div className="md-col md-away">
          {r.oppScorers.map((g, i) => (
            <span key={i} className="md-goal">
              {shortName(g.name)} {g.minute}' ⚽
            </span>
          ))}
        </div>
      </div>
      <div className="md-stats">
        <span>Poss {stats.possession}%</span>
        <span>
          Shots {stats.shots[0]} ({stats.sot[0]})–{stats.shots[1]} ({stats.sot[1]})
        </span>
        <span>xG {stats.xg[0]}–{stats.xg[1]}</span>
      </div>
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
  worldCup,
  onAgain,
}: {
  result: TournamentResult
  shape: string
  groupName: string
  squad: Player[]
  rating: number
  worldCup: WorldCupResult | null
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

      {worldCup && !result.champion && (
        <div className="wc-winner">
          <div className="wcw-label">Meanwhile, the World Cup was won by</div>
          <div className="wcw-team">
            {worldCup.champion.flag} {worldCup.champion.name}
          </div>
          <div className="wcw-final">
            beat {worldCup.runnerUp.flag} {worldCup.runnerUp.name} {worldCup.finalScore[0]}–
            {worldCup.finalScore[1]}
            {worldCup.finalPens ? ' (pens)' : ''} in the final
          </div>
        </div>
      )}

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
