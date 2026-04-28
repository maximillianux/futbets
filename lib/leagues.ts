export interface League {
  key: string;
  name: string;
  country: string;
  flag: string;
}

export const LEAGUES: League[] = [
  // ── England ────────────────────────────────────────────────────────────────
  { key: 'soccer_epl',              name: 'Premier League',      country: 'England',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { key: 'soccer_england_fa_cup',   name: 'FA Cup',              country: 'England',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { key: 'soccer_england_efl_cup',  name: 'EFL Cup',             country: 'England',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },

  // ── Spain ──────────────────────────────────────────────────────────────────
  { key: 'soccer_spain_la_liga',    name: 'La Liga',             country: 'Spain',       flag: '🇪🇸' },
  { key: 'soccer_spain_copa',       name: 'Copa del Rey',        country: 'Spain',       flag: '🇪🇸' },

  // ── Germany ────────────────────────────────────────────────────────────────
  { key: 'soccer_germany_bundesliga', name: 'Bundesliga',        country: 'Germany',     flag: '🇩🇪' },
  { key: 'soccer_germany_dfb_pokal',  name: 'DFB-Pokal',         country: 'Germany',     flag: '🇩🇪' },

  // ── Italy ──────────────────────────────────────────────────────────────────
  { key: 'soccer_italy_serie_a',    name: 'Serie A',             country: 'Italy',       flag: '🇮🇹' },
  { key: 'soccer_italy_coppa',      name: 'Coppa Italia',        country: 'Italy',       flag: '🇮🇹' },

  // ── France ─────────────────────────────────────────────────────────────────
  { key: 'soccer_france_ligue_one', name: 'Ligue 1',             country: 'France',      flag: '🇫🇷' },
  { key: 'soccer_france_coupe',     name: 'Coupe de France',     country: 'France',      flag: '🇫🇷' },

  // ── Europe ─────────────────────────────────────────────────────────────────
  { key: 'soccer_uefa_champs_league',   name: 'Champions League',    country: 'Europe',  flag: '🏆' },
  { key: 'soccer_uefa_europa_league',   name: 'Europa League',       country: 'Europe',  flag: '🥈' },
  { key: 'soccer_uefa_conference',      name: 'Conference League',   country: 'Europe',  flag: '🌍' },

  // ── Other leagues ──────────────────────────────────────────────────────────
  { key: 'soccer_netherlands_eredivisie', name: 'Eredivisie',      country: 'Netherlands', flag: '🇳🇱' },
  { key: 'soccer_netherlands_cup',        name: 'KNVB Beker',       country: 'Netherlands', flag: '🇳🇱' },
  { key: 'soccer_portugal_primeira_liga', name: 'Primeira Liga',    country: 'Portugal',    flag: '🇵🇹' },
  { key: 'soccer_mexico_ligamx',          name: 'Liga MX',           country: 'Mexico',      flag: '🇲🇽' },
  { key: 'soccer_mexico_copa',            name: 'Copa MX',           country: 'Mexico',      flag: '🇲🇽' },
  { key: 'soccer_usa_mls',                name: 'MLS',               country: 'USA',         flag: '🇺🇸' },
  { key: 'soccer_england_championship',   name: 'Championship',      country: 'England',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { key: 'soccer_turkey_super_lig',       name: 'Süper Lig',         country: 'Turkey',      flag: '🇹🇷' },
  { key: 'soccer_saudi_pro_league',       name: 'Saudi Pro League',  country: 'Saudi Arabia', flag: '🇸🇦' },
];
