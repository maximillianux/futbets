import { NextResponse } from 'next/server';
import { LEAGUES } from '@/lib/leagues';
import { ESPN_SLUGS } from '@/lib/espn';
import { Game } from '@/lib/odds';
import { getCachedOdds, setCachedOdds } from '@/lib/db';

/** Yesterday through +6 days (8 total) as YYYYMMDD strings */
function dateRange(): string[] {
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i - 1); // -1 = yesterday
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  });
}

interface ESPNCompetitor {
  homeAway: 'home' | 'away';
  team: { displayName: string };
}

async function fetchLeagueFixtures(leagueKey: string, slug: string): Promise<Game[]> {
  const cached = await getCachedOdds(leagueKey);
  if (cached) return cached;

  const seen = new Set<string>();
  const allGames: Game[] = [];

  function parseEvents(events: unknown[]) {
    for (const event of events as Array<Record<string, unknown>>) {
      if (seen.has(event.id as string)) continue;
      seen.add(event.id as string);

      const comp = (event.competitions as Array<Record<string, unknown>>)?.[0];
      if (!comp) continue;
      const home = (comp.competitors as ESPNCompetitor[])?.find((c) => c.homeAway === 'home');
      const away = (comp.competitors as ESPNCompetitor[])?.find((c) => c.homeAway === 'away');
      if (!home || !away) continue;

      allGames.push({
        id: String(event.id),
        sport_key: leagueKey,
        sport_title: '',
        commence_time: event.date as string,
        home_team: home.team.displayName,
        away_team: away.team.displayName,
        bookmakers: [],
      });
    }
  }

  const dates = dateRange();

  // Fetch date-specific pages + the default scoreboard (no date param) for today's
  // live/completed games, which the date param often omits.
  const urls = [
    ...dates.map((d) => `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${d}`),
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`,
  ];

  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        parseEvents(data.events ?? []);
      } catch { /* ignore */ }
    })
  );

  allGames.sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime());
  await setCachedOdds(leagueKey, allGames);
  return allGames;
}

export async function GET() {
  const entries = await Promise.all(
    LEAGUES.map(async (league) => {
      const slug = ESPN_SLUGS[league.key];
      if (!slug) return [league.key, [] as Game[]] as const;
      try {
        const games = await fetchLeagueFixtures(league.key, slug);
        return [league.key, games] as const;
      } catch {
        return [league.key, [] as Game[]] as const;
      }
    })
  );

  return NextResponse.json(Object.fromEntries(entries));
}
