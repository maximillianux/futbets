import { normalize, ESPN_SLUGS } from './espn';
import { Game } from './odds';

export type FormResult = 'W' | 'D' | 'L';

export interface TeamStats {
  form: FormResult[];   // last 5, oldest→newest for display
  record: string | null; // e.g. "15-5-3" (W-D-L)
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
  team: { displayName: string };
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

function parseRecord(records: ESPNRecord[] | undefined): string | null {
  return records?.find((r) => r.type === 'total')?.summary ?? null;
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

// ── Team name aliases (Odds API name → ESPN normalized name) ─────────────────
// Add entries here whenever ESPN and The Odds API use different names for the same club.
const TEAM_ALIASES: Record<string, string> = {
  'sporting lisbon': 'sporting cp',
};

/** Resolve an Odds API normalized name to the ESPN normalized name if an alias exists. */
function resolveAlias(norm: string): string {
  return TEAM_ALIASES[norm] ?? norm;
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function fetchLeagueStats(
  leagueKey: string,
  games: Game[]
): Promise<Record<string, { home: TeamStats; away: TeamStats; legInfo: LegInfo | null }>> {
  const slug = ESPN_SLUGS[leagueKey];
  if (!slug || games.length === 0) return {};

  // Fetch scoreboard (form + leg info) and standings (records) in parallel
  let events: ESPNEvent[] = [];
  let standingsMap = new Map<string, string>();
  try {
    const [sbRes, stMap] = await Promise.all([
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`, { cache: 'no-store' }),
      fetchStandingsRecord(slug),
    ]);
    if (sbRes.ok) {
      const data: ESPNScoreboard = await sbRes.json();
      events = data.events ?? [];
    }
    standingsMap = stMap;
  } catch {
    // ESPN unavailable — return empty stats
  }

  // Build normalized name → stats map from ESPN events (form + scoreboard record as fallback)
  const teamMap = new Map<string, TeamStats>();
  const legMap = new Map<string, LegInfo>(); // "normHome::normAway"

  for (const event of events) {
    const comp = event.competitions[0];
    if (!comp) continue;

    const home = comp.competitors.find((c) => c.homeAway === 'home');
    const away = comp.competitors.find((c) => c.homeAway === 'away');

    if (home) {
      const normName = normalize(home.team.displayName);
      teamMap.set(normName, {
        form: parseForm(home.form),
        record: standingsMap.get(normName) ?? parseRecord(home.records),
      });
    }
    if (away) {
      const normName = normalize(away.team.displayName);
      teamMap.set(normName, {
        form: parseForm(away.form),
        record: standingsMap.get(normName) ?? parseRecord(away.records),
      });
    }

    // Leg / aggregate info (UCL, UEL)
    if (comp.leg && home && away) {
      const note = comp.notes?.find((n) => n.type === 'event');
      legMap.set(`${normalize(home.team.displayName)}::${normalize(away.team.displayName)}`, {
        leg: comp.leg.value,
        note: note?.headline ?? comp.leg.displayValue,
        homeAggregate: home.aggregateScore ?? null,
        awayAggregate: away.aggregateScore ?? null,
      });
    }
  }

  // Match each Odds API game to ESPN stats
  const empty: TeamStats = { form: [], record: null };
  const result: Record<string, { home: TeamStats; away: TeamStats; legInfo: LegInfo | null }> = {};

  for (const game of games) {
    const homeNorm = normalize(game.home_team);
    const awayNorm = normalize(game.away_team);
    const homeKey = resolveAlias(homeNorm);
    const awayKey = resolveAlias(awayNorm);

    // For teams not in today's scoreboard, fall back to standings record (no form)
    const homeStats: TeamStats = teamMap.get(homeKey) ?? {
      form: [],
      record: standingsMap.get(homeKey) ?? null,
    };
    const awayStats: TeamStats = teamMap.get(awayKey) ?? {
      form: [],
      record: standingsMap.get(awayKey) ?? null,
    };

    result[game.id] = {
      home: homeStats,
      away: awayStats,
      legInfo: legMap.get(`${homeKey}::${awayKey}`) ?? null,
    };
  }

  return result;
}
