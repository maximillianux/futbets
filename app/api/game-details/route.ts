import { NextResponse } from 'next/server';
import { normalize, ESPN_SLUGS } from '@/lib/espn';
import { resolveAlias } from '@/lib/aliases';

export interface MatchResult {
  date: string;
  opponent: string;
  wasHome: boolean;
  goalsFor: number;
  goalsAgainst: number;
  result: 'W' | 'D' | 'L';
}

export interface GameDetailsResponse {
  homeLast5: MatchResult[];
  awayLast5: MatchResult[];
  h2h: MatchResult[]; // from home team's perspective
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ESPNScoreObj {
  value?: number;
  displayValue?: string;
}

interface ESPNCompetitor {
  homeAway: 'home' | 'away';
  team: { id: string; displayName: string };
  score?: ESPNScoreObj | string;
}

interface ESPNEvent {
  date: string;
  competitions?: Array<{
    status?: { type?: { completed?: boolean; name?: string } };
    competitors?: ESPNCompetitor[];
  }>;
}

function parseScore(score: ESPNScoreObj | string | undefined): number {
  if (!score) return 0;
  if (typeof score === 'string') return parseInt(score, 10) || 0;
  if (typeof score === 'object') {
    if (score.displayValue) return parseInt(score.displayValue, 10) || 0;
    if (score.value !== undefined) return Math.round(score.value);
  }
  return 0;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function getTeamId(slug: string, teamName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const teams: Array<{ team: { id: string; displayName: string } }> =
      data?.sports?.[0]?.leagues?.[0]?.teams ?? [];

    const normTarget = resolveAlias(normalize(teamName));
    for (const { team } of teams) {
      if (resolveAlias(normalize(team.displayName)) === normTarget) return team.id;
    }
  } catch { /* ignore */ }
  return null;
}

// All ESPN slugs — league + domestic cups so results span all competitions
const ALL_SLUGS = [
  ...Object.values(ESPN_SLUGS),
  'eng.fa',          // FA Cup
  'eng.league_cup',  // Carabao Cup
  'esp.copa_del_rey',
  'ger.dfb_pokal',
  'ita.coppa_italia',
  'fra.coupe_de_france',
  'mex.copa_mx',
  'ned.cup',
];

async function fetchSchedule(slug: string, teamId: string): Promise<ESPNEvent[]> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${teamId}/schedule`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events ?? []) as ESPNEvent[];
  } catch {
    return [];
  }
}

/** Fetch and merge schedules across ALL known slugs, sorted by date. */
async function fetchAllSchedules(teamId: string): Promise<ESPNEvent[]> {
  const batches = await Promise.all(ALL_SLUGS.map((s) => fetchSchedule(s, teamId)));
  const seen = new Set<string>();
  const merged: ESPNEvent[] = [];
  for (const events of batches) {
    for (const ev of events) {
      const comp = ev.competitions?.[0];
      const ids = comp?.competitors?.map((c) => c.team.id).sort().join(':') ?? '';
      const key = `${ev.date}|${ids}`;
      if (!seen.has(key)) { seen.add(key); merged.push(ev); }
    }
  }
  return merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function parseResults(events: ESPNEvent[], focusTeamId: string, opponentId?: string): MatchResult[] {
  const results: MatchResult[] = [];

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp) continue;

    const statusName = comp.status?.type?.name ?? '';
    const completed = comp.status?.type?.completed ||
      statusName === 'STATUS_FULL_TIME' || statusName === 'STATUS_FINAL';
    if (!completed) continue;

    const home = comp.competitors?.find((c) => c.homeAway === 'home');
    const away = comp.competitors?.find((c) => c.homeAway === 'away');
    if (!home || !away) continue;

    // H2H filter
    if (opponentId && home.team.id !== opponentId && away.team.id !== opponentId) continue;

    const isFocusHome = home.team.id === focusTeamId;
    const focus = isFocusHome ? home : away;
    const opp = isFocusHome ? away : home;

    const goalsFor = parseScore(focus.score);
    const goalsAgainst = parseScore(opp.score);

    let result: 'W' | 'D' | 'L' = 'D';
    if (goalsFor > goalsAgainst) result = 'W';
    else if (goalsFor < goalsAgainst) result = 'L';

    results.push({
      date: formatDate(event.date),
      opponent: opp.team.displayName,
      wasHome: isFocusHome,
      goalsFor,
      goalsAgainst,
      result,
    });
  }

  return results;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const homeTeam = searchParams.get('homeTeam');
  const awayTeam = searchParams.get('awayTeam');
  const leagueKey = searchParams.get('leagueKey');

  const empty: GameDetailsResponse = { homeLast5: [], awayLast5: [], h2h: [] };

  if (!homeTeam || !awayTeam || !leagueKey) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const slug = ESPN_SLUGS[leagueKey];
  if (!slug) return NextResponse.json(empty);

  const [homeId, awayId] = await Promise.all([
    getTeamId(slug, homeTeam),
    getTeamId(slug, awayTeam),
  ]);

  if (!homeId || !awayId) return NextResponse.json(empty);

  const [homeEvents, awayEvents] = await Promise.all([
    fetchAllSchedules(homeId),
    fetchAllSchedules(awayId),
  ]);

  const allHomeResults = parseResults(homeEvents, homeId);
  const allAwayResults = parseResults(awayEvents, awayId);
  const h2hResults = parseResults(homeEvents, homeId, awayId);

  return NextResponse.json({
    homeLast5: allHomeResults.slice(-5).reverse(),
    awayLast5: allAwayResults.slice(-5).reverse(),
    h2h: h2hResults.reverse(),
  } satisfies GameDetailsResponse);
}
