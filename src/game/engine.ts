import { PLAYERS, type Player, type Position } from '../data/players'
import { TEAMS, teamByName, type NationalTeam } from '../data/teams'
import { GROUPS, type Group } from '../data/groups'

// ── Squad / formations ──────────────────────────────────────────────
export const SQUAD_SIZE = 11

/** A formation defines how many of each position you must draft, plus a
 *  tactical bias on the match sim. */
export interface Formation {
  id: string
  name: string
  desc: string
  /** attacking intent — added to our expected goals (xG) */
  atk: number
  /** defensive solidity — subtracted from the opponent's xG */
  def: number
  /** required count per position (sums to SQUAD_SIZE) */
  need: Record<Position, number>
}

export type GroupKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L'

interface TournamentEntrant {
  name: string
  flag: string
  rating: number
  group: GroupKey
  isPlayer?: boolean
}

interface QualifiedTeam {
  team: TournamentEntrant
  place: 1 | 2 | 3
  pts: number
  gd: number
  gf: number
}

const groupKeyOf = (name: string): GroupKey => name.at(-1) as GroupKey
const entrantFromTeam = (team: NationalTeam, group: GroupKey): TournamentEntrant => ({
  ...team,
  group,
})
const playerEntrant = (group: GroupKey, rating: number): TournamentEntrant => ({
  name: 'Your XI',
  flag: '⭐',
  rating,
  group,
  isPlayer: true,
})

export const FORMATIONS: Formation[] = [
  {
    id: '433',
    name: '4-3-3',
    desc: 'Balanced attack — the modern default.',
    atk: 0.2,
    def: 0.0,
    need: { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  },
  {
    id: '442',
    name: '4-4-2',
    desc: 'Classic and solid, hard to break down.',
    atk: 0.05,
    def: 0.12,
    need: { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  },
  {
    id: '4231',
    name: '4-2-3-1',
    desc: 'Controlled — possession through midfield.',
    atk: 0.1,
    def: 0.1,
    need: { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  },
  {
    id: '352',
    name: '3-5-2',
    desc: 'Midfield dominance, wing-backs bomb on.',
    atk: 0.18,
    def: 0.0,
    need: { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  },
  {
    id: '343',
    name: '3-4-3',
    desc: 'All-out attack — high risk, high reward.',
    atk: 0.35,
    def: -0.22,
    need: { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  },
  {
    id: '532',
    name: '5-3-2',
    desc: 'Park the bus and hit on the counter.',
    atk: -0.08,
    def: 0.28,
    need: { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  },
]

/** How many of each position are still to be drafted for this formation. */
export function remainingNeed(
  formation: Formation,
  squad: Player[],
): Record<Position, number> {
  const have: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
  squad.forEach((p) => have[p.pos]++)
  return {
    GK: formation.need.GK - have.GK,
    DEF: formation.need.DEF - have.DEF,
    MID: formation.need.MID - have.MID,
    FWD: formation.need.FWD - have.FWD,
  }
}

/** Positions that still have at least one slot open. */
export function neededPositions(formation: Formation, squad: Player[]): Set<Position> {
  const rem = remainingNeed(formation, squad)
  return new Set((Object.keys(rem) as Position[]).filter((p) => rem[p] > 0))
}

// ── Tournament structure (2026 format): 3 group games + 5 knockouts ──
export interface RoundDef {
  name: string
  knockout: boolean
  /** Retained for backward compatibility with the old sim shape. */
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

/** Draw a random country (biased to ones with players in a still-needed
 *  position) and return its available players, sorted by position then rating. */
export function draftCountry(
  takenIds: Set<string>,
  needed: Set<Position>,
): DraftDraw {
  const avail = TEAMS.map((t) => ({
    team: t,
    players: PLAYERS.filter((p) => p.nation === t.name && !takenIds.has(p.id)),
  })).filter((x) => x.players.length > 0)
  // prefer countries that can actually fill a slot we still need
  const useful = avail.filter((x) => x.players.some((p) => needed.has(p.pos)))
  const chosen = pick(useful.length ? useful : avail)
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

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)

/** Break the (formation-complete) squad into attacking and defensive quality. */
export function squadStrength(squad: Player[]): Strength {
  if (squad.length === 0) return { overall: 0, attack: 0, defense: 0 }
  const ratingsOf = (pos: Position) =>
    squad.filter((p) => p.pos === pos).map((p) => p.rating)
  const fwd = ratingsOf('FWD')
  const mid = ratingsOf('MID')
  const def = ratingsOf('DEF')
  const gk = ratingsOf('GK')

  const attack = avg(fwd) * 0.7 + avg(mid) * 0.3
  const defense = avg(def) * 0.6 + avg(gk) * 0.25 + avg(mid) * 0.15
  const overall = avg(squad.map((p) => p.rating))
  return { overall, attack, defense }
}

// ── Tournament setup ────────────────────────────────────────────────
export interface TournamentSetup {
  groupName: string
  groupKey: GroupKey
  /** The three real teams your XI faces in the group stage. */
  opponents: NationalTeam[]
}

/** Drop the player into a random real group, replacing one nation and facing
 *  the other three for an authentic group stage. */
export function setupTournament(): TournamentSetup {
  const group = pick(GROUPS)
  const opponents = shuffle(group.teams)
    .slice(0, 3)
    .map((n) => teamByName(n))
    .filter((t): t is NationalTeam => Boolean(t))
  return { groupName: group.name, groupKey: groupKeyOf(group.name), opponents }
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

export interface GoalEvent {
  name: string
  minute: number
}

export interface MatchStats {
  possession: number // our share, %
  shots: [number, number]
  sot: [number, number] // shots on target
  xg: [number, number]
}

export interface MatchResult {
  round: string
  knockout: boolean
  opponent: NationalTeam
  myGoals: number
  oppGoals: number
  myScorers: GoalEvent[]
  oppScorers: GoalEvent[]
  stats: MatchStats
  pens?: { me: number; opp: number }
  outcome: Outcome
  /** did we progress to the next round / survive the tournament */
  advanced: boolean
}

// likelihood of scoring by position
const SCORE_WEIGHT: Record<Position, number> = { FWD: 1, MID: 0.5, DEF: 0.18, GK: 0.02 }

function weightedIndex(weights: number[]): number {
  const total = weights.reduce((s, w) => s + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}

/** Attribute goals to players, weighted by position and rating, with minutes. */
function pickScorers(players: Player[], goals: number): GoalEvent[] {
  if (goals <= 0 || players.length === 0) return []
  const weights = players.map((p) => SCORE_WEIGHT[p.pos] * (0.5 + p.rating / 100))
  const minutes = new Set<number>()
  const events: GoalEvent[] = []
  for (let g = 0; g < goals; g++) {
    const p = players[weightedIndex(weights)]
    let m = 1 + Math.floor(Math.random() * 90)
    while (minutes.has(m)) m = 1 + Math.floor(Math.random() * 90)
    minutes.add(m)
    events.push({ name: p.name, minute: m })
  }
  return events.sort((a, b) => a.minute - b.minute)
}

const round1 = (x: number) => Math.round(x * 10) / 10

function matchStats(
  myXG: number,
  oppXG: number,
  myGoals: number,
  oppGoals: number,
  myOverall: number,
  oppRating: number,
): MatchStats {
  const possession = clamp(Math.round(50 + (myOverall - oppRating) * 0.7), 28, 72)
  const myShots = Math.max(myGoals, Math.round(myXG * 7 + 2 + Math.random() * 5))
  const oppShots = Math.max(oppGoals, Math.round(oppXG * 7 + 2 + Math.random() * 5))
  const mySot = clamp(Math.round(myShots * 0.45), myGoals, myShots)
  const oppSot = clamp(Math.round(oppShots * 0.45), oppGoals, oppShots)
  return {
    possession,
    shots: [myShots, oppShots],
    sot: [mySot, oppSot],
    xg: [round1(myXG), round1(oppXG)],
  }
}

export function simulateMatch(
  strength: Strength,
  formation: Formation,
  round: RoundDef,
  opponent: NationalTeam,
  squad: Player[],
): MatchResult {
  // Our attack quality vs their overall; their attack vs our defence quality,
  // nudged by the formation's tactical bias.
  const atkDiff = strength.attack - opponent.rating
  const defDiff = strength.defense - opponent.rating
  const myXG = clamp(1.35 + atkDiff * 0.05 + formation.atk, 0.25, 5)
  const oppXG = clamp(1.35 - defDiff * 0.05 - formation.def, 0.2, 5)

  const myGoals = poisson(myXG)
  const oppGoals = poisson(oppXG)

  const oppSquad = PLAYERS.filter((p) => p.nation === opponent.name)
  const base: MatchResult = {
    round: round.name,
    knockout: round.knockout,
    opponent,
    myGoals,
    oppGoals,
    myScorers: pickScorers(squad, myGoals),
    oppScorers: pickScorers(oppSquad, oppGoals),
    stats: matchStats(myXG, oppXG, myGoals, oppGoals, strength.overall, opponent.rating),
    outcome: 'win',
    advanced: true,
  }

  if (myGoals > oppGoals) return { ...base, outcome: 'win', advanced: true }
  if (myGoals < oppGoals) return { ...base, outcome: 'loss', advanced: false }

  if (!round.knockout) return { ...base, outcome: 'draw', advanced: true }

  const diff = strength.overall - opponent.rating
  const pWin = clamp(0.5 + diff * 0.012, 0.12, 0.88)
  const iWin = Math.random() < pWin
  const winnerPens = 3 + Math.floor(Math.random() * 3)
  const loserPens = Math.floor(Math.random() * winnerPens)
  const pens = iWin
    ? { me: winnerPens, opp: loserPens }
    : { me: loserPens, opp: winnerPens }

  return { ...base, outcome: 'draw', pens, advanced: iWin }
}

// ── Group stage ─────────────────────────────────────────────────────
/** Quick rating-only result for two sides in neutral simulations. */
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

interface NationStanding {
  team: NationalTeam
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
  placements: QualifiedTeam[]
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

function compareQualifiedTeams(a: QualifiedTeam, b: QualifiedTeam): number {
  // FIFA uses ranking as a final fallback; the app's team rating is a reasonable proxy.
  return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || b.team.rating - a.team.rating
}

/** Build the 4-team table from the player's 3 matches plus the 3 games among
 *  the other group teams. */
function resolveGroup(
  myMatches: MatchResult[],
  foes: NationalTeam[],
  groupKey: GroupKey,
  playerRating: number,
): GroupOutcome {
  const me = newStanding('me')
  const opp = foes.map((_, i) => newStanding(`o${i}`))
  const ratingOf = (key: string) =>
    key === 'me' ? playerRating : foes[Number(key.slice(1))].rating

  myMatches.forEach((m, i) => {
    addResult(me, m.myGoals, m.oppGoals)
    addResult(opp[i], m.oppGoals, m.myGoals)
  })
  for (const [a, b] of [
    [0, 1],
    [0, 2],
    [1, 2],
  ] as const) {
    const [ga, gb] = teamGoals(foes[a].rating, foes[b].rating)
    addResult(opp[a], ga, gb)
    addResult(opp[b], gb, ga)
  }

  const standings = [me, ...opp]
  standings.forEach((s) => (s.gd = s.gf - s.ga))
  standings.sort(
    (x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || ratingOf(y.key) - ratingOf(x.key),
  )
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

  const placements: QualifiedTeam[] = standings.slice(0, 3).map((s, i) => {
    const foe = s.key === 'me' ? null : foes[Number(s.key.slice(1))]
    return {
      team: foe ? entrantFromTeam(foe, groupKey) : playerEntrant(groupKey, playerRating),
      place: (i + 1) as 1 | 2 | 3,
      pts: s.pts,
      gd: s.gd,
      gf: s.gf,
    }
  })

  if (standing <= 2) {
    return {
      standing,
      qualified: true,
      qualifiedAs: standing === 1 ? 'group winners' : 'runners-up',
      table,
      placements,
    }
  }
  return { standing, qualified: false, qualifiedAs: null, table, placements }
}

function roundRobinTable(teams: NationalTeam[]): NationStanding[] {
  const rows: NationStanding[] = teams.map((t) => ({
    team: t,
    w: 0,
    d: 0,
    l: 0,
    pts: 0,
    gf: 0,
    ga: 0,
    gd: 0,
  }))
  const bump = (s: NationStanding, gf: number, ga: number) => {
    s.gf += gf
    s.ga += ga
    if (gf > ga) {
      s.w += 1
      s.pts += 3
    } else if (gf === ga) {
      s.d += 1
      s.pts += 1
    } else {
      s.l += 1
    }
  }
  for (let a = 0; a < teams.length; a++) {
    for (let b = a + 1; b < teams.length; b++) {
      const [ga, gb] = teamGoals(teams[a].rating, teams[b].rating)
      bump(rows[a], ga, gb)
      bump(rows[b], gb, ga)
    }
  }
  rows.forEach((r) => (r.gd = r.gf - r.ga))
  return rows.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || y.team.rating - x.team.rating)
}

interface SimulatedGroup {
  name: string
  table: GroupRow[]
  placements: QualifiedTeam[]
}

function simulateNeutralGroup(group: Group): SimulatedGroup {
  const groupKey = groupKeyOf(group.name)
  const teams = group.teams
    .map((n) => teamByName(n))
    .filter((t): t is NationalTeam => Boolean(t))
  const table = roundRobinTable(teams)
  return {
    name: group.name,
    table: table.map((standing) => ({
      team: standing.team.name,
      flag: standing.team.flag,
      w: standing.w,
      d: standing.d,
      l: standing.l,
      gf: standing.gf,
      ga: standing.ga,
      gd: standing.gd,
      pts: standing.pts,
      me: false,
    })),
    placements: table.slice(0, 3).map((standing, i) => ({
      team: entrantFromTeam(standing.team, groupKey),
      place: (i + 1) as 1 | 2 | 3,
      pts: standing.pts,
      gd: standing.gd,
      gf: standing.gf,
    })),
  }
}

// ── Knockout bracket ────────────────────────────────────────────────
type SlotSpec =
  | { kind: 'winner' | 'runner'; group: GroupKey }
  | { kind: 'third'; allowed: GroupKey[] }

interface RoundOf32Fixture {
  matchNo: number
  home: SlotSpec
  away: SlotSpec
}

interface BracketFixture {
  matchNo: number
  round: string
  left: number
  right: number
}

const ROUND_OF_32_FIXTURES: RoundOf32Fixture[] = [
  { matchNo: 73, home: { kind: 'runner', group: 'A' }, away: { kind: 'runner', group: 'B' } },
  {
    matchNo: 74,
    home: { kind: 'winner', group: 'E' },
    away: { kind: 'third', allowed: ['A', 'B', 'C', 'D', 'F'] },
  },
  { matchNo: 75, home: { kind: 'winner', group: 'F' }, away: { kind: 'runner', group: 'C' } },
  { matchNo: 76, home: { kind: 'winner', group: 'C' }, away: { kind: 'runner', group: 'F' } },
  {
    matchNo: 77,
    home: { kind: 'winner', group: 'I' },
    away: { kind: 'third', allowed: ['C', 'D', 'F', 'G', 'H'] },
  },
  { matchNo: 78, home: { kind: 'runner', group: 'E' }, away: { kind: 'runner', group: 'I' } },
  {
    matchNo: 79,
    home: { kind: 'winner', group: 'A' },
    away: { kind: 'third', allowed: ['C', 'E', 'F', 'H', 'I'] },
  },
  {
    matchNo: 80,
    home: { kind: 'winner', group: 'L' },
    away: { kind: 'third', allowed: ['E', 'H', 'I', 'J', 'K'] },
  },
  {
    matchNo: 81,
    home: { kind: 'winner', group: 'D' },
    away: { kind: 'third', allowed: ['B', 'E', 'F', 'I', 'J'] },
  },
  {
    matchNo: 82,
    home: { kind: 'winner', group: 'G' },
    away: { kind: 'third', allowed: ['A', 'E', 'H', 'I', 'J'] },
  },
  { matchNo: 83, home: { kind: 'runner', group: 'K' }, away: { kind: 'runner', group: 'L' } },
  { matchNo: 84, home: { kind: 'winner', group: 'H' }, away: { kind: 'runner', group: 'J' } },
  {
    matchNo: 85,
    home: { kind: 'winner', group: 'B' },
    away: { kind: 'third', allowed: ['E', 'F', 'G', 'I', 'J'] },
  },
  { matchNo: 86, home: { kind: 'winner', group: 'J' }, away: { kind: 'runner', group: 'H' } },
  {
    matchNo: 87,
    home: { kind: 'winner', group: 'K' },
    away: { kind: 'third', allowed: ['D', 'E', 'I', 'J', 'L'] },
  },
  { matchNo: 88, home: { kind: 'runner', group: 'D' }, away: { kind: 'runner', group: 'G' } },
]

const BRACKET_FIXTURES: BracketFixture[] = [
  { matchNo: 89, round: 'Round of 16', left: 74, right: 77 },
  { matchNo: 90, round: 'Round of 16', left: 73, right: 75 },
  { matchNo: 91, round: 'Round of 16', left: 76, right: 78 },
  { matchNo: 92, round: 'Round of 16', left: 79, right: 80 },
  { matchNo: 93, round: 'Round of 16', left: 83, right: 84 },
  { matchNo: 94, round: 'Round of 16', left: 81, right: 82 },
  { matchNo: 95, round: 'Round of 16', left: 86, right: 88 },
  { matchNo: 96, round: 'Round of 16', left: 85, right: 87 },
  { matchNo: 97, round: 'Quarter-Final', left: 89, right: 90 },
  { matchNo: 98, round: 'Quarter-Final', left: 93, right: 94 },
  { matchNo: 99, round: 'Quarter-Final', left: 91, right: 92 },
  { matchNo: 100, round: 'Quarter-Final', left: 95, right: 96 },
  { matchNo: 101, round: 'Semi-Final', left: 97, right: 98 },
  { matchNo: 102, round: 'Semi-Final', left: 99, right: 100 },
  { matchNo: 104, round: 'Final', left: 101, right: 102 },
]

function assignThirdTeams(thirds: QualifiedTeam[]): Map<number, TournamentEntrant> {
  const thirdByGroup = new Map(thirds.map((third) => [third.team.group, third.team]))
  const slots = ROUND_OF_32_FIXTURES.filter(
    (fixture) => fixture.home.kind === 'third' || fixture.away.kind === 'third',
  )
    .map((fixture) => ({
      matchNo: fixture.matchNo,
      allowed:
        fixture.home.kind === 'third'
          ? fixture.home.allowed
          : fixture.away.kind === 'third'
            ? fixture.away.allowed
            : [],
    }))
    .map((slot) => ({
      ...slot,
      candidates: slot.allowed.filter((group) => thirdByGroup.has(group)),
    }))
    .sort((a, b) => a.candidates.length - b.candidates.length)

  const used = new Set<GroupKey>()
  const assigned = new Map<number, TournamentEntrant>()

  function dfs(index: number): boolean {
    if (index >= slots.length) return true
    const slot = slots[index]
    for (const group of slot.candidates) {
      if (used.has(group)) continue
      used.add(group)
      assigned.set(slot.matchNo, thirdByGroup.get(group)!)
      if (dfs(index + 1)) return true
      assigned.delete(slot.matchNo)
      used.delete(group)
    }
    return false
  }

  if (!dfs(0)) throw new Error('Could not seed the best third-placed teams into the bracket')
  return assigned
}

function buildRoundOf32(
  winners: Map<GroupKey, TournamentEntrant>,
  runners: Map<GroupKey, TournamentEntrant>,
  thirds: QualifiedTeam[],
): Array<{ matchNo: number; home: TournamentEntrant; away: TournamentEntrant }> {
  const assignedThirds = assignThirdTeams(thirds)
  const resolveSlot = (matchNo: number, slot: SlotSpec): TournamentEntrant => {
    if (slot.kind === 'winner') return winners.get(slot.group)!
    if (slot.kind === 'runner') return runners.get(slot.group)!
    return assignedThirds.get(matchNo)!
  }
  return ROUND_OF_32_FIXTURES.map((fixture) => ({
    matchNo: fixture.matchNo,
    home: resolveSlot(fixture.matchNo, fixture.home),
    away: resolveSlot(fixture.matchNo, fixture.away),
  }))
}

interface NeutralKnockout {
  winner: TournamentEntrant
  loser: TournamentEntrant
  score: [number, number]
  pens: boolean
}

function simulateNeutralKnockout(
  home: TournamentEntrant,
  away: TournamentEntrant,
): NeutralKnockout {
  const [homeGoals, awayGoals] = teamGoals(home.rating, away.rating)
  if (homeGoals !== awayGoals) {
    const homeWon = homeGoals > awayGoals
    return {
      winner: homeWon ? home : away,
      loser: homeWon ? away : home,
      score: [homeGoals, awayGoals],
      pens: false,
    }
  }

  const pHomeWin = clamp(0.5 + (home.rating - away.rating) * 0.012, 0.12, 0.88)
  const homeWonPens = Math.random() < pHomeWin
  return {
    winner: homeWonPens ? home : away,
    loser: homeWonPens ? away : home,
    score: [homeGoals, awayGoals],
    pens: true,
  }
}

interface KnockoutSimulation {
  winner: TournamentEntrant
  loser: TournamentEntrant
  playerResult?: MatchResult
  score: [number, number]
  pens: boolean
}

function simulateKnockout(
  round: string,
  home: TournamentEntrant,
  away: TournamentEntrant,
  strength: Strength,
  formation: Formation,
  squad: Player[],
): KnockoutSimulation {
  if (home.isPlayer || away.isPlayer) {
    const player = home.isPlayer ? home : away
    const opponent = home.isPlayer ? away : home
    const result = simulateMatch(
      strength,
      formation,
      { name: round, knockout: true, minOppRating: 0 },
      opponent as NationalTeam,
      squad,
    )
    const playerWon = result.advanced
    return {
      winner: playerWon ? player : opponent,
      loser: playerWon ? opponent : player,
      playerResult: result,
      score: home.isPlayer ? [result.myGoals, result.oppGoals] : [result.oppGoals, result.myGoals],
      pens: Boolean(result.pens),
    }
  }

  return simulateNeutralKnockout(home, away)
}

// ── Run a full tournament ───────────────────────────────────────────
export interface WorldCupResult {
  champion: { name: string; flag: string }
  runnerUp: { name: string; flag: string }
  finalScore: [number, number]
  finalPens: boolean
}

export interface TournamentGroupSummary {
  name: string
  rows: GroupRow[]
  standing: number
  qualifiedAs: QualifiedAs | null
  playerGroup: boolean
}

export interface TournamentBracketMatch {
  matchNo: number
  round: string
  home: { name: string; flag: string; isPlayer?: boolean }
  away: { name: string; flag: string; isPlayer?: boolean }
  score: [number, number]
  pens: boolean
  winner: 'home' | 'away'
  playerMatch: boolean
}

export interface TournamentResult {
  results: MatchResult[]
  groupName: string
  groupStanding: number
  qualifiedAs: QualifiedAs | null
  groupTable: GroupRow[]
  groupSummaries: TournamentGroupSummary[]
  knockoutTree: TournamentBracketMatch[]
  champion: boolean
  perfect: boolean // won every match in normal time, no draws/pens
  eliminatedAt?: string
  worldCup: WorldCupResult | null
}

export function buildTournament(
  strength: Strength,
  formation: Formation,
  squad: Player[],
  setup: TournamentSetup,
): TournamentResult {
  const { opponents, groupName, groupKey } = setup

  const results: MatchResult[] = [0, 1, 2].map((i) =>
    simulateMatch(strength, formation, ROUNDS[i], opponents[i], squad),
  )
  const playerGroup = resolveGroup(results, opponents, groupKey, strength.overall)

  const neutralGroups = GROUPS.filter((group) => groupKeyOf(group.name) !== groupKey)
    .map(simulateNeutralGroup)
    .sort((a, b) => a.name.localeCompare(b.name))
  const placements = [playerGroup.placements, ...neutralGroups.map((group) => group.placements)]
  const winners = new Map<GroupKey, TournamentEntrant>()
  const runners = new Map<GroupKey, TournamentEntrant>()
  placements.forEach((groupPlacements) => {
    winners.set(groupPlacements[0].team.group, groupPlacements[0].team)
    runners.set(groupPlacements[1].team.group, groupPlacements[1].team)
  })

  const qualifiedThirds = placements
    .map((groupPlacements) => groupPlacements[2])
    .sort(compareQualifiedTeams)
    .slice(0, 8)
  const playerThirdQualified = qualifiedThirds.some((entry) => entry.team.isPlayer)
  const qualifiedAs =
    playerGroup.standing <= 2
      ? playerGroup.qualifiedAs
      : playerThirdQualified
        ? 'best third'
        : null
  const groupQualified = playerGroup.standing <= 2 || playerThirdQualified

  results[0].advanced = true
  results[1].advanced = true
  results[2].advanced = groupQualified

  const roundOf32 = buildRoundOf32(winners, runners, qualifiedThirds)
  const winnersByMatch = new Map<number, TournamentEntrant>()
  const knockoutTree: TournamentBracketMatch[] = []
  let finalSummary: WorldCupResult | null = null

  for (const fixture of roundOf32) {
    const sim = simulateKnockout('Round of 32', fixture.home, fixture.away, strength, formation, squad)
    winnersByMatch.set(fixture.matchNo, sim.winner)
    knockoutTree.push({
      matchNo: fixture.matchNo,
      round: 'Round of 32',
      home: { name: fixture.home.name, flag: fixture.home.flag, isPlayer: fixture.home.isPlayer },
      away: { name: fixture.away.name, flag: fixture.away.flag, isPlayer: fixture.away.isPlayer },
      score: sim.score,
      pens: sim.pens,
      winner: sim.winner === fixture.home ? 'home' : 'away',
      playerMatch: Boolean(fixture.home.isPlayer || fixture.away.isPlayer),
    })
    if (sim.playerResult) results.push(sim.playerResult)
  }

  for (const fixture of BRACKET_FIXTURES) {
    const left = winnersByMatch.get(fixture.left)!
    const right = winnersByMatch.get(fixture.right)!
    const sim = simulateKnockout(fixture.round, left, right, strength, formation, squad)
    winnersByMatch.set(fixture.matchNo, sim.winner)
    knockoutTree.push({
      matchNo: fixture.matchNo,
      round: fixture.round,
      home: { name: left.name, flag: left.flag, isPlayer: left.isPlayer },
      away: { name: right.name, flag: right.flag, isPlayer: right.isPlayer },
      score: sim.score,
      pens: sim.pens,
      winner: sim.winner === left ? 'home' : 'away',
      playerMatch: Boolean(left.isPlayer || right.isPlayer),
    })
    if (sim.playerResult) results.push(sim.playerResult)
    if (fixture.matchNo === 104) {
      finalSummary = sim.winner.isPlayer
        ? null
        : {
            champion: { name: sim.winner.name, flag: sim.winner.flag },
            runnerUp: { name: sim.loser.name, flag: sim.loser.flag },
            finalScore:
              sim.winner === left ? sim.score : ([sim.score[1], sim.score[0]] as [number, number]),
            finalPens: sim.pens,
          }
    }
  }

  const champion = winnersByMatch.get(104)?.isPlayer ?? false
  const perfect = champion && results.every((result) => result.outcome === 'win')
  const groupSummaries: TournamentGroupSummary[] = [
    {
      name: groupName,
      rows: playerGroup.table,
      standing: playerGroup.standing,
      qualifiedAs,
      playerGroup: true,
    },
    ...neutralGroups.map((group) => {
      const thirdQualified = qualifiedThirds.some(
        (qualified) =>
          qualified.place === 3 && qualified.team.group === groupKeyOf(group.name),
      )
      return {
        name: group.name,
        rows: group.table,
        standing: thirdQualified ? 3 : 0,
        qualifiedAs: thirdQualified ? 'best third' : null,
        playerGroup: false,
      } satisfies TournamentGroupSummary
    }),
  ]

  if (!groupQualified) {
    return {
      results,
      groupName,
      groupStanding: playerGroup.standing,
      qualifiedAs,
      groupTable: playerGroup.table,
      groupSummaries,
      knockoutTree,
      champion: false,
      perfect: false,
      eliminatedAt: 'Group Stage',
      worldCup: finalSummary,
    }
  }

  if (!champion) {
    return {
      results,
      groupName,
      groupStanding: playerGroup.standing,
      qualifiedAs,
      groupTable: playerGroup.table,
      groupSummaries,
      knockoutTree,
      champion: false,
      perfect: false,
      eliminatedAt: results[results.length - 1]?.round ?? 'Group Stage',
      worldCup: finalSummary,
    }
  }

  return {
    results,
    groupName,
    groupStanding: playerGroup.standing,
    qualifiedAs,
    groupTable: playerGroup.table,
    groupSummaries,
    knockoutTree,
    champion: true,
    perfect,
    worldCup: null,
  }
}

// ── Independent "actual" World Cup ──────────────────────────────────
// Still exported for compatibility, but the player-facing tournament now uses
// the same bracket all the way to the final instead of a separate sim.
export function simulateWorldCup(): WorldCupResult {
  const placements = GROUPS.map(simulateNeutralGroup)
  const winners = new Map<GroupKey, TournamentEntrant>()
  const runners = new Map<GroupKey, TournamentEntrant>()
  placements.forEach((groupPlacements) => {
    winners.set(groupPlacements.placements[0].team.group, groupPlacements.placements[0].team)
    runners.set(groupPlacements.placements[1].team.group, groupPlacements.placements[1].team)
  })
  const qualifiedThirds = placements
    .map((groupPlacements) => groupPlacements.placements[2])
    .sort(compareQualifiedTeams)
    .slice(0, 8)

  const roundOf32 = buildRoundOf32(winners, runners, qualifiedThirds)
  const winnersByMatch = new Map<number, TournamentEntrant>()
  let finalSummary: WorldCupResult | null = null

  for (const fixture of roundOf32) {
    const sim = simulateNeutralKnockout(fixture.home, fixture.away)
    winnersByMatch.set(fixture.matchNo, sim.winner)
  }
  for (const fixture of BRACKET_FIXTURES) {
    const sim = simulateNeutralKnockout(
      winnersByMatch.get(fixture.left)!,
      winnersByMatch.get(fixture.right)!,
    )
    winnersByMatch.set(fixture.matchNo, sim.winner)
    if (fixture.matchNo === 104) {
      finalSummary = {
        champion: { name: sim.winner.name, flag: sim.winner.flag },
        runnerUp: { name: sim.loser.name, flag: sim.loser.flag },
        finalScore:
          sim.winner === winnersByMatch.get(fixture.left)!
            ? sim.score
            : ([sim.score[1], sim.score[0]] as [number, number]),
        finalPens: sim.pens,
      }
    }
  }

  return finalSummary!
}

// ── Bookies' prediction ─────────────────────────────────────────────
// Monte-Carlo the player's exact squad through many tournaments to estimate
// how far they're likely to get and their odds of winning it all.

export interface Prediction {
  winPct: number // chance of lifting the trophy
  koPct: number // chance of reaching the knockouts
  tipStage: string // deepest stage they're more likely than not to reach
  oddsToWin: string // fractional, e.g. "12/1"
}

const STAGE_DEPTH: Record<string, number> = {
  'Group Stage': 0,
  'Round of 32': 1,
  'Round of 16': 2,
  'Quarter-Final': 3,
  'Semi-Final': 4,
  Final: 5,
  Champions: 6,
}
const STAGE_LABEL = [
  'Group Stage',
  'Round of 32',
  'Round of 16',
  'Quarter-Final',
  'Semi-Final',
  'Final',
  'Champions',
]

function toOdds(p: number): string {
  if (p <= 0.002) return '500/1'
  const frac = 1 / p - 1
  let r: number
  if (frac >= 20) r = Math.round(frac / 10) * 10
  else if (frac >= 6) r = Math.round(frac / 2) * 2
  else r = Math.max(1, Math.round(frac))
  return `${r}/1`
}

export function predictRun(
  strength: Strength,
  formation: Formation,
  squad: Player[],
  samples = 400,
): Prediction {
  const depths: number[] = []
  let win = 0
  for (let i = 0; i < samples; i++) {
    const r = buildTournament(strength, formation, squad, setupTournament())
    const stage = r.champion ? 'Champions' : (r.eliminatedAt ?? 'Group Stage')
    depths.push(STAGE_DEPTH[stage])
    if (r.champion) win++
  }
  const reach = (d: number) => depths.filter((x) => x >= d).length / samples
  let tip = 0
  for (let d = 1; d <= 6; d++) if (reach(d) >= 0.5) tip = d
  const winPct = win / samples
  return {
    winPct,
    koPct: reach(1),
    tipStage: STAGE_LABEL[tip],
    oddsToWin: toOdds(winPct),
  }
}

export { PLAYERS, type Player, type Position, type NationalTeam }
