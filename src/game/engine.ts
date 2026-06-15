import { PLAYERS, type Player, type Position } from '../data/players'
import { TEAMS, teamByName, type NationalTeam } from '../data/teams'
import { GROUPS } from '../data/groups'

// ── Squad ───────────────────────────────────────────────────────────
/** You draft 11 players — any positions. Balance is up to you. */
export const SQUAD_SIZE = 11

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

/** A draft round: a random country and ALL its still-available players (any
 *  position), sorted by position then rating so the whole squad is pickable. */
export interface DraftDraw {
  team: NationalTeam
  players: Player[]
}

const POS_ORDER: Record<Position, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 }

export function draftCountry(takenIds: Set<string>): DraftDraw {
  const avail = TEAMS.map((t) => ({
    team: t,
    players: PLAYERS.filter((p) => p.nation === t.name && !takenIds.has(p.id)),
  })).filter((x) => x.players.length > 0)
  // prefer countries that still have a few players to choose between
  const rich = avail.filter((x) => x.players.length >= 3)
  const chosen = pick(rich.length ? rich : avail)
  const players = [...chosen.players].sort(
    (a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.rating - a.rating,
  )
  return { team: chosen.team, players }
}

// ── Squad strength ──────────────────────────────────────────────────
export interface Strength {
  overall: number
  attack: number
  defense: number
}

/** Average of the top `ideal` ratings, padding any missing slots with a weak
 *  "out of position" rating — so a unit that is short of players is punished. */
function unitRating(ratings: number[], ideal: number, scrub = 52): number {
  const filled = [...ratings].sort((a, b) => b - a)
  while (filled.length < ideal) filled.push(scrub)
  const top = filled.slice(0, ideal)
  return top.reduce((s, x) => s + x, 0) / ideal
}

/** Derive attack and defence quality from whatever positions were drafted.
 *  No formation: a squad short of defenders leaks, no keeper is a disaster. */
export function squadStrength(squad: Player[]): Strength {
  if (squad.length === 0) return { overall: 0, attack: 0, defense: 0 }
  const ratingsOf = (pos: Position) =>
    squad.filter((p) => p.pos === pos).map((p) => p.rating)
  const fwd = ratingsOf('FWD')
  const mid = ratingsOf('MID')
  const def = ratingsOf('DEF')
  const gk = ratingsOf('GK')

  const attack = unitRating([...fwd, ...mid], 6)
  const defLine = unitRating(def, 4)
  const keeper = gk.length ? Math.max(...gk) : 46 // no recognised GK → emergency
  const defense = defLine * 0.65 + keeper * 0.35
  const overall = squad.reduce((s, p) => s + p.rating, 0) / squad.length
  return { overall, attack, defense }
}

/** The shape you ended up with, e.g. "4-3-3" (DEF-MID-FWD). */
export function squadShape(squad: Player[]): { label: string; gk: number } {
  const n = (pos: Position) => squad.filter((p) => p.pos === pos).length
  return { label: `${n('DEF')}-${n('MID')}-${n('FWD')}`, gk: n('GK') }
}

// ── Tournament setup ────────────────────────────────────────────────
export interface TournamentSetup {
  groupName: string
  /** length 8: [group foe ×3, knockout foe ×5] */
  opponents: NationalTeam[]
}

/** Drop the player into a random real group (facing 3 of its teams), then draw
 *  five knockout opponents, biased stronger in later rounds. */
export function setupTournament(): TournamentSetup {
  const group = pick(GROUPS)
  const foes = shuffle(group.teams)
    .slice(0, 3)
    .map((n) => teamByName(n))
    .filter((t): t is NationalTeam => Boolean(t))

  const used = new Set(foes.map((f) => f.name))
  const knockout = ROUNDS.slice(3).map((r) => {
    const pool = TEAMS.filter((t) => t.rating >= r.minOppRating && !used.has(t.name))
    const choice = pool.length ? pick(pool) : pick(TEAMS.filter((t) => !used.has(t.name)))
    used.add(choice.name)
    return choice
  })

  return { groupName: group.name, opponents: [...foes, ...knockout] }
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
  round: RoundDef,
  opponent: NationalTeam,
): MatchResult {
  // Our attack quality vs their overall; their attack vs our defence quality.
  const atkDiff = strength.attack - opponent.rating
  const defDiff = strength.defense - opponent.rating
  const myXG = clamp(1.35 + atkDiff * 0.05, 0.25, 5)
  const oppXG = clamp(1.35 - defDiff * 0.05, 0.2, 5)

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

// ── Group stage ─────────────────────────────────────────────────────
/** Quick rating-only result for two opponent nations (for the group table). */
function teamGoals(rA: number, rB: number): [number, number] {
  const xa = clamp(1.35 + (rA - rB) * 0.05, 0.25, 5)
  const xb = clamp(1.35 - (rA - rB) * 0.05, 0.25, 5)
  return [poisson(xa), poisson(xb)]
}

interface Standing {
  key: string
  w: number
  d: number
  l: number
  pts: number
  gf: number
  ga: number
  gd: number
}

export type QualifiedAs = 'group winners' | 'runners-up' | 'best third'

/** A row in the final group table, ready to render. */
export interface GroupRow {
  team: string
  flag: string
  w: number
  d: number
  l: number
  gf: number
  ga: number
  gd: number
  pts: number
  me: boolean
}

export interface GroupOutcome {
  standing: number // 1-4
  qualified: boolean
  qualifiedAs: QualifiedAs | null
  table: GroupRow[]
}

const newStanding = (key: string): Standing => ({
  key,
  w: 0,
  d: 0,
  l: 0,
  pts: 0,
  gf: 0,
  ga: 0,
  gd: 0,
})

const addResult = (s: Standing, gf: number, ga: number) => {
  s.gf += gf
  s.ga += ga
  if (gf > ga) {
    s.w++
    s.pts += 3
  } else if (gf === ga) {
    s.d++
    s.pts += 1
  } else {
    s.l++
  }
}

/** Build the 4-team table from the player's 3 matches plus the 3 games among
 *  the other group teams, then decide top-2 / best-third qualification. */
function resolveGroup(myMatches: MatchResult[], foes: NationalTeam[]): GroupOutcome {
  const me = newStanding('me')
  const opp = foes.map((_, i) => newStanding(`o${i}`))

  myMatches.forEach((m, i) => {
    addResult(me, m.myGoals, m.oppGoals)
    addResult(opp[i], m.oppGoals, m.myGoals)
  })
  for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) {
    const [ga, gb] = teamGoals(foes[a].rating, foes[b].rating)
    addResult(opp[a], ga, gb)
    addResult(opp[b], gb, ga)
  }

  const standings = [me, ...opp]
  standings.forEach((s) => (s.gd = s.gf - s.ga))
  standings.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf)
  const standing = standings.findIndex((s) => s.key === 'me') + 1

  const table: GroupRow[] = standings.map((s) => {
    const foe = s.key === 'me' ? null : foes[Number(s.key.slice(1))]
    return {
      team: foe ? foe.name : 'Your XI',
      flag: foe ? foe.flag : '⭐',
      w: s.w,
      d: s.d,
      l: s.l,
      gf: s.gf,
      ga: s.ga,
      gd: s.gd,
      pts: s.pts,
      me: s.key === 'me',
    }
  })

  if (standing <= 2) {
    return {
      standing,
      qualified: true,
      qualifiedAs: standing === 1 ? 'group winners' : 'runners-up',
      table,
    }
  }
  if (standing === 4) return { standing, qualified: false, qualifiedAs: null, table }

  // 3rd place: advance only if among the 8 best thirds. Model the other 11
  // groups' third-placed teams and count how many finish above us.
  const myThird = standings[2]
  let better = 0
  for (let i = 0; i < 11; i++) {
    const t = randomThird()
    if (t.pts > myThird.pts || (t.pts === myThird.pts && t.gd > myThird.gd)) better++
  }
  const qualified = better < 8
  return { standing: 3, qualified, qualifiedAs: qualified ? 'best third' : null, table }
}

/** A plausible third-placed team's points + goal difference. */
function randomThird(): { pts: number; gd: number } {
  const r = Math.random()
  const pts = r < 0.05 ? 0 : r < 0.23 ? 1 : r < 0.53 ? 2 : r < 0.83 ? 3 : 4
  const gd = Math.floor(Math.random() * 7) - 4 // -4..2
  return { pts, gd }
}

// ── Run a full tournament ───────────────────────────────────────────
export interface TournamentResult {
  results: MatchResult[]
  groupName: string
  groupStanding: number
  qualifiedAs: QualifiedAs | null
  groupTable: GroupRow[]
  champion: boolean
  perfect: boolean // won every match in normal time, no draws/pens
  eliminatedAt?: string
}

export function buildTournament(
  strength: Strength,
  setup: TournamentSetup,
): TournamentResult {
  const { opponents, groupName } = setup
  const results: MatchResult[] = []
  let perfect = true

  // ── Group stage: 3 games, then collective top-2 / best-third qualification
  const groupMatches = [0, 1, 2].map((i) =>
    simulateMatch(strength, ROUNDS[i], opponents[i]),
  )
  const group = resolveGroup(groupMatches, opponents.slice(0, 3))
  // a group result never eliminates on its own; only the final standing does
  groupMatches.forEach((m, i) => {
    m.advanced = i < 2 ? true : group.qualified
    if (m.outcome !== 'win') perfect = false
    results.push(m)
  })

  const common = {
    results,
    groupName,
    groupStanding: group.standing,
    qualifiedAs: group.qualifiedAs,
    groupTable: group.table,
  }

  if (!group.qualified) {
    return { ...common, champion: false, perfect: false, eliminatedAt: 'Group Stage' }
  }

  // ── Knockouts: 5 rounds, any loss (incl. on penalties) ends the run
  for (let i = 3; i < ROUNDS.length; i++) {
    const res = simulateMatch(strength, ROUNDS[i], opponents[i])
    results.push(res)
    if (res.outcome !== 'win') perfect = false
    if (!res.advanced) {
      return { ...common, champion: false, perfect: false, eliminatedAt: ROUNDS[i].name }
    }
  }

  return { ...common, champion: true, perfect }
}

export { PLAYERS, type Player, type Position, type NationalTeam }
