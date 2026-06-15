// The 48 nations of the 2026 FIFA World Cup field (per the official draw), with a
// rough overall strength rating used by the match simulation. Flags are emoji.

export interface NationalTeam {
  name: string
  flag: string
  rating: number
}

export const TEAMS: NationalTeam[] = [
  { name: 'Argentina', flag: '🇦🇷', rating: 89 },
  { name: 'France', flag: '🇫🇷', rating: 89 },
  { name: 'Spain', flag: '🇪🇸', rating: 88 },
  { name: 'Brazil', flag: '🇧🇷', rating: 88 },
  { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rating: 88 },
  { name: 'Portugal', flag: '🇵🇹', rating: 86 },
  { name: 'Netherlands', flag: '🇳🇱', rating: 85 },
  { name: 'Germany', flag: '🇩🇪', rating: 85 },
  { name: 'Belgium', flag: '🇧🇪', rating: 84 },
  { name: 'Uruguay', flag: '🇺🇾', rating: 84 },
  { name: 'Croatia', flag: '🇭🇷', rating: 83 },
  { name: 'Colombia', flag: '🇨🇴', rating: 83 },
  { name: 'Morocco', flag: '🇲🇦', rating: 82 },
  { name: 'Norway', flag: '🇳🇴', rating: 82 },
  { name: 'Switzerland', flag: '🇨🇭', rating: 81 },
  { name: 'Senegal', flag: '🇸🇳', rating: 81 },
  { name: 'Japan', flag: '🇯🇵', rating: 81 },
  { name: 'Austria', flag: '🇦🇹', rating: 81 },
  { name: 'Mexico', flag: '🇲🇽', rating: 80 },
  { name: 'United States', flag: '🇺🇸', rating: 80 },
  { name: 'Ecuador', flag: '🇪🇨', rating: 80 },
  { name: 'Sweden', flag: '🇸🇪', rating: 80 },
  { name: 'South Korea', flag: '🇰🇷', rating: 80 },
  { name: 'Bosnia and Herzegovina', flag: '🇧🇦', rating: 80 },
  { name: 'Turkey', flag: '🇹🇷', rating: 80 },
  { name: 'Czech Republic', flag: '🇨🇿', rating: 79 },
  { name: 'Ivory Coast', flag: '🇨🇮', rating: 79 },
  { name: 'Egypt', flag: '🇪🇬', rating: 79 },
  { name: 'Algeria', flag: '🇩🇿', rating: 79 },
  { name: 'Canada', flag: '🇨🇦', rating: 78 },
  { name: 'Iran', flag: '🇮🇷', rating: 78 },
  { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', rating: 77 },
  { name: 'Australia', flag: '🇦🇺', rating: 76 },
  { name: 'Tunisia', flag: '🇹🇳', rating: 76 },
  { name: 'DR Congo', flag: '🇨🇩', rating: 76 },
  { name: 'Ghana', flag: '🇬🇭', rating: 76 },
  { name: 'Paraguay', flag: '🇵🇾', rating: 75 },
  { name: 'South Africa', flag: '🇿🇦', rating: 75 },
  { name: 'Saudi Arabia', flag: '🇸🇦', rating: 74 },
  { name: 'Cape Verde', flag: '🇨🇻', rating: 73 },
  { name: 'Qatar', flag: '🇶🇦', rating: 73 },
  { name: 'Uzbekistan', flag: '🇺🇿', rating: 73 },
  { name: 'Panama', flag: '🇵🇦', rating: 73 },
  { name: 'Iraq', flag: '🇮🇶', rating: 73 },
  { name: 'Jordan', flag: '🇯🇴', rating: 72 },
  { name: 'Curaçao', flag: '🇨🇼', rating: 71 },
  { name: 'Haiti', flag: '🇭🇹', rating: 71 },
  { name: 'New Zealand', flag: '🇳🇿', rating: 70 },
]

export const teamByName = (name: string): NationalTeam | undefined =>
  TEAMS.find((t) => t.name === name)
