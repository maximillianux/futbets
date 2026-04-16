import { NextResponse } from 'next/server';
import { LEAGUES } from '@/lib/leagues';
import { getTodaysGames, Game } from '@/lib/odds';
import { getCachedOdds, setCachedOdds, getCachedActiveLeagues, setCachedActiveLeagues } from '@/lib/db';

const API_KEY = process.env.ODDS_API_KEY;
const BASE_URL = 'https://api.the-odds-api.com/v4';

async function fetchActiveLeagueKeys(): Promise<string[]> {
  const cached = await getCachedActiveLeagues();
  if (cached) return cached;

  const res = await fetch(`${BASE_URL}/sports/?apiKey=${API_KEY}`);
  if (!res.ok) return LEAGUES.map((l) => l.key);

  const sports: Array<{ key: string; active: boolean }> = await res.json();
  const keys = sports.filter((s) => s.active).map((s) => s.key);
  await setCachedActiveLeagues(keys);
  return keys;
}

async function fetchLeagueOdds(leagueKey: string): Promise<Game[]> {
  const cached = await getCachedOdds(leagueKey);
  if (cached) return cached;

  const url = `${BASE_URL}/sports/${leagueKey}/odds/?apiKey=${API_KEY}&regions=us,eu,uk&markets=h2h,totals&dateFormat=iso&oddsFormat=decimal`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data: Game[] = await res.json();
  const games = getTodaysGames(data);
  await setCachedOdds(leagueKey, games);
  return games;
}

export async function GET() {
  if (!API_KEY || API_KEY === 'your_api_key_here') {
    return NextResponse.json({ error: 'ODDS_API_KEY is not configured.' }, { status: 500 });
  }

  const activeKeys = await fetchActiveLeagueKeys();
  const activeLeagues = LEAGUES.filter((l) => activeKeys.includes(l.key));

  const entries = await Promise.all(
    activeLeagues.map(async (league) => {
      try {
        const games = await fetchLeagueOdds(league.key);
        return [league.key, games] as const;
      } catch {
        return [league.key, [] as Game[]] as const;
      }
    })
  );

  return NextResponse.json(Object.fromEntries(entries));
}
