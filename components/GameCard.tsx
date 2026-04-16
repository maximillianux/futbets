'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Game, processOdds } from '@/lib/odds';
import { decimalToAmerican } from '@/lib/american-odds';
import { findLogo, LogoMap } from '@/lib/espn';
import { League } from '@/lib/leagues';
import { TeamStats, FormResult, LegInfo, GameResult } from '@/lib/stats';
import { GameStatEntry } from '@/app/api/stats/route';
import { GameDetailsResponse, MatchResult } from '@/app/api/game-details/route';

interface GameRowProps {
  game: Game;
  league: League;
  logoMap: LogoMap;
  gameStats: GameStatEntry | null;
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

function OddsBtn({ odds }: { odds: number | null }) {
  if (odds === null) {
    return (
      <div className="w-[76px] rounded-lg bg-[#1a1d2e] border border-[#1e2035] py-2 text-center">
        <span className="text-sm font-semibold text-slate-600">—</span>
      </div>
    );
  }
  return (
    <button className="w-[76px] rounded-lg bg-[#1a1d2e] border border-[#1e2035] py-2 text-center hover:bg-[#252840] hover:border-slate-500 transition-colors cursor-pointer">
      <span className="text-sm font-bold text-white">{decimalToAmerican(odds)}</span>
    </button>
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

function DetailsPanel({ homeTeam, awayTeam, leagueKey }: { homeTeam: string; awayTeam: string; leagueKey: string }) {
  const [details, setDetails] = useState<GameDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/game-details?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}&leagueKey=${encodeURIComponent(leagueKey)}`)
      .then((r) => r.json())
      .then((d) => { setDetails(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [homeTeam, awayTeam, leagueKey]);

  if (loading) {
    return (
      <div className="px-4 py-4 flex justify-center">
        <div className="h-4 w-4 rounded-full border border-slate-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!details) return null;

  const hasH2H = details.h2h.length > 0;

  return (
    <div className={`px-4 pb-4 grid gap-4 ${hasH2H ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {/* Home last 5 */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 truncate">{homeTeam} — Last 5</p>
        {details.homeLast5.length === 0
          ? <p className="text-[10px] text-slate-600">No recent results</p>
          : details.homeLast5.map((m, i) => <ResultRow key={i} match={m} />)
        }
      </div>

      {/* H2H */}
      {hasH2H && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Head to Head</p>
          {details.h2h.map((m, i) => <ResultRow key={i} match={m} />)}
        </div>
      )}

      {/* Away last 5 */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 truncate">{awayTeam} — Last 5</p>
        {details.awayLast5.length === 0
          ? <p className="text-[10px] text-slate-600">No recent results</p>
          : details.awayLast5.map((m, i) => <ResultRow key={i} match={m} />)
        }
      </div>
    </div>
  );
}

export default function GameRow({ game, league, logoMap, gameStats }: GameRowProps) {
  const [expanded, setExpanded] = useState(false);

  const odds = processOdds(game);
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
            <TeamMeta stats={gameStats?.home} />
          </div>

          <span className="text-xs text-slate-600 shrink-0">vs</span>

          {/* Away */}
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-sm font-semibold text-white truncate">{game.away_team}</span>
              <TeamLogo name={game.away_team} logoUrl={awayLogo} />
            </div>
            <div className="flex justify-end">
              <TeamMeta stats={gameStats?.away} />
            </div>
          </div>
        </div>

        {/* 1X2 */}
        <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <OddsBtn odds={odds.home} />
          <OddsBtn odds={odds.draw} />
          <OddsBtn odds={odds.away} />
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-[#1e2035] shrink-0" />

        {/* O/U */}
        <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <div className="text-right mr-1">
            <p className="text-[10px] text-slate-600 uppercase tracking-wide">O/U</p>
            <p className="text-xs font-medium text-slate-500">{odds.overPoint ?? 2.5}</p>
          </div>
          <OddsBtn odds={odds.overOdds} />
          <OddsBtn odds={odds.underOdds} />
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
          />
        </div>
      )}
    </div>
  );
}
