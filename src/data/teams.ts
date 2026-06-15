// The 48 nations in the 2026 FIFA World Cup field, with a rough overall strength
// rating (50-99). Ratings are subjective and tuned for a fun match simulation,
// not a power ranking. Flags are emoji.

export interface NationalTeam {
  name: string
  flag: string
  rating: number
}

export const TEAMS: NationalTeam[] = [
  // Hosts
  { name: 'United States', flag: '🇺🇸', rating: 78 },
  { name: 'Mexico', flag: '🇲🇽', rating: 79 },
  { name: 'Canada', flag: '🇨🇦', rating: 77 },

  // UEFA
  { name: 'France', flag: '🇫🇷', rating: 92 },
  { name: 'England', flag: '🏴', rating: 90 },
  { name: 'Spain', flag: '🇪🇸', rating: 91 },
  { name: 'Portugal', flag: '🇵🇹', rating: 89 },
  { name: 'Germany', flag: '🇩🇪', rating: 88 },
  { name: 'Netherlands', flag: '🇳🇱', rating: 88 },
  { name: 'Italy', flag: '🇮🇹', rating: 86 },
  { name: 'Belgium', flag: '🇧🇪', rating: 85 },
  { name: 'Croatia', flag: '🇭🇷', rating: 84 },
  { name: 'Switzerland', flag: '🇨🇭', rating: 80 },
  { name: 'Denmark', flag: '🇩🇰', rating: 81 },
  { name: 'Austria', flag: '🇦🇹', rating: 80 },
  { name: 'Norway', flag: '🇳🇴', rating: 82 },
  { name: 'Turkey', flag: '🇹🇷', rating: 79 },
  { name: 'Scotland', flag: '🏴', rating: 75 },
  { name: 'Ukraine', flag: '🇺🇦', rating: 78 },
  { name: 'Serbia', flag: '🇷🇸', rating: 79 },
  { name: 'Poland', flag: '🇵🇱', rating: 78 },
  { name: 'Wales', flag: '🏴', rating: 74 },

  // CONMEBOL
  { name: 'Argentina', flag: '🇦🇷', rating: 92 },
  { name: 'Brazil', flag: '🇧🇷', rating: 90 },
  { name: 'Uruguay', flag: '🇺🇾', rating: 84 },
  { name: 'Colombia', flag: '🇨🇴', rating: 83 },
  { name: 'Ecuador', flag: '🇪🇨', rating: 79 },
  { name: 'Paraguay', flag: '🇵🇾', rating: 74 },

  // CAF
  { name: 'Morocco', flag: '🇲🇦', rating: 83 },
  { name: 'Senegal', flag: '🇸🇳', rating: 81 },
  { name: 'Nigeria', flag: '🇳🇬', rating: 80 },
  { name: 'Ivory Coast', flag: '🇨🇮', rating: 78 },
  { name: 'Egypt', flag: '🇪🇬', rating: 78 },
  { name: 'Algeria', flag: '🇩🇿', rating: 77 },
  { name: 'Ghana', flag: '🇬🇭', rating: 76 },
  { name: 'Cameroon', flag: '🇨🇲', rating: 75 },
  { name: 'South Africa', flag: '🇿🇦', rating: 72 },

  // AFC
  { name: 'Japan', flag: '🇯🇵', rating: 81 },
  { name: 'South Korea', flag: '🇰🇷', rating: 80 },
  { name: 'Iran', flag: '🇮🇷', rating: 77 },
  { name: 'Australia', flag: '🇦🇺', rating: 76 },
  { name: 'Saudi Arabia', flag: '🇸🇦', rating: 73 },
  { name: 'Qatar', flag: '🇶🇦', rating: 71 },
  { name: 'Uzbekistan', flag: '🇺🇿', rating: 70 },
  { name: 'Jordan', flag: '🇯🇴', rating: 68 },

  // CONCACAF / OFC
  { name: 'Costa Rica', flag: '🇨🇷', rating: 72 },
  { name: 'Panama', flag: '🇵🇦', rating: 71 },
  { name: 'New Zealand', flag: '🇳🇿', rating: 68 },
]

export const teamByName = (name: string): NationalTeam | undefined =>
  TEAMS.find((t) => t.name === name)
