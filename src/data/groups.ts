// The 12 groups of the 2026 FIFA World Cup (per the official draw). Team names
// match those in teams.ts. Top two of each group plus the eight best
// third-placed teams advance to the Round of 32.

export interface Group {
  name: string
  teams: string[]
}

export const GROUPS: Group[] = [
  { name: 'Group A', teams: ['Mexico', 'Czech Republic', 'South Korea', 'South Africa'] },
  { name: 'Group B', teams: ['Switzerland', 'Canada', 'Qatar', 'Bosnia and Herzegovina'] },
  { name: 'Group C', teams: ['Brazil', 'Morocco', 'Scotland', 'Haiti'] },
  { name: 'Group D', teams: ['United States', 'Turkey', 'Paraguay', 'Australia'] },
  { name: 'Group E', teams: ['Germany', 'Ecuador', 'Ivory Coast', 'Curaçao'] },
  { name: 'Group F', teams: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'] },
  { name: 'Group G', teams: ['Belgium', 'Egypt', 'Iran', 'New Zealand'] },
  { name: 'Group H', teams: ['Spain', 'Uruguay', 'Saudi Arabia', 'Cape Verde'] },
  { name: 'Group I', teams: ['France', 'Senegal', 'Norway', 'Iraq'] },
  { name: 'Group J', teams: ['Argentina', 'Austria', 'Algeria', 'Jordan'] },
  { name: 'Group K', teams: ['Portugal', 'Colombia', 'Uzbekistan', 'DR Congo'] },
  { name: 'Group L', teams: ['England', 'Croatia', 'Ghana', 'Panama'] },
]
