import { NextResponse } from 'next/server';
import { ESPN_SLUGS } from '@/lib/espn';

export interface StandingRow {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gd: number;
  points: number;
}

interface ESPNStatEntry {
  name: string;
  value?: number;
}

interface ESPNStandingEntry {
  team: { displayName: string };
  stats?: ESPNStatEntry[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueKey = searchParams.get('leagueKey');

  if (!leagueKey) return NextResponse.json({ error: 'Missing leagueKey' }, { status: 400 });

  const slug = ESPN_SLUGS[leagueKey];
  if (!slug) return NextResponse.json([]);

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/v2/sports/soccer/${slug}/standings`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();
    const entries: ESPNStandingEntry[] =
      data.children?.[0]?.standings?.entries ?? [];

    const table: StandingRow[] = entries.map((entry, i) => {
      const s: Record<string, number> = {};
      for (const stat of entry.stats ?? []) {
        if (stat.value !== undefined) s[stat.name] = stat.value;
      }
      return {
        position: i + 1,
        team: entry.team.displayName,
        played: Math.round(s['gamesPlayed'] ?? 0),
        won: Math.round(s['wins'] ?? 0),
        drawn: Math.round(s['ties'] ?? 0),
        lost: Math.round(s['losses'] ?? 0),
        gd: Math.round(s['pointDifferential'] ?? 0),
        points: Math.round(s['points'] ?? 0),
      };
    });

    return NextResponse.json(table);
  } catch {
    return NextResponse.json([]);
  }
}
