'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { Game } from '@/lib/game';
import { findLogo, LogoMap } from '@/lib/espn';
import { League } from '@/lib/leagues';
import { TeamStats, FormResult, LegInfo, GameResult } from '@/lib/stats';
import { GameStatEntry } from '@/app/api/stats/route';
import { GameDetailsResponse, MatchResult } from '@/app/api/game-details/route';
import { StandingRow } from '@/app/api/standings/route';
import { PrefetchedGame } from '@/app/page';

interface GameRowProps {
  game: Game;
  league: League;
  logoMap: LogoMap;
  gameStats: GameStatEntry | null;
  prefetched: PrefetchedGame | null;
}

function TeamLogo({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  if (logoUrl) {
    return (
      <div className="relative h-7 w-7 shrink-0">
        <Image src={logoUrl} alt={name} fill className="object-contain" unoptimized />
      </div>
    );
  }
  return (
    <div className="h-7 w-7 shrink-0 rounded-full bg-[#1a1d2e] border border-[#1e2035] flex items-center justify-center">
      <span className="text-[10px] font-bold text-slate-400">{initials}</span>
    </div>
  );
}

function FormDot({ result }: { result: FormResult }) {
  const colors: Record<FormResult, string> = {
    W: 'bg-green-500',
    D: 'bg-yellow-500',
    L: 'bg-red-500',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[result]}`} title={result} />;
}

function TeamMeta({ stats }: { stats: TeamStats | undefined }) {
  if (!stats) return null;
  const hasRecord = stats.record !== null;
  const hasForm = stats.form.length > 0;
  if (!hasRecord && !hasForm) return null;

  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      {hasRecord && (
        <span className="text-[10px] text-slate-500 font-medium tabular-nums">{stats.record}</span>
      )}
      {hasRecord && hasForm && <span className="text-slate-700 text-[10px]">·</span>}
      {hasForm && (
        <span className="flex items-center gap-0.5">
          {stats.form.map((r, i) => <FormDot key={i} result={r} />)}
        </span>
      )}
    </div>
  );
}


function LegBanner({ legInfo }: { legInfo: LegInfo }) {
  return (
    <div className="mx-4 mb-0 mt-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 flex items-center gap-2">
      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
        {legInfo.leg === 2 ? '2nd Leg' : '1st Leg'}
      </span>
      <span className="text-slate-600 text-[10px]">·</span>
      <span className="text-xs text-slate-300">{legInfo.note}</span>
    </div>
  );
}

function TimeCell({ game, result }: { game: Game; result: GameResult }) {
  const kickoff = new Date(game.commence_time);
  const timeLabel = kickoff.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (result.status === 'finished') {
    return (
      <div className="w-[80px] shrink-0 text-center">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">FT</div>
        <div className="text-base font-bold text-white tabular-nums">
          {result.homeScore ?? 0} – {result.awayScore ?? 0}
        </div>
      </div>
    );
  }
  if (result.status === 'halftime') {
    return (
      <div className="w-[80px] shrink-0 text-center">
        <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">HT</div>
        <div className="text-base font-bold text-white tabular-nums">
          {result.homeScore ?? 0} – {result.awayScore ?? 0}
        </div>
      </div>
    );
  }
  if (result.status === 'live') {
    return (
      <div className="w-[80px] shrink-0 text-center">
        <span className="flex items-center justify-center gap-1 text-xs font-semibold text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
          {result.clock ?? 'LIVE'}
        </span>
        <div className="text-base font-bold text-white tabular-nums mt-0.5">
          {result.homeScore ?? 0} – {result.awayScore ?? 0}
        </div>
      </div>
    );
  }
  return (
    <div className="w-[80px] shrink-0">
      <span className="text-sm font-medium text-slate-300">{timeLabel}</span>
    </div>
  );
}

function ResultBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  const styles = { W: 'bg-green-500/20 text-green-400', D: 'bg-yellow-500/20 text-yellow-400', L: 'bg-red-500/20 text-red-400' };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${styles[result]}`}>{result}</span>
  );
}

function ResultRow({ match }: { match: MatchResult }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-[#1e2035] last:border-0">
      <span className="text-[10px] text-slate-600 w-[44px] shrink-0">{match.date}</span>
      <span className="text-[10px] text-slate-500 w-4 shrink-0">{match.wasHome ? 'H' : 'A'}</span>
      <span className="text-xs text-slate-300 flex-1 truncate">{match.opponent}</span>
      <span className="text-xs font-bold text-white tabular-nums shrink-0">
        {match.goalsFor}–{match.goalsAgainst}
      </span>
      <ResultBadge result={match.result} />
    </div>
  );
}

function StandingsTable({ rows, homeTeam, awayTeam }: { rows: StandingRow[]; homeTeam: string; awayTeam: string }) {
  if (rows.length === 0) return null;

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const isHighlighted = (team: string) =>
    norm(team) === norm(homeTeam) || norm(team) === norm(awayTeam);

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">League Table</p>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="text-slate-600 border-b border-[#1e2035]">
            <th className="text-left pb-1 w-5">#</th>
            <th className="text-left pb-1">Club</th>
            <th className="text-center pb-1 w-5">P</th>
            <th className="text-center pb-1 w-5">W</th>
            <th className="text-center pb-1 w-5">D</th>
            <th className="text-center pb-1 w-5">L</th>
            <th className="text-center pb-1 w-7">GD</th>
            <th className="text-center pb-1 w-7">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hl = isHighlighted(row.team);
            return (
              <tr
                key={row.position}
                className={`border-b border-[#1e2035] last:border-0 ${hl ? 'bg-green-500/10' : ''}`}
              >
                <td className={`py-1 tabular-nums ${hl ? 'text-green-400 font-bold' : 'text-slate-600'}`}>{row.position}</td>
                <td className={`py-1 truncate max-w-[80px] ${hl ? 'text-green-300 font-semibold' : 'text-slate-300'}`}>{row.team}</td>
                <td className="py-1 text-center tabular-nums text-slate-500">{row.played}</td>
                <td className="py-1 text-center tabular-nums text-slate-400">{row.won}</td>
                <td className="py-1 text-center tabular-nums text-slate-500">{row.drawn}</td>
                <td className="py-1 text-center tabular-nums text-slate-500">{row.lost}</td>
                <td className={`py-1 text-center tabular-nums ${row.gd > 0 ? 'text-green-500' : row.gd < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td className={`py-1 text-center tabular-nums font-bold ${hl ? 'text-green-400' : 'text-white'}`}>{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DetailsPanel({
  homeTeam, awayTeam, leagueKey, onFormLoaded, prefetched,
}: {
  homeTeam: string; awayTeam: string; leagueKey: string;
  onFormLoaded: (home: FormResult[], away: FormResult[]) => void;
  prefetched: PrefetchedGame | null;
}) {
  const [details, setDetails] = useState<GameDetailsResponse | null>(prefetched?.details ?? null);
  const [standings, setStandings] = useState<StandingRow[]>(prefetched?.standings ?? []);
  const [loading, setLoading] = useState(!prefetched);

  useEffect(() => {
    if (prefetched) {
      setDetails(prefetched.details);
      setStandings(prefetched.standings);
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`/api/game-details?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}&leagueKey=${encodeURIComponent(leagueKey)}`).then((r) => r.json()),
      fetch(`/api/standings?leagueKey=${encodeURIComponent(leagueKey)}`).then((r) => r.json()),
    ])
      .then(([d, s]: [GameDetailsResponse, unknown]) => {
        setDetails(d);
        setStandings(Array.isArray(s) ? s : []);
        setLoading(false);
        const homeForm = d.homeLast5.map((m) => m.result).reverse() as FormResult[];
        const awayForm = d.awayLast5.map((m) => m.result).reverse() as FormResult[];
        onFormLoaded(homeForm, awayForm);
      })
      .catch(() => setLoading(false));
  }, [homeTeam, awayTeam, leagueKey, onFormLoaded, prefetched]);

  if (loading) {
    return (
      <div className="px-4 py-4 flex justify-center">
        <div className="h-4 w-4 rounded-full border border-slate-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!details) return null;

  const hasH2H = details.h2h.length > 0;
  const hasStandings = standings.length > 0;

  return (
    <div className="px-4 pb-4 flex flex-col gap-4 sm:flex-row sm:gap-6">
      {/* Form + H2H columns */}
      <div className={`flex-1 grid gap-4 min-w-0 grid-cols-2 ${hasH2H ? 'sm:grid-cols-3' : ''}`}>
        {/* Home last 5 */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 truncate">{homeTeam} — Last 5</p>
          {details.homeLast5.length === 0
            ? <p className="text-[10px] text-slate-600">No recent results</p>
            : details.homeLast5.map((m, i) => <ResultRow key={i} match={m} />)
          }
        </div>

        {/* Away last 5 */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 truncate">{awayTeam} — Last 5</p>
          {details.awayLast5.length === 0
            ? <p className="text-[10px] text-slate-600">No recent results</p>
            : details.awayLast5.map((m, i) => <ResultRow key={i} match={m} />)
          }
        </div>

        {/* H2H — spans full width on mobile, stays in grid on desktop */}
        {hasH2H && (
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Head to Head</p>
            {details.h2h.map((m, i) => <ResultRow key={i} match={m} />)}
          </div>
        )}
      </div>

      {/* League table — full width on mobile, fixed sidebar on desktop */}
      {hasStandings && (
        <div className="sm:w-60 sm:shrink-0">
          <StandingsTable rows={standings} homeTeam={homeTeam} awayTeam={awayTeam} />
        </div>
      )}
    </div>
  );
}

export default function GameRow({ game, league, logoMap, gameStats, prefetched }: GameRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [computedForm, setComputedForm] = useState<{ home: FormResult[]; away: FormResult[] } | null>(() => {
    if (!prefetched) return null;
    return {
      home: prefetched.details.homeLast5.map((m) => m.result).reverse() as FormResult[],
      away: prefetched.details.awayLast5.map((m) => m.result).reverse() as FormResult[],
    };
  });

  useEffect(() => {
    if (!prefetched) return;
    setComputedForm({
      home: prefetched.details.homeLast5.map((m) => m.result).reverse() as FormResult[],
      away: prefetched.details.awayLast5.map((m) => m.result).reverse() as FormResult[],
    });
  }, [prefetched]);

  const handleFormLoaded = useCallback((home: FormResult[], away: FormResult[]) => {
    setComputedForm({ home, away });
  }, []);

  const gameResult: GameResult = gameStats?.result ?? { status: 'scheduled', homeScore: null, awayScore: null, clock: null };

  const homeLogo = findLogo(game.home_team, logoMap);
  const awayLogo = findLogo(game.away_team, logoMap);

  const legInfo = gameStats?.legInfo ?? null;

  return (
    <div className="border-b border-[#1e2035] last:border-b-0">
      {legInfo && <LegBanner legInfo={legInfo} />}

      {/* Main row — clickable to expand */}
      <div
        className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Time / Score */}
        <TimeCell game={game} result={gameResult} />

        {/* Teams + meta */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          {/* Home */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <TeamLogo name={game.home_team} logoUrl={homeLogo} />
              <span className="text-sm font-semibold text-white truncate">{game.home_team}</span>
            </div>
            <TeamMeta stats={computedForm
              ? { form: computedForm.home, record: gameStats?.home.record ?? null }
              : gameStats?.home} />
          </div>

          <span className="text-xs text-slate-600 shrink-0">vs</span>

          {/* Away */}
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-sm font-semibold text-white truncate">{game.away_team}</span>
              <TeamLogo name={game.away_team} logoUrl={awayLogo} />
            </div>
            <div className="flex justify-end">
              <TeamMeta stats={computedForm
                ? { form: computedForm.away, record: gameStats?.away.record ?? null }
                : gameStats?.away} />
            </div>
          </div>
        </div>

        {/* Chevron */}
        <div className="shrink-0 text-slate-600">
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="bg-[#0d0f1c] border-t border-[#1e2035]">
          <DetailsPanel
            homeTeam={game.home_team}
            awayTeam={game.away_team}
            leagueKey={league.key}
            onFormLoaded={handleFormLoaded}
            prefetched={prefetched}
          />
        </div>
      )}
    </div>
  );
}
