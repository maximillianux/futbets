import { createClient } from '@libsql/client';
import { Game } from './odds';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initDb(): Promise<void> {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS odds_cache (
      league_key TEXT NOT NULL,
      date       TEXT NOT NULL,
      data       TEXT NOT NULL,
      PRIMARY KEY (league_key, date)
    );
    CREATE TABLE IF NOT EXISTS active_leagues_cache (
      date TEXT PRIMARY KEY,
      keys TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stats_cache (
      league_key TEXT NOT NULL,
      date       TEXT NOT NULL,
      data       TEXT NOT NULL,
      PRIMARY KEY (league_key, date)
    );
  `);
}

/**
 * Cache date key — day starts at 5am CST so overnight visitors
 * don't trigger a fresh fetch before new odds are posted.
 */
function today(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const year = get('year'), month = get('month'), day = get('day');
  const hour = parseInt(get('hour'), 10);

  if (hour < 5) {
    const d = new Date(`${year}-${month}-${day}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  return `${year}-${month}-${day}`;
}

export async function getCachedOdds(leagueKey: string): Promise<Game[] | null> {
  await initDb();
  const result = await client.execute({
    sql: 'SELECT data FROM odds_cache WHERE league_key = ? AND date = ?',
    args: [leagueKey, today()],
  });
  const row = result.rows[0];
  return row ? (JSON.parse(row.data as string) as Game[]) : null;
}

export async function setCachedOdds(leagueKey: string, games: Game[]): Promise<void> {
  await initDb();
  await client.execute({
    sql: 'INSERT OR REPLACE INTO odds_cache (league_key, date, data) VALUES (?, ?, ?)',
    args: [leagueKey, today(), JSON.stringify(games)],
  });
}

export async function getCachedActiveLeagues(): Promise<string[] | null> {
  await initDb();
  const result = await client.execute({
    sql: 'SELECT keys FROM active_leagues_cache WHERE date = ?',
    args: [today()],
  });
  const row = result.rows[0];
  return row ? (JSON.parse(row.keys as string) as string[]) : null;
}

export async function setCachedActiveLeagues(keys: string[]): Promise<void> {
  await initDb();
  await client.execute({
    sql: 'INSERT OR REPLACE INTO active_leagues_cache (date, keys) VALUES (?, ?)',
    args: [today(), JSON.stringify(keys)],
  });
}

export async function getCachedStats(leagueKey: string): Promise<unknown | null> {
  await initDb();
  const result = await client.execute({
    sql: 'SELECT data FROM stats_cache WHERE league_key = ? AND date = ?',
    args: [leagueKey, today()],
  });
  const row = result.rows[0];
  return row ? JSON.parse(row.data as string) : null;
}

export async function setCachedStats(leagueKey: string, data: unknown): Promise<void> {
  await initDb();
  await client.execute({
    sql: 'INSERT OR REPLACE INTO stats_cache (league_key, date, data) VALUES (?, ?, ?)',
    args: [leagueKey, today(), JSON.stringify(data)],
  });
}
