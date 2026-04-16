export interface Outcome {
  name: string;
  price: number;
  point?: number;
}

export interface Market {
  key: string;
  last_update: string;
  outcomes: Outcome[];
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

export interface Game {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

export interface ProcessedOdds {
  home: number | null;
  draw: number | null;
  away: number | null;
  overPoint: number | null;
  overOdds: number | null;
  underOdds: number | null;
  bookmakerCount: number;
}

/** Use DraftKings for 1X2; fall back to first available book for totals (DK doesn't post soccer O/U) */
export function processOdds(game: Game): ProcessedOdds {
  if (game.bookmakers.length === 0) {
    return { home: null, draw: null, away: null, overPoint: null, overOdds: null, underOdds: null, bookmakerCount: 0 };
  }

  const dk = game.bookmakers.find((b) => b.key === 'draftkings') ?? game.bookmakers[0];
  const h2h = dk.markets.find((m) => m.key === 'h2h');

  const home = h2h?.outcomes.find((o) => o.name === game.home_team)?.price ?? null;
  const away = h2h?.outcomes.find((o) => o.name === game.away_team)?.price ?? null;
  const draw = h2h?.outcomes.find((o) => o.name === 'Draw')?.price ?? null;

  // DraftKings doesn't post soccer totals — use first book that does
  const totalsBook = game.bookmakers.find((b) => b.markets.some((m) => m.key === 'totals'));
  const totals = totalsBook?.markets.find((m) => m.key === 'totals');
  const over = totals?.outcomes.find((o) => o.name === 'Over') ?? null;
  const under = totals?.outcomes.find((o) => o.name === 'Under') ?? null;

  return {
    home,
    draw,
    away,
    overPoint: over?.point ?? null,
    overOdds: over?.price ?? null,
    underOdds: under?.price ?? null,
    bookmakerCount: game.bookmakers.length,
  };
}

/** Filter games to only those starting within the next 24 hours */
export function getTodaysGames(games: Game[]): Game[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return games.filter((g) => {
    const t = new Date(g.commence_time);
    return t >= now && t <= cutoff;
  });
}
