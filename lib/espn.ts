import { LEAGUES } from './leagues';
import { resolveAlias } from './aliases';

/** ESPN league slug for each Odds API sport key */
export const ESPN_SLUGS: Record<string, string> = {
  soccer_epl: 'eng.1',
  soccer_spain_la_liga: 'esp.1',
  soccer_germany_bundesliga: 'ger.1',
  soccer_italy_serie_a: 'ita.1',
  soccer_france_ligue_one: 'fra.1',
  soccer_uefa_champs_league: 'uefa.champions',
  soccer_uefa_europa_league: 'uefa.europa',
  soccer_usa_mls: 'usa.1',
  soccer_netherlands_eredivisie: 'ned.1',
  soccer_portugal_primeira_liga: 'por.1',
  soccer_mexico_ligamx: 'mex.1',
};

interface ESPNTeam {
  team: {
    displayName: string;
    logos?: Array<{ href: string }>;
  };
}

interface ESPNResponse {
  sports: Array<{
    leagues: Array<{
      teams: ESPNTeam[];
    }>;
  }>;
}

/** Strip common prefixes/suffixes so "FC Barcelona" matches "Barcelona" etc. */
export function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/-/g, ' ')  // hyphens → spaces BEFORE stripping special chars (Saint-Germain → saint germain)
    .replace(/\b(fc|cf|sc|afc|ac|as|ss|rc|rsc|cd|ud|sd|real|atletico|atlético|atletico de|bsc)\b/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type LogoMap = Record<string, string>;

export async function fetchTeamLogos(): Promise<LogoMap> {
  const logoMap: LogoMap = {};

  await Promise.all(
    LEAGUES.map(async (league) => {
      const slug = ESPN_SLUGS[league.key];
      if (!slug) return;

      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams`;
        const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 24h
        if (!res.ok) return;

        const data: ESPNResponse = await res.json();
        const teams = data?.sports?.[0]?.leagues?.[0]?.teams ?? [];

        for (const { team } of teams) {
          const logo = team.logos?.[0]?.href;
          if (!logo) continue;
          // Store under both exact name and normalized name for matching
          logoMap[team.displayName] = logo;
          logoMap[normalize(team.displayName)] = logo;
        }
      } catch {
        // silently skip leagues that fail
      }
    })
  );

  return logoMap;
}

/** Look up a logo URL for a team name, trying exact then alias then fuzzy match */
export function findLogo(teamName: string, logoMap: LogoMap): string | null {
  if (logoMap[teamName]) return logoMap[teamName];

  const norm = normalize(teamName);
  if (logoMap[norm]) return logoMap[norm];

  // Try alias (e.g. "Sporting Lisbon" → "Sporting CP")
  const aliased = resolveAlias(norm);
  if (aliased !== norm && logoMap[aliased]) return logoMap[aliased];

  // Partial match: collect all candidates then return the most specific (longest key).
  // Require the ESPN key to have at least 2 words — prevents single-word keys like
  // "paris" (Paris FC after stripping "FC") from matching "Paris Saint-Germain".
  const candidates: Array<{ url: string; keyLen: number }> = [];

  for (const [key, url] of Object.entries(logoMap)) {
    const keyNorm = normalize(key);
    if (!keyNorm || !norm) continue;

    const keyWordCount = keyNorm.split(' ').filter((w) => w.length > 1).length;
    if (keyWordCount < 2) continue;

    if (keyNorm.includes(norm) || norm.includes(keyNorm)) {
      candidates.push({ url, keyLen: keyNorm.length });
    }
  }

  if (candidates.length === 0) return null;

  // Most specific match = longest normalized key
  candidates.sort((a, b) => b.keyLen - a.keyLen);
  return candidates[0].url;
}
