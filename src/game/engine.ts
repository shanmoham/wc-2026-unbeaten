import { PLAYERS, playersByPos, type Player, type Position } from '../data/players'
import { TEAMS, type NationalTeam } from '../data/teams'

// ── Formation: 4-3-3 ────────────────────────────────────────────────
export interface Slot {
  key: string
  pos: Position
  label: string
}

export const FORMATION: Slot[] = [
  { key: 'gk', pos: 'GK', label: 'GK' },
  { key: 'lb', pos: 'DEF', label: 'LB' },
  { key: 'cb1', pos: 'DEF', label: 'CB' },
  { key: 'cb2', pos: 'DEF', label: 'CB' },
  { key: 'rb', pos: 'DEF', label: 'RB' },
  { key: 'cm1', pos: 'MID', label: 'CM' },
  { key: 'cm2', pos: 'MID', label: 'CM' },
  { key: 'cm3', pos: 'MID', label: 'CM' },
  { key: 'lw', pos: 'FWD', label: 'LW' },
  { key: 'st', pos: 'FWD', label: 'ST' },
  { key: 'rw', pos: 'FWD', label: 'RW' },
]

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

// ── Squad rating ────────────────────────────────────────────────────
export function squadRating(squad: Player[]): number {
  if (squad.length === 0) return 0
  return squad.reduce((s, p) => s + p.rating, 0) / squad.length
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
  myRating: number,
  round: RoundDef,
  opponent: NationalTeam,
): MatchResult {
  const diff = myRating - opponent.rating
  const myXG = clamp(1.45 + diff * 0.045, 0.25, 5)
  const oppXG = clamp(1.45 - diff * 0.045, 0.25, 5)

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

  // knockout draw → penalty shootout
  const pWin = clamp(0.5 + diff * 0.012, 0.12, 0.88)
  const iWin = Math.random() < pWin
  // build a plausible shootout score
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
  myRating: number,
  opponents: NationalTeam[],
): TournamentResult {
  const results: MatchResult[] = []
  let champion = false
  let perfect = true
  let eliminatedAt: string | undefined

  for (let i = 0; i < ROUNDS.length; i++) {
    const r = ROUNDS[i]
    const res = simulateMatch(myRating, r, opponents[i])
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
