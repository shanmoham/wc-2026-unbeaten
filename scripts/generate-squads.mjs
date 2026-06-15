// Regenerates src/data/players.ts and src/data/teams.ts from Wikipedia's
// "2026 FIFA World Cup squads" article. First fetch the wikitext, then run:
//
//   curl -s "https://en.wikipedia.org/w/index.php?title=2026_FIFA_World_Cup_squads&action=raw" -o /tmp/squads.wiki
//   node scripts/generate-squads.mjs
//
import { readFileSync, writeFileSync } from 'fs'

const wiki = readFileSync('/tmp/squads.wiki', 'utf8')

// ── The 48 nations of the 2026 field: flag + base rating (≈ team strength) ──
const NATIONS = {
  'Argentina':              ['🇦🇷', 89],
  'France':                 ['🇫🇷', 89],
  'Spain':                  ['🇪🇸', 88],
  'Brazil':                 ['🇧🇷', 88],
  'England':                ['🏴󠁧󠁢󠁥󠁮󠁧󠁿', 88],
  'Portugal':               ['🇵🇹', 86],
  'Netherlands':            ['🇳🇱', 85],
  'Germany':                ['🇩🇪', 85],
  'Belgium':                ['🇧🇪', 84],
  'Uruguay':                ['🇺🇾', 84],
  'Croatia':                ['🇭🇷', 83],
  'Colombia':               ['🇨🇴', 83],
  'Morocco':                ['🇲🇦', 82],
  'Norway':                 ['🇳🇴', 82],
  'Switzerland':            ['🇨🇭', 81],
  'Senegal':                ['🇸🇳', 81],
  'Japan':                  ['🇯🇵', 81],
  'Austria':                ['🇦🇹', 81],
  'Mexico':                 ['🇲🇽', 80],
  'United States':          ['🇺🇸', 80],
  'Ecuador':                ['🇪🇨', 80],
  'Sweden':                 ['🇸🇪', 80],
  'South Korea':            ['🇰🇷', 80],
  'Bosnia and Herzegovina': ['🇧🇦', 80],
  'Turkey':                 ['🇹🇷', 80],
  'Czech Republic':         ['🇨🇿', 79],
  'Ivory Coast':            ['🇨🇮', 79],
  'Egypt':                  ['🇪🇬', 79],
  'Algeria':                ['🇩🇿', 79],
  'Canada':                 ['🇨🇦', 78],
  'Iran':                   ['🇮🇷', 78],
  'Scotland':               ['🏴󠁧󠁢󠁳󠁣󠁴󠁿', 77],
  'Australia':              ['🇦🇺', 76],
  'Tunisia':                ['🇹🇳', 76],
  'DR Congo':               ['🇨🇩', 76],
  'Ghana':                  ['🇬🇭', 76],
  'Paraguay':               ['🇵🇾', 75],
  'South Africa':           ['🇿🇦', 75],
  'Saudi Arabia':           ['🇸🇦', 74],
  'Cape Verde':             ['🇨🇻', 73],
  'Qatar':                  ['🇶🇦', 73],
  'Uzbekistan':             ['🇺🇿', 73],
  'Panama':                 ['🇵🇦', 73],
  'Iraq':                   ['🇮🇶', 73],
  'Jordan':                 ['🇯🇴', 72],
  'Curaçao':                ['🇨🇼', 71],
  'Haiti':                  ['🇭🇹', 71],
  'New Zealand':            ['🇳🇿', 70],
}

// ── Club prestige → rating bonus (substring match on display name, lowercased) ──
const CLUB_TIERS = [
  [10, ['real madrid', 'barcelona', 'manchester city', 'man city', 'liverpool',
       'arsenal', 'bayern munich', 'bayern', 'paris saint-germain', 'inter milan',
       'internazionale']],
  [6, ['chelsea', 'manchester united', 'man united', 'tottenham', 'atlético madrid',
       'atletico madrid', 'a.c. milan', 'ac milan', 'juventus', 'napoli',
       'borussia dortmund', 'bayer leverkusen', 'newcastle', 'aston villa', 'atalanta',
       'rb leipzig', 'as roma', 'a.s. roma', 'benfica', 'sporting cp', 'fc porto',
       'porto', 'ajax', 'psv', 'feyenoord', 'marseille', 'lyon']],
  [3, ['brighton', 'west ham', 'crystal palace', 'everton', 'fulham', 'wolverhampton',
       'wolves', 'brentford', 'nottingham forest', 'bournemouth', 'real sociedad',
       'villarreal', 'real betis', 'betis', 'athletic bilbao', 'sevilla', 'valencia',
       'girona', 'lazio', 'fiorentina', 'bologna', 'eintracht frankfurt', 'frankfurt',
       'vfb stuttgart', 'stuttgart', 'wolfsburg', 'monaco', 'lille', 'nice', 'lens',
       'galatasaray', 'fenerbahçe', 'fenerbahce', 'beşiktaş', 'besiktas', 'celtic',
       'rangers', 'shakhtar', 'al-nassr', 'al nassr', 'al-hilal', 'al hilal',
       'al-ittihad', 'inter miami', 'club brugge', 'slavia prague', 'red bull salzburg']],
]

function clubBonus(club) {
  const c = club.toLowerCase()
  for (const [bonus, names] of CLUB_TIERS) {
    if (names.some((n) => c.includes(n))) return bonus
  }
  return 0
}

const POS_MAP = { GK: 'GK', DF: 'DEF', MF: 'MID', FW: 'FWD' }

// stable small jitter from a name so squads aren't flat (-2..+2)
function jitter(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return (h % 5) - 2
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))

// split template params at top-level `|` only (respect [[ ]] and {{ }} nesting)
function splitParams(inner) {
  const parts = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2)
    if (two === '[[' || two === '{{') { depth++; cur += two; i++; continue }
    if (two === ']]' || two === '}}') { depth--; cur += two; i++; continue }
    const ch = inner[i]
    if (ch === '|' && depth === 0) { parts.push(cur); cur = '' }
    else cur += ch
  }
  parts.push(cur)
  return parts
}

function wikiText(v) {
  // [[A|B]] -> B, [[A]] -> A, strip refs/templates/bold
  let s = v
    .replace(/<ref[^>]*>.*?<\/ref>/gs, '')
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
  const m = s.match(/\[\[(.+?)\]\]/)
  if (m) {
    const inner = m[1].split('|')
    s = inner[inner.length - 1]
  }
  return s.replace(/'''?/g, '').replace(/[\[\]]/g, '').trim()
}

// ── parse ──
const nationSet = new Set(Object.keys(NATIONS))
const lines = wiki.split('\n')
let current = null
const players = []
const seen = new Set()

for (const line of lines) {
  const h = line.match(/^===\s*([^=].*?)\s*===/)
  if (h) {
    current = nationSet.has(h[1]) ? h[1] : null
    continue
  }
  if (!current) continue
  const pm = line.match(/\{\{nat fs g player\|(.+)\}\}\s*$/)
  if (!pm) continue
  const params = splitParams(pm[1])
  const kv = {}
  for (const p of params) {
    const idx = p.indexOf('=')
    if (idx > 0) kv[p.slice(0, idx).trim()] = p.slice(idx + 1)
  }
  const pos = POS_MAP[(kv.pos || '').trim().toUpperCase()]
  const name = wikiText(kv.name || '')
  const club = wikiText(kv.club || '')
  if (!pos || !name) continue

  const [flag, base] = NATIONS[current]
  // base = team strength; a typical squad player sits ~11 below it, with club
  // prestige (and a small spread) pushing stars back up.
  const rating = clamp(Math.round(base - 11 + clubBonus(club) + jitter(name)), 52, 94)
  const id = (name + '-' + current).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (seen.has(id)) continue
  seen.add(id)
  players.push({ id, name, nation: current, flag, pos, rating })
}

// ── sanity ──
const byNation = {}
players.forEach((p) => (byNation[p.nation] = (byNation[p.nation] || 0) + 1))
const posCount = {}
players.forEach((p) => (posCount[p.pos] = (posCount[p.pos] || 0) + 1))
console.log('players:', players.length, 'nations:', Object.keys(byNation).length)
console.log('by pos:', posCount)
const thin = Object.entries(byNation).filter(([, n]) => n < 20)
if (thin.length) console.log('THIN squads:', thin)

// ── emit players.ts ──
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const rows = players
  .map((p) => `  ['${esc(p.name)}', '${esc(p.nation)}', '${p.flag}', '${p.pos}', ${p.rating}],`)
  .join('\n')

const playersTs = `// Real 2026 FIFA World Cup squads (all 48 nations, 26 players each), parsed
// from Wikipedia's "2026 FIFA World Cup squads" article. Positions come from the
// source; ratings are a heuristic (nation strength + club prestige + small spread)
// and are NOT official. Regenerate with scripts/generate-squads.mjs.

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD'

export interface Player {
  id: string
  name: string
  nation: string
  flag: string
  pos: Position
  rating: number
}

// Raw rows: [name, nation, flag, pos, rating]
type Row = [string, string, string, Position, number]

const ROWS: Row[] = [
${rows}
]

export const PLAYERS: Player[] = ROWS.map(([name, nation, flag, pos, rating]) => ({
  id: (name + '-' + nation).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  name,
  nation,
  flag,
  pos,
  rating,
}))

export const playersByPos = (pos: Position): Player[] =>
  PLAYERS.filter((p) => p.pos === pos)
`
writeFileSync('/Users/shan.mohammed/Projects/wc-2026-unbeaten/src/data/players.ts', playersTs)

// ── emit teams.ts (the real 48-nation field) ──
const teamRows = Object.entries(NATIONS)
  .sort((a, b) => b[1][1] - a[1][1])
  .map(([name, [flag, rating]]) => `  { name: '${esc(name)}', flag: '${flag}', rating: ${rating} },`)
  .join('\n')

const teamsTs = `// The 48 nations of the 2026 FIFA World Cup field (per the official draw), with a
// rough overall strength rating used by the match simulation. Flags are emoji.

export interface NationalTeam {
  name: string
  flag: string
  rating: number
}

export const TEAMS: NationalTeam[] = [
${teamRows}
]

export const teamByName = (name: string): NationalTeam | undefined =>
  TEAMS.find((t) => t.name === name)
`
writeFileSync('/Users/shan.mohammed/Projects/wc-2026-unbeaten/src/data/teams.ts', teamsTs)
console.log('wrote players.ts and teams.ts')
