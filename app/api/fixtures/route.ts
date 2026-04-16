import { NextResponse } from 'next/server';
import { LEAGUES } from '@/lib/leagues';
import { ESPN_SLUGS } from '@/lib/espn';
import { Game } from '@/lib/odds';
import { getCachedOdds, setCachedOdds } from '@/lib/db';

/**
 * 2 days back through +6 days ahead (9 total) as YYYYMMDD strings.
 * Starting 2 UTC days back ensures US users (up to UTC-8) always have
 * their "yesterday" covered even when the Vercel server is already
 * on the next UTC day.
 */
function dateRange(): string[] {
  return Array.from({ length: 9 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i - 2); // -2 = 2 days ago in UTC
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
  const base = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}`;

  const urls = [
    // Default scoreboard — reliably returns today's live/completed games
    `${base}/scoreboard`,
    // Date-specific scoreboard (works well for upcoming fixtures)
    ...dates.map((d) => `${base}/scoreboard?dates=${d}`),
    // calendartype=whitelist asks ESPN to use the league match calendar,
    // which includes completed matchdays — needed for yesterday's results
    ...dates.map((d) => `${base}/scoreboard?dates=${d}&calendartype=whitelist`),
    // schedule endpoint also surfaces past + future events
    ...dates.map((d) => `${base}/schedule?dates=${d}`),
  ];

  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        // scoreboard → data.events; schedule → data.events or nested per-day
        const events: unknown[] =
          data.events ??
          Object.values(data.scheduledEvents ?? {}).flat() ??
          [];
        parseEvents(events);
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
