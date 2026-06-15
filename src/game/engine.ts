import { PLAYERS, type Player, type Position } from '../data/players'
import { TEAMS, teamByName, type NationalTeam } from '../data/teams'
import { GROUPS } from '../data/groups'

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

export const FORMATIONS: Formation[] = [
  { id: '433', name: '4-3-3', desc: 'Balanced attack — the modern default.', atk: 0.2, def: 0.0, need: { GK: 1, DEF: 4, MID: 3, FWD: 3 } },
  { id: '442', name: '4-4-2', desc: 'Classic and solid, hard to break down.', atk: 0.05, def: 0.12, need: { GK: 1, DEF: 4, MID: 4, FWD: 2 } },
  { id: '4231', name: '4-2-3-1', desc: 'Controlled — possession through midfield.', atk: 0.1, def: 0.1, need: { GK: 1, DEF: 4, MID: 5, FWD: 1 } },
  { id: '352', name: '3-5-2', desc: 'Midfield dominance, wing-backs bomb on.', atk: 0.18, def: 0.0, need: { GK: 1, DEF: 3, MID: 5, FWD: 2 } },
  { id: '343', name: '3-4-3', desc: 'All-out attack — high risk, high reward.', atk: 0.35, def: -0.22, need: { GK: 1, DEF: 3, MID: 4, FWD: 3 } },
  { id: '532', name: '5-3-2', desc: 'Park the bus and hit on the counter.', atk: -0.08, def: 0.28, need: { GK: 1, DEF: 5, MID: 3, FWD: 2 } },
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
  formation: Formation,
  squad: Player[],
  setup: TournamentSetup,
): TournamentResult {
  const { opponents, groupName } = setup
  const results: MatchResult[] = []
  let perfect = true

  // ── Group stage: 3 games, then collective top-2 / best-third qualification
  const groupMatches = [0, 1, 2].map((i) =>
    simulateMatch(strength, formation, ROUNDS[i], opponents[i], squad),
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
    const res = simulateMatch(strength, formation, ROUNDS[i], opponents[i], squad)
    results.push(res)
    if (res.outcome !== 'win') perfect = false
    if (!res.advanced) {
      return { ...common, champion: false, perfect: false, eliminatedAt: ROUNDS[i].name }
    }
  }

  return { ...common, champion: true, perfect }
}

// ── Independent "actual" World Cup ──────────────────────────────────
// Simulates the full 48-nation tournament (real groups → top 2 + 8 best
// thirds → knockout bracket) to crown a champion, independent of the player.

export interface WorldCupResult {
  champion: NationalTeam
  runnerUp: NationalTeam
  finalScore: [number, number]
  finalPens: boolean
}

interface NationStanding {
  team: NationalTeam
  pts: number
  gf: number
  ga: number
  gd: number
}

function roundRobinTable(teams: NationalTeam[]): NationStanding[] {
  const rows: NationStanding[] = teams.map((t) => ({ team: t, pts: 0, gf: 0, ga: 0, gd: 0 }))
  const bump = (s: NationStanding, gf: number, ga: number) => {
    s.gf += gf
    s.ga += ga
    if (gf > ga) s.pts += 3
    else if (gf === ga) s.pts += 1
  }
  for (let a = 0; a < teams.length; a++) {
    for (let b = a + 1; b < teams.length; b++) {
      const [ga, gb] = teamGoals(teams[a].rating, teams[b].rating)
      bump(rows[a], ga, gb)
      bump(rows[b], gb, ga)
    }
  }
  rows.forEach((r) => (r.gd = r.gf - r.ga))
  return rows.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf)
}

/** Winner of a single knockout tie (penalties on a draw, weighted by rating). */
function knockoutWinner(a: NationalTeam, b: NationalTeam): NationalTeam {
  const [ga, gb] = teamGoals(a.rating, b.rating)
  if (ga > gb) return a
  if (gb > ga) return b
  const pWin = clamp(0.5 + (a.rating - b.rating) * 0.012, 0.12, 0.88)
  return Math.random() < pWin ? a : b
}

export function simulateWorldCup(): WorldCupResult {
  const advancers: NationalTeam[] = []
  const thirds: NationStanding[] = []
  for (const g of GROUPS) {
    const teams = g.teams
      .map((n) => teamByName(n))
      .filter((t): t is NationalTeam => Boolean(t))
    const table = roundRobinTable(teams)
    advancers.push(table[0].team, table[1].team)
    thirds.push(table[2])
  }
  thirds.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf)
  advancers.push(...thirds.slice(0, 8).map((t) => t.team)) // 24 + 8 = 32

  let round = shuffle(advancers)
  let runnerUp = round[0]
  let finalScore: [number, number] = [0, 0]
  let finalPens = false
  while (round.length > 1) {
    const next: NationalTeam[] = []
    for (let i = 0; i < round.length; i += 2) {
      const a = round[i]
      const b = round[i + 1]
      if (round.length === 2) {
        const [ga, gb] = teamGoals(a.rating, b.rating)
        finalPens = ga === gb
        const winner = finalPens ? knockoutWinner(a, b) : ga > gb ? a : b
        finalScore = [ga, gb]
        runnerUp = winner === a ? b : a
        next.push(winner)
      } else {
        next.push(knockoutWinner(a, b))
      }
    }
    round = next
  }
  return { champion: round[0], runnerUp, finalScore, finalPens }
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
  'Final': 5,
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
  samples = 1000,
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
  // tip = deepest stage they're more likely than not (>=50%) to reach
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
