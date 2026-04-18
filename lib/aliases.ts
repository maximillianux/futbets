/**
 * Maps normalize(OddsAPI name) → normalize(ESPN name).
 * Add an entry whenever the two APIs use different names for the same club.
 */
export const TEAM_ALIASES: Record<string, string> = {
  // Portugal
  'sporting lisbon': 'sporting cp',
  // Ligue 1 — Odds API often uses short names, ESPN uses full French names
  'lyon': 'olympique lyonnais',
  'marseille': 'olympique marseille',
  'olympique marseille': 'marseille',   // reverse, in case ESPN uses short name
  // La Liga
  'alaves': 'deportivo alaves',
  'atletico bilbao': 'athletic club',
  'athletic bilbao': 'athletic club',
  // Eredivisie
  'psv': 'psv eindhoven',
  'az': 'az alkmaar',
  // MLS — Odds API sometimes omits "FC" or city prefix
  'inter miami': 'inter miami cf',
  'st louis city': 'st louis city',
};

export function resolveAlias(norm: string): string {
  return TEAM_ALIASES[norm] ?? norm;
}
