export interface Game {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  home_team_abbr?: string;
  away_team_abbr?: string;
}
