import { NextResponse } from 'next/server';
import { LEAGUES } from '@/lib/leagues';
import { getCachedOdds, getCachedStats, setCachedStats } from '@/lib/db';
import { fetchLeagueStats } from '@/lib/stats';
import { TeamStats, LegInfo } from '@/lib/stats';

export interface GameStatEntry {
  home: TeamStats;
  away: TeamStats;
  legInfo: LegInfo | null;
}

export type StatsResponse = Record<string, GameStatEntry>;

export async function GET() {
  const combined: StatsResponse = {};

  await Promise.all(
    LEAGUES.map(async (league) => {
      const games = await getCachedOdds(league.key);
      if (!games || games.length === 0) return;

      const cached = await getCachedStats(league.key);
      if (cached) {
        Object.assign(combined, cached);
        return;
      }

      const stats = await fetchLeagueStats(league.key, games);
      await setCachedStats(league.key, stats);
      Object.assign(combined, stats);
    })
  );

  return NextResponse.json(combined);
}
