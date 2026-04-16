/**
 * Maps Odds API team names (normalized) → ESPN team names (normalized).
 * Add an entry here whenever ESPN and The Odds API use different names for the same club.
 */
export const TEAM_ALIASES: Record<string, string> = {
  'sporting lisbon': 'sporting cp',
};

export function resolveAlias(norm: string): string {
  return TEAM_ALIASES[norm] ?? norm;
}
