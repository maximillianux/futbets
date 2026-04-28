import { normalize, ESPN_SLUGS } from './espn';
import { resolveAlias } from './aliases';
import { Game } from './game';

export type FormResult = 'W' | 'D' | 'L';

export interface TeamStats {
  form: FormResult[];   // last 5, oldest→newest for display
  record: string | null; // e.g. "15-5-3" (W-D-L) overall
  homeRecord: string | null; // e.g. "10-2-1" at home
  awayRecord: string | null; // e.g. "5-3-2" away
}

export type GameStatus = 'scheduled' | 'live' | 'halftime' | 'finished';

export interface GameResult {
  status: GameStatus;
  homeScore: number | null;
  awayScore: number | null;
  clock: string | null; // e.g. "67'" live, "90'+5'" finished
}

export interface LegInfo {
  leg: number;          // 1 or 2
  note: string;         // e.g. "2nd Leg - Atlético Madrid lead 2-0 on aggregate"
  homeAggregate: number | null;
  awayAggregate: number | null;
}

export interface LeagueStats {
  teams: Record<string, TeamStats>; // normalized name → stats
  legs: Record<string, LegInfo>;    // "normHome::normAway" → leg info
}

// ── ESPN response types ───────────────────────────────────────────────────────

interface ESPNRecord {
  type: string;
  summary: string; // "15-5-3" (W-D-L)
}

interface ESPNCompetitor {
  homeAway: 'home' | 'away';
  form?: string;           // e.g. "WWLDD" (newest first)
  records?: ESPNRecord[];
  aggregateScore?: number;
  score?: string;
  team: { id: string; displayName: string };
}

interface ESPNStatus {
  displayClock: string;
  type: { name: string };
}

interface ESPNStandingStat {
  name: string;
  value?: number;
}

interface ESPNStandingEntry {
  team: { displayName: string };
  stats?: ESPNStandingStat[];
}

interface ESPNLeg {
  value: number;
  displayValue: string;
}

interface ESPNNote {
  type: string;
  headline: string;
}

interface ESPNCompetition {
  competitors: ESPNCompetitor[];
  status?: ESPNStatus;
  leg?: ESPNLeg;
  notes?: ESPNNote[];
}

interface ESPNEvent {
  competitions: ESPNCompetition[];
}

interface ESPNScoreboard {
  events?: ESPNEvent[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseForm(formStr: string | undefined): FormResult[] {
  if (!formStr) return [];
  // ESPN returns newest-first; reverse so display is oldest→newest (left→right)
  return formStr
    .split('')
    .reverse()
    .filter((c): c is FormResult => c === 'W' || c === 'D' || c === 'L')
    .slice(0, 5);
}

function parseGameResult(comp: ESPNCompetition): GameResult {
  const typeName = comp.status?.type?.name ?? '';
  const clock = comp.status?.displayClock ?? null;
  const home = comp.competitors.find((c) => c.homeAway === 'home');
  const away = comp.competitors.find((c) => c.homeAway === 'away');
  const homeScore = home?.score != null ? Number(home.score) : null;
  const awayScore = away?.score != null ? Number(away.score) : null;

  let status: GameStatus = 'scheduled';
  if (typeName === 'STATUS_HALFTIME') status = 'halftime';
  else if (typeName === 'STATUS_IN_PROGRESS') status = 'live';
  else if (typeName === 'STATUS_FULL_TIME' || typeName === 'STATUS_FINAL' || typeName === 'STATUS_FT') status = 'finished';

  return { status, homeScore, awayScore, clock };
}

function parseRecord(records: ESPNRecord[] | undefined): { total: string | null; home: string | null; away: string | null } {
  const find = (type: string) => records?.find((r) => r.type === type)?.summary ?? null;
  return { total: find('total'), home: find('home'), away: find('away') };
}

/** Fetch home+away split records for a set of team IDs → normalized name → { home, away } */
async function fetchTeamSplitRecords(
  slug: string,
  teams: Array<{ id: string; displayName: string }>
): Promise<Map<string, { home: string | null; away: string | null }>> {
  const map = new Map<string, { home: string | null; away: string | null }>();
  await Promise.all(
    teams.map(async ({ id, displayName }) => {
      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${id}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data = await res.json();
        const items: Array<{ type: string; stats?: Array<{ name: string; value: number }> }> =
          data?.team?.record?.items ?? [];
        const total = items.find((r) => r.type === 'total');
        if (!total?.stats) return;
        const s: Record<string, number> = {};
        for (const stat of total.stats) s[stat.name] = stat.value;
        const hw = Math.round(s['homeWins'] ?? 0);
        const hd = Math.round(s['homeTies'] ?? 0);
        const hl = Math.round(s['homeLosses'] ?? 0);
        const aw = Math.round(s['awayWins'] ?? 0);
        const ad = Math.round(s['awayTies'] ?? 0);
        const al = Math.round(s['awayLosses'] ?? 0);
        map.set(normalize(displayName), {
          home: hw + hd + hl > 0 ? `${hw}-${hd}-${hl}` : null,
          away: aw + ad + al > 0 ? `${aw}-${ad}-${al}` : null,
        });
      } catch { /* ignore */ }
    })
  );
  return map;
}

/** Fetch league standings → normalized team name → "W-D-L" string */
async function fetchStandingsRecord(slug: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const url = `https://site.api.espn.com/apis/v2/sports/soccer/${slug}/standings`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return map;
    const data = await res.json() as { children?: Array<{ standings?: { entries?: ESPNStandingEntry[] } }> };
    const entries = data.children?.[0]?.standings?.entries ?? [];
    for (const entry of entries) {
      const statsMap: Record<string, number> = {};
      for (const s of entry.stats ?? []) {
        if (s.value !== undefined) statsMap[s.name] = s.value;
      }
      const w = Math.round(statsMap['wins'] ?? 0);
      const d = Math.round(statsMap['ties'] ?? 0);
      const l = Math.round(statsMap['losses'] ?? 0);
      if (w + d + l > 0) {
        map.set(normalize(entry.team.displayName), `${w}-${d}-${l}`);
      }
    }
  } catch {
    // standings unavailable
  }
  return map;
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function fetchLeagueStats(
  leagueKey: string,
  games: Game[]
): Promise<Record<string, { home: TeamStats; away: TeamStats; legInfo: LegInfo | null; result: GameResult }>> {
  const slug = ESPN_SLUGS[leagueKey];
  if (!slug || games.length === 0) return {};

  // Build date strings for past 2 days (UTC) to cover all US timezones
  const pastDates = [1, 2].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  });

  // Extract unique future dates from the games list so we can fetch form data for them
  const futureDates = [...new Set(
    games
      .map((g) => {
        const d = new Date(g.commence_time);
        return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
      })
  )];

  const scoreboardUrls = [
    // Default scoreboard — today's live/upcoming events
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`,
    // Past dates — needed for yesterday's completed results
    ...pastDates.map((d) => `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${d}`),
    ...pastDates.map((d) => `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${d}&calendartype=whitelist`),
    // Future dates — needed to get form data for upcoming fixtures
    ...futureDates.map((d) => `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${d}`),
  ];

  let events: ESPNEvent[] = [];
  let standingsMap = new Map<string, string>();
  let splitMap = new Map<string, { home: string | null; away: string | null }>();
  try {
    const seen = new Set<string>();
    const [rawEvents, stMap] = await Promise.all([
      Promise.all(
        scoreboardUrls.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) return [] as ESPNEvent[];
            const data: ESPNScoreboard = await res.json();
            return data.events ?? [];
          } catch { return [] as ESPNEvent[]; }
        })
      ),
      fetchStandingsRecord(slug),
    ]);
    for (const batch of rawEvents) {
      for (const ev of batch) {
        const key = String((ev as unknown as Record<string, unknown>).id ?? JSON.stringify(ev));
        if (!seen.has(key)) { seen.add(key); events.push(ev); }
      }
    }
    standingsMap = stMap;

    // Collect unique teams from today's fixtures to fetch home/away splits
    const teamsSeen = new Map<string, { id: string; displayName: string }>();
    for (const game of games) {
      const event = events.find((ev) => String((ev as unknown as Record<string, unknown>).id) === game.id);
      if (!event) continue;
      const comp = event.competitions[0];
      if (!comp) continue;
      for (const c of comp.competitors) {
        if (!teamsSeen.has(c.team.id)) teamsSeen.set(c.team.id, c.team);
      }
    }
    splitMap = await fetchTeamSplitRecords(slug, [...teamsSeen.values()]);
  } catch {
    // ESPN unavailable — return empty stats
  }

  // Build normalized name → stats map from ESPN events (form + scoreboard record as fallback)
  const teamMap = new Map<string, TeamStats>();
  const legMap = new Map<string, LegInfo>();        // "normHome::normAway"
  const resultMap = new Map<string, GameResult>();  // "normHome::normAway"

  for (const event of events) {
    const comp = event.competitions[0];
    if (!comp) continue;

    const home = comp.competitors.find((c) => c.homeAway === 'home');
    const away = comp.competitors.find((c) => c.homeAway === 'away');

    if (home) {
      const normName = normalize(home.team.displayName);
      const newForm = parseForm(home.form);
      const rec = parseRecord(home.records);
      const splits = splitMap.get(normName);
      const existing = teamMap.get(normName);
      teamMap.set(normName, {
        form: newForm.length > 0 ? newForm : (existing?.form ?? []),
        record: standingsMap.get(normName) ?? rec.total ?? existing?.record ?? null,
        homeRecord: splits?.home ?? existing?.homeRecord ?? null,
        awayRecord: splits?.away ?? existing?.awayRecord ?? null,
      });
    }
    if (away) {
      const normName = normalize(away.team.displayName);
      const newForm = parseForm(away.form);
      const rec = parseRecord(away.records);
      const splits = splitMap.get(normName);
      const existing = teamMap.get(normName);
      teamMap.set(normName, {
        form: newForm.length > 0 ? newForm : (existing?.form ?? []),
        record: standingsMap.get(normName) ?? rec.total ?? existing?.record ?? null,
        homeRecord: splits?.home ?? existing?.homeRecord ?? null,
        awayRecord: splits?.away ?? existing?.awayRecord ?? null,
      });
    }

    if (home && away) {
      const key = `${normalize(home.team.displayName)}::${normalize(away.team.displayName)}`;
      resultMap.set(key, parseGameResult(comp));

      // Leg / aggregate info (UCL, UEL)
      if (comp.leg) {
        const note = comp.notes?.find((n) => n.type === 'event');
        legMap.set(key, {
          leg: comp.leg.value,
          note: note?.headline ?? comp.leg.displayValue,
          homeAggregate: home.aggregateScore ?? null,
          awayAggregate: away.aggregateScore ?? null,
        });
      }
    }
  }

  // Match each ESPN game to stats
  const empty: TeamStats = { form: [], record: null, homeRecord: null, awayRecord: null };
  const defaultResult: GameResult = { status: 'scheduled', homeScore: null, awayScore: null, clock: null };
  const result: Record<string, { home: TeamStats; away: TeamStats; legInfo: LegInfo | null; result: GameResult }> = {};

  for (const game of games) {
    const homeNorm = normalize(game.home_team);
    const awayNorm = normalize(game.away_team);
    const homeKey = resolveAlias(homeNorm);
    const awayKey = resolveAlias(awayNorm);

    // For teams not in today's scoreboard, fall back to standings record (no form)
    const homeStats: TeamStats = teamMap.get(homeKey) ?? {
      form: [],
      record: standingsMap.get(homeKey) ?? null,
      homeRecord: splitMap.get(homeKey)?.home ?? null,
      awayRecord: splitMap.get(homeKey)?.away ?? null,
    };
    const awayStats: TeamStats = teamMap.get(awayKey) ?? {
      form: [],
      record: standingsMap.get(awayKey) ?? null,
      homeRecord: splitMap.get(awayKey)?.home ?? null,
      awayRecord: splitMap.get(awayKey)?.away ?? null,
    };

    result[game.id] = {
      home: homeStats,
      away: awayStats,
      legInfo: legMap.get(`${homeKey}::${awayKey}`) ?? null,
      result: resultMap.get(`${homeKey}::${awayKey}`) ?? defaultResult,
    };
  }

  return result;
}
