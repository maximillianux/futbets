export interface League {
  key: string;
  name: string;
  country: string;
  flag: string;
}

export const LEAGUES: League[] = [
  { key: 'soccer_epl', name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { key: 'soccer_spain_la_liga', name: 'La Liga', country: 'Spain', flag: '🇪🇸' },
  { key: 'soccer_germany_bundesliga', name: 'Bundesliga', country: 'Germany', flag: '🇩🇪' },
  { key: 'soccer_italy_serie_a', name: 'Serie A', country: 'Italy', flag: '🇮🇹' },
  { key: 'soccer_france_ligue_one', name: 'Ligue 1', country: 'France', flag: '🇫🇷' },
  { key: 'soccer_uefa_champs_league', name: 'Champions League', country: 'Europe', flag: '🏆' },
  { key: 'soccer_uefa_europa_league', name: 'Europa League', country: 'Europe', flag: '🥈' },
  { key: 'soccer_usa_mls', name: 'MLS', country: 'USA', flag: '🇺🇸' },
  { key: 'soccer_netherlands_eredivisie', name: 'Eredivisie', country: 'Netherlands', flag: '🇳🇱' },
  { key: 'soccer_portugal_primeira_liga', name: 'Primeira Liga', country: 'Portugal', flag: '🇵🇹' },
  { key: 'soccer_mexico_ligamx', name: 'Liga MX', country: 'Mexico', flag: '🇲🇽' },
];
