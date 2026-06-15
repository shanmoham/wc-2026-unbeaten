import { PLAYERS, playersByPos, type Player, type Position } from '../data/players'
import { TEAMS, type NationalTeam } from '../data/teams'

// ── Formations ──────────────────────────────────────────────────────
export interface Slot {
  key: string
  pos: Position
  label: string
}

export interface Formation {
  id: string
  name: string
  desc: string
  /** attacking intent — added to our expected goals (xG) */
  atk: number
  /** defensive solidity — subtracted from the opponent's xG */
  def: number
  /** rows ordered front (forwards) → back (goalkeeper), for the pitch view */
  rows: Slot[][]
  /** all 11 slots in draft order (GK first) */
  slots: Slot[]
}

type RawSlot = { pos: Position; label: string }

function makeFormation(
  id: string,
  name: string,
  desc: string,
  atk: number,
  def: number,
  rows: RawSlot[][],
): Formation {
  let n = 0
  const builtRows: Slot[][] = rows.map((row) =>
    row.map((s) => ({ key: `${id}-${n++}`, pos: s.pos, label: s.label })),
  )
  // draft order: GK first, then back-to-front
  const slots = [...builtRows].reverse().flat()
  return { id, name, desc, atk, def, rows: builtRows, slots }
}

const F = (pos: Position, label: string): RawSlot => ({ pos, label })

export const FORMATIONS: Formation[] = [
  makeFormation('433', '4-3-3', 'Balanced attack — the modern default.', 0.2, 0.0, [
    [F('FWD', 'LW'), F('FWD', 'ST'), F('FWD', 'RW')],
    [F('MID', 'CM'), F('MID', 'CM'), F('MID', 'CM')],
    [F('DEF', 'LB'), F('DEF', 'CB'), F('DEF', 'CB'), F('DEF', 'RB')],
    [F('GK', 'GK')],
  ]),
  makeFormation('442', '4-4-2', 'Classic and solid, hard to break down.', 0.05, 0.12, [
    [F('FWD', 'ST'), F('FWD', 'ST')],
    [F('MID', 'LM'), F('MID', 'CM'), F('MID', 'CM'), F('MID', 'RM')],
    [F('DEF', 'LB'), F('DEF', 'CB'), F('DEF', 'CB'), F('DEF', 'RB')],
    [F('GK', 'GK')],
  ]),
  makeFormation('4231', '4-2-3-1', 'Controlled — two holders behind the play.', 0.1, 0.1, [
    [F('FWD', 'ST')],
    [F('MID', 'LAM'), F('MID', 'AM'), F('MID', 'RAM')],
    [F('MID', 'DM'), F('MID', 'DM')],
    [F('DEF', 'LB'), F('DEF', 'CB'), F('DEF', 'CB'), F('DEF', 'RB')],
    [F('GK', 'GK')],
  ]),
  makeFormation('352', '3-5-2', 'Midfield dominance, wing-backs bomb on.', 0.18, 0.0, [
    [F('FWD', 'ST'), F('FWD', 'ST')],
    [F('MID', 'LM'), F('MID', 'CM'), F('MID', 'CM'), F('MID', 'CM'), F('MID', 'RM')],
    [F('DEF', 'CB'), F('DEF', 'CB'), F('DEF', 'CB')],
    [F('GK', 'GK')],
  ]),
  makeFormation('343', '3-4-3', 'All-out attack — high risk, high reward.', 0.35, -0.22, [
    [F('FWD', 'LW'), F('FWD', 'ST'), F('FWD', 'RW')],
    [F('MID', 'LM'), F('MID', 'CM'), F('MID', 'CM'), F('MID', 'RM')],
    [F('DEF', 'CB'), F('DEF', 'CB'), F('DEF', 'CB')],
    [F('GK', 'GK')],
  ]),
  makeFormation('532', '5-3-2', 'Park the bus and hit on the counter.', -0.08, 0.28, [
    [F('FWD', 'ST'), F('FWD', 'ST')],
    [F('MID', 'CM'), F('MID', 'CM'), F('MID', 'CM')],
    [F('DEF', 'LWB'), F('DEF', 'CB'), F('DEF', 'CB'), F('DEF', 'CB'), F('DEF', 'RWB')],
    [F('GK', 'GK')],
  ]),
]

export const formationById = (id: string): Formation =>
  FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0]

// ── Tournament structure (2026 format): 3 group games + 5 knockouts ──
export interface RoundDef {
  name: string
  knockout: boolean
  /** opponents are drawn from teams rated at least this strong */
  minOppRating: number
}

export const ROUNDS: RoundDef[] = [
  { name: 'Group Match 1', knockout: false, minOppRating: 50 },
  { name: 'Group Match 2', knockout: false, minOppRating: 50 },
  { name: 'Group Match 3', knockout: false, minOppRating: 50 },
  { name: 'Round of 32', knockout: true, minOppRating: 68 },
  { name: 'Round of 16', knockout: true, minOppRating: 74 },
  { name: 'Quarter-Final', knockout: true, minOppRating: 80 },
  { name: 'Semi-Final', knockout: true, minOppRating: 84 },
  { name: 'Final', knockout: true, minOppRating: 86 },
]

// ── Draft helpers ───────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

/** Random distinct choices for a slot, excluding already-picked players. */
export function draftChoices(
  pos: Position,
  takenIds: Set<string>,
  count = 3,
): Player[] {
  const pool = playersByPos(pos).filter((p) => !takenIds.has(p.id))
  return shuffle(pool).slice(0, count)
}

// ── Squad strength ──────────────────────────────────────────────────
export interface Strength {
  overall: number
  attack: number
  defense: number
}

const avg = (xs: number[]) =>
  xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0

/** Break a squad into attacking and defensive quality, used by the sim. */
export function squadStrength(squad: Player[]): Strength {
  if (squad.length === 0) return { overall: 0, attack: 0, defense: 0 }
  const fwd = squad.filter((p) => p.pos === 'FWD').map((p) => p.rating)
  const mid = squad.filter((p) => p.pos === 'MID').map((p) => p.rating)
  const def = squad.filter((p) => p.pos === 'DEF').map((p) => p.rating)
  const gk = squad.filter((p) => p.pos === 'GK').map((p) => p.rating)

  const attack = avg(fwd) * 0.7 + avg(mid) * 0.3
  const defense = avg(def) * 0.6 + avg(gk) * 0.25 + avg(mid) * 0.15
  const overall = avg(squad.map((p) => p.rating))
  return { overall, attack, defense }
}

// ── Opponent bracket ────────────────────────────────────────────────
/** Draw one distinct opponent per round, biased stronger in later rounds. */
export function drawOpponents(): NationalTeam[] {
  const used = new Set<string>()
  return ROUNDS.map((r) => {
    const pool = TEAMS.filter(
      (t) => t.rating >= r.minOppRating && !used.has(t.name),
    )
    const choice = pool.length ? pick(pool) : pick(TEAMS.filter((t) => !used.has(t.name)))
    used.add(choice.name)
    return choice
  })
}

// ── Match simulation ────────────────────────────────────────────────
function poisson(lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return k - 1
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))

export type Outcome = 'win' | 'draw' | 'loss'

export interface MatchResult {
  round: string
  knockout: boolean
  opponent: NationalTeam
  myGoals: number
  oppGoals: number
  pens?: { me: number; opp: number }
  outcome: Outcome
  /** did we progress to the next round / survive the tournament */
  advanced: boolean
}

export function simulateMatch(
  strength: Strength,
  formation: Formation,
  round: RoundDef,
  opponent: NationalTeam,
): MatchResult {
  // Our attack quality vs their overall; their attack vs our defence quality.
  const atkDiff = strength.attack - opponent.rating
  const defDiff = strength.defense - opponent.rating
  const myXG = clamp(1.35 + atkDiff * 0.05 + formation.atk, 0.25, 5)
  const oppXG = clamp(1.35 - defDiff * 0.05 - formation.def, 0.2, 5)

  const myGoals = poisson(myXG)
  const oppGoals = poisson(oppXG)

  const base: MatchResult = {
    round: round.name,
    knockout: round.knockout,
    opponent,
    myGoals,
    oppGoals,
    outcome: 'win',
    advanced: true,
  }

  if (myGoals > oppGoals) return { ...base, outcome: 'win', advanced: true }
  if (myGoals < oppGoals) return { ...base, outcome: 'loss', advanced: false }

  // Draw
  if (!round.knockout) {
    // group stage: a draw keeps you alive but breaks the perfect run
    return { ...base, outcome: 'draw', advanced: true }
  }

  // knockout draw → penalty shootout, weighted by overall quality
  const diff = strength.overall - opponent.rating
  const pWin = clamp(0.5 + diff * 0.012, 0.12, 0.88)
  const iWin = Math.random() < pWin
  const winnerPens = 3 + Math.floor(Math.random() * 3) // 3-5
  const loserPens = Math.floor(Math.random() * winnerPens) // 0..winner-1
  const pens = iWin
    ? { me: winnerPens, opp: loserPens }
    : { me: loserPens, opp: winnerPens }

  return { ...base, outcome: 'draw', pens, advanced: iWin }
}

// ── Run a full tournament ───────────────────────────────────────────
export interface TournamentResult {
  results: MatchResult[]
  champion: boolean
  perfect: boolean // won every match in normal time, no draws/pens
  eliminatedAt?: string
}

export function buildTournament(
  strength: Strength,
  formation: Formation,
  opponents: NationalTeam[],
): TournamentResult {
  const results: MatchResult[] = []
  let champion = false
  let perfect = true
  let eliminatedAt: string | undefined

  for (let i = 0; i < ROUNDS.length; i++) {
    const r = ROUNDS[i]
    const res = simulateMatch(strength, formation, r, opponents[i])
    results.push(res)

    if (res.outcome !== 'win') perfect = false

    if (!res.advanced) {
      eliminatedAt = r.name
      break
    }
    if (i === ROUNDS.length - 1) champion = true
  }

  return { results, champion, perfect, eliminatedAt }
}

export { PLAYERS, type Player, type Position, type NationalTeam }
