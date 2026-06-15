// A pool of real, recognizable footballers expected around the 2026 World Cup,
// tagged by nation, position and a FIFA-style overall rating (1-99).
// Curated for a fun draft — not an official squad list. Ratings are subjective.

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
  // ── France 🇫🇷
  ['Kylian Mbappé', 'France', '🇫🇷', 'FWD', 91],
  ['Ousmane Dembélé', 'France', '🇫🇷', 'FWD', 86],
  ['Antoine Griezmann', 'France', '🇫🇷', 'FWD', 86],
  ['Aurélien Tchouaméni', 'France', '🇫🇷', 'MID', 85],
  ['Eduardo Camavinga', 'France', '🇫🇷', 'MID', 84],
  ['Adrien Rabiot', 'France', '🇫🇷', 'MID', 83],
  ['William Saliba', 'France', '🇫🇷', 'DEF', 86],
  ['Theo Hernández', 'France', '🇫🇷', 'DEF', 84],
  ['Jules Koundé', 'France', '🇫🇷', 'DEF', 84],
  ['Mike Maignan', 'France', '🇫🇷', 'GK', 87],

  // ── England 🏴
  ['Jude Bellingham', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'MID', 89],
  ['Phil Foden', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'MID', 87],
  ['Declan Rice', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'MID', 86],
  ['Bukayo Saka', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'FWD', 87],
  ['Harry Kane', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'FWD', 90],
  ['Cole Palmer', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'FWD', 86],
  ['John Stones', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'DEF', 84],
  ['Kyle Walker', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'DEF', 82],
  ['Marc Guéhi', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'DEF', 82],
  ['Jordan Pickford', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'GK', 84],

  // ── Spain 🇪🇸
  ['Lamine Yamal', 'Spain', '🇪🇸', 'FWD', 88],
  ['Nico Williams', 'Spain', '🇪🇸', 'FWD', 85],
  ['Álvaro Morata', 'Spain', '🇪🇸', 'FWD', 83],
  ['Rodri', 'Spain', '🇪🇸', 'MID', 91],
  ['Pedri', 'Spain', '🇪🇸', 'MID', 87],
  ['Gavi', 'Spain', '🇪🇸', 'MID', 84],
  ['Fabián Ruiz', 'Spain', '🇪🇸', 'MID', 84],
  ['Aymeric Laporte', 'Spain', '🇪🇸', 'DEF', 84],
  ['Dani Carvajal', 'Spain', '🇪🇸', 'DEF', 85],
  ['Unai Simón', 'Spain', '🇪🇸', 'GK', 85],

  // ── Argentina 🇦🇷
  ['Lionel Messi', 'Argentina', '🇦🇷', 'FWD', 89],
  ['Julián Álvarez', 'Argentina', '🇦🇷', 'FWD', 86],
  ['Lautaro Martínez', 'Argentina', '🇦🇷', 'FWD', 87],
  ['Enzo Fernández', 'Argentina', '🇦🇷', 'MID', 85],
  ['Alexis Mac Allister', 'Argentina', '🇦🇷', 'MID', 86],
  ['Rodrigo De Paul', 'Argentina', '🇦🇷', 'MID', 83],
  ['Cristian Romero', 'Argentina', '🇦🇷', 'DEF', 86],
  ['Nicolás Otamendi', 'Argentina', '🇦🇷', 'DEF', 82],
  ['Nahuel Molina', 'Argentina', '🇦🇷', 'DEF', 81],
  ['Emiliano Martínez', 'Argentina', '🇦🇷', 'GK', 87],

  // ── Brazil 🇧🇷
  ['Vinícius Júnior', 'Brazil', '🇧🇷', 'FWD', 89],
  ['Rodrygo', 'Brazil', '🇧🇷', 'FWD', 86],
  ['Raphinha', 'Brazil', '🇧🇷', 'FWD', 86],
  ['Endrick', 'Brazil', '🇧🇷', 'FWD', 81],
  ['Bruno Guimarães', 'Brazil', '🇧🇷', 'MID', 86],
  ['Lucas Paquetá', 'Brazil', '🇧🇷', 'MID', 84],
  ['Marquinhos', 'Brazil', '🇧🇷', 'DEF', 86],
  ['Éder Militão', 'Brazil', '🇧🇷', 'DEF', 85],
  ['Danilo', 'Brazil', '🇧🇷', 'DEF', 81],
  ['Alisson', 'Brazil', '🇧🇷', 'GK', 89],

  // ── Portugal 🇵🇹
  ['Cristiano Ronaldo', 'Portugal', '🇵🇹', 'FWD', 85],
  ['Rafael Leão', 'Portugal', '🇵🇹', 'FWD', 85],
  ['Gonçalo Ramos', 'Portugal', '🇵🇹', 'FWD', 82],
  ['Bruno Fernandes', 'Portugal', '🇵🇹', 'MID', 87],
  ['Bernardo Silva', 'Portugal', '🇵🇹', 'MID', 87],
  ['Vitinha', 'Portugal', '🇵🇹', 'MID', 85],
  ['Rúben Dias', 'Portugal', '🇵🇹', 'DEF', 87],
  ['João Cancelo', 'Portugal', '🇵🇹', 'DEF', 84],
  ['Nuno Mendes', 'Portugal', '🇵🇹', 'DEF', 84],
  ['Diogo Costa', 'Portugal', '🇵🇹', 'GK', 85],

  // ── Germany 🇩🇪
  ['Jamal Musiala', 'Germany', '🇩🇪', 'MID', 87],
  ['Florian Wirtz', 'Germany', '🇩🇪', 'MID', 87],
  ['Toni Kroos', 'Germany', '🇩🇪', 'MID', 86],
  ['İlkay Gündoğan', 'Germany', '🇩🇪', 'MID', 84],
  ['Kai Havertz', 'Germany', '🇩🇪', 'FWD', 84],
  ['Niclas Füllkrug', 'Germany', '🇩🇪', 'FWD', 82],
  ['Antonio Rüdiger', 'Germany', '🇩🇪', 'DEF', 86],
  ['Joshua Kimmich', 'Germany', '🇩🇪', 'DEF', 86],
  ['Jonathan Tah', 'Germany', '🇩🇪', 'DEF', 83],
  ['Marc-André ter Stegen', 'Germany', '🇩🇪', 'GK', 87],

  // ── Netherlands 🇳🇱
  ['Cody Gakpo', 'Netherlands', '🇳🇱', 'FWD', 84],
  ['Memphis Depay', 'Netherlands', '🇳🇱', 'FWD', 83],
  ['Xavi Simons', 'Netherlands', '🇳🇱', 'MID', 84],
  ['Frenkie de Jong', 'Netherlands', '🇳🇱', 'MID', 86],
  ['Tijjani Reijnders', 'Netherlands', '🇳🇱', 'MID', 83],
  ['Virgil van Dijk', 'Netherlands', '🇳🇱', 'DEF', 88],
  ['Nathan Aké', 'Netherlands', '🇳🇱', 'DEF', 83],
  ['Denzel Dumfries', 'Netherlands', '🇳🇱', 'DEF', 82],
  ['Jurriën Timber', 'Netherlands', '🇳🇱', 'DEF', 82],
  ['Bart Verbruggen', 'Netherlands', '🇳🇱', 'GK', 82],

  // ── Italy 🇮🇹
  ['Federico Chiesa', 'Italy', '🇮🇹', 'FWD', 83],
  ['Gianluca Scamacca', 'Italy', '🇮🇹', 'FWD', 81],
  ['Nicolò Barella', 'Italy', '🇮🇹', 'MID', 86],
  ['Sandro Tonali', 'Italy', '🇮🇹', 'MID', 84],
  ['Alessandro Bastoni', 'Italy', '🇮🇹', 'DEF', 85],
  ['Giovanni Di Lorenzo', 'Italy', '🇮🇹', 'DEF', 83],
  ['Federico Dimarco', 'Italy', '🇮🇹', 'DEF', 83],
  ['Gianluigi Donnarumma', 'Italy', '🇮🇹', 'GK', 88],

  // ── Belgium 🇧🇪
  ['Kevin De Bruyne', 'Belgium', '🇧🇪', 'MID', 88],
  ['Youri Tielemans', 'Belgium', '🇧🇪', 'MID', 83],
  ['Jérémy Doku', 'Belgium', '🇧🇪', 'FWD', 83],
  ['Romelu Lukaku', 'Belgium', '🇧🇪', 'FWD', 84],
  ['Leandro Trossard', 'Belgium', '🇧🇪', 'FWD', 82],
  ['Wout Faes', 'Belgium', '🇧🇪', 'DEF', 79],
  ['Thibaut Courtois', 'Belgium', '🇧🇪', 'GK', 89],

  // ── Croatia 🇭🇷
  ['Luka Modrić', 'Croatia', '🇭🇷', 'MID', 84],
  ['Mateo Kovačić', 'Croatia', '🇭🇷', 'MID', 84],
  ['Andrej Kramarić', 'Croatia', '🇭🇷', 'FWD', 81],
  ['Joško Gvardiol', 'Croatia', '🇭🇷', 'DEF', 85],
  ['Dominik Livaković', 'Croatia', '🇭🇷', 'GK', 82],

  // ── Norway 🇳🇴
  ['Erling Haaland', 'Norway', '🇳🇴', 'FWD', 91],
  ['Martin Ødegaard', 'Norway', '🇳🇴', 'MID', 87],
  ['Alexander Sørloth', 'Norway', '🇳🇴', 'FWD', 82],
  ['Antonio Nusa', 'Norway', '🇳🇴', 'FWD', 79],
  ['Kristoffer Ajer', 'Norway', '🇳🇴', 'DEF', 78],

  // ── Uruguay 🇺🇾
  ['Federico Valverde', 'Uruguay', '🇺🇾', 'MID', 88],
  ['Darwin Núñez', 'Uruguay', '🇺🇾', 'FWD', 83],
  ['Ronald Araújo', 'Uruguay', '🇺🇾', 'DEF', 85],
  ['Rodrigo Bentancur', 'Uruguay', '🇺🇾', 'MID', 82],
  ['Sergio Rochet', 'Uruguay', '🇺🇾', 'GK', 79],

  // ── Colombia 🇨🇴
  ['James Rodríguez', 'Colombia', '🇨🇴', 'MID', 82],
  ['Luis Díaz', 'Colombia', '🇨🇴', 'FWD', 86],
  ['Jhon Durán', 'Colombia', '🇨🇴', 'FWD', 80],
  ['Davinson Sánchez', 'Colombia', '🇨🇴', 'DEF', 80],

  // ── Morocco 🇲🇦
  ['Achraf Hakimi', 'Morocco', '🇲🇦', 'DEF', 85],
  ['Hakim Ziyech', 'Morocco', '🇲🇦', 'MID', 81],
  ['Brahim Díaz', 'Morocco', '🇲🇦', 'MID', 83],
  ['Youssef En-Nesyri', 'Morocco', '🇲🇦', 'FWD', 81],
  ['Yassine Bounou', 'Morocco', '🇲🇦', 'GK', 84],

  // ── Senegal 🇸🇳
  ['Sadio Mané', 'Senegal', '🇸🇳', 'FWD', 84],
  ['Nicolas Jackson', 'Senegal', '🇸🇳', 'FWD', 81],
  ['Pape Matar Sarr', 'Senegal', '🇸🇳', 'MID', 80],
  ['Kalidou Koulibaly', 'Senegal', '🇸🇳', 'DEF', 82],
  ['Édouard Mendy', 'Senegal', '🇸🇳', 'GK', 82],

  // ── Nigeria 🇳🇬
  ['Victor Osimhen', 'Nigeria', '🇳🇬', 'FWD', 87],
  ['Ademola Lookman', 'Nigeria', '🇳🇬', 'FWD', 83],
  ['Alex Iwobi', 'Nigeria', '🇳🇬', 'MID', 79],
  ['William Troost-Ekong', 'Nigeria', '🇳🇬', 'DEF', 78],

  // ── USA 🇺🇸
  ['Christian Pulisic', 'United States', '🇺🇸', 'FWD', 83],
  ['Weston McKennie', 'United States', '🇺🇸', 'MID', 80],
  ['Yunus Musah', 'United States', '🇺🇸', 'MID', 79],
  ['Tyler Adams', 'United States', '🇺🇸', 'MID', 79],
  ['Antonee Robinson', 'United States', '🇺🇸', 'DEF', 80],
  ['Matt Turner', 'United States', '🇺🇸', 'GK', 78],

  // ── Mexico 🇲🇽
  ['Santiago Giménez', 'Mexico', '🇲🇽', 'FWD', 81],
  ['Hirving Lozano', 'Mexico', '🇲🇽', 'FWD', 80],
  ['Edson Álvarez', 'Mexico', '🇲🇽', 'MID', 81],
  ['César Montes', 'Mexico', '🇲🇽', 'DEF', 78],
  ['Guillermo Ochoa', 'Mexico', '🇲🇽', 'GK', 78],

  // ── Canada 🇨🇦
  ['Alphonso Davies', 'Canada', '🇨🇦', 'DEF', 84],
  ['Jonathan David', 'Canada', '🇨🇦', 'FWD', 83],
  ['Stephen Eustáquio', 'Canada', '🇨🇦', 'MID', 78],

  // ── Japan 🇯🇵
  ['Takefusa Kubo', 'Japan', '🇯🇵', 'FWD', 82],
  ['Kaoru Mitoma', 'Japan', '🇯🇵', 'FWD', 83],
  ['Wataru Endo', 'Japan', '🇯🇵', 'MID', 79],
  ['Takehiro Tomiyasu', 'Japan', '🇯🇵', 'DEF', 79],

  // ── South Korea 🇰🇷
  ['Son Heung-min', 'South Korea', '🇰🇷', 'FWD', 86],
  ['Lee Kang-in', 'South Korea', '🇰🇷', 'MID', 81],
  ['Kim Min-jae', 'South Korea', '🇰🇷', 'DEF', 85],

  // ── Denmark / Switzerland / Austria / others
  ['Christian Eriksen', 'Denmark', '🇩🇰', 'MID', 82],
  ['Rasmus Højlund', 'Denmark', '🇩🇰', 'FWD', 82],
  ['Pierre-Emile Højbjerg', 'Denmark', '🇩🇰', 'MID', 82],
  ['Granit Xhaka', 'Switzerland', '🇨🇭', 'MID', 83],
  ['Manuel Akanji', 'Switzerland', '🇨🇭', 'DEF', 84],
  ['David Alaba', 'Austria', '🇦🇹', 'DEF', 83],
  ['Marcel Sabitzer', 'Austria', '🇦🇹', 'MID', 81],
  ['Dušan Vlahović', 'Serbia', '🇷🇸', 'FWD', 84],
  ['Sergej Milinković-Savić', 'Serbia', '🇷🇸', 'MID', 84],
  ['Robert Lewandowski', 'Poland', '🇵🇱', 'FWD', 87],
  ['Piotr Zieliński', 'Poland', '🇵🇱', 'MID', 83],
  ['Wojciech Szczęsny', 'Poland', '🇵🇱', 'GK', 84],
  ['Mohamed Salah', 'Egypt', '🇪🇬', 'FWD', 88],
  ['Hakan Çalhanoğlu', 'Turkey', '🇹🇷', 'MID', 85],
  ['Arda Güler', 'Turkey', '🇹🇷', 'MID', 80],
  ['Riyad Mahrez', 'Algeria', '🇩🇿', 'FWD', 83],
  ['Mohammed Kudus', 'Ghana', '🇬🇭', 'MID', 83],
  ['André Onana', 'Cameroon', '🇨🇲', 'GK', 83],
  ['Sébastien Haller', 'Ivory Coast', '🇨🇮', 'FWD', 80],
  ['Mathew Ryan', 'Australia', '🇦🇺', 'GK', 78],
  ['Mohamed Al-Owais', 'Saudi Arabia', '🇸🇦', 'GK', 74],
  ['Keylor Navas', 'Costa Rica', '🇨🇷', 'GK', 80],
  ['Andriy Lunin', 'Ukraine', '🇺🇦', 'GK', 82],
  ['Mykhailo Mudryk', 'Ukraine', '🇺🇦', 'FWD', 80],
]

export const PLAYERS: Player[] = ROWS.map(([name, nation, flag, pos, rating]) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  nation,
  flag,
  pos,
  rating,
}))

export const playersByPos = (pos: Position): Player[] =>
  PLAYERS.filter((p) => p.pos === pos)
