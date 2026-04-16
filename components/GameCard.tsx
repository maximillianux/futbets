'use client';

import Image from 'next/image';
import { Game, processOdds } from '@/lib/odds';
import { decimalToAmerican } from '@/lib/american-odds';
import { findLogo, LogoMap } from '@/lib/espn';
import { League } from '@/lib/leagues';
import { TeamStats, FormResult, LegInfo, GameResult } from '@/lib/stats';
import { GameStatEntry } from '@/app/api/stats/route';

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

export default function GameRow({ game, league, logoMap, gameStats }: GameRowProps) {
  const odds = processOdds(game);
  const gameResult: GameResult = gameStats?.result ?? { status: 'scheduled', homeScore: null, awayScore: null, clock: null };

  const homeLogo = findLogo(game.home_team, logoMap);
  const awayLogo = findLogo(game.away_team, logoMap);

  const legInfo = gameStats?.legInfo ?? null;

  return (
    <div className="border-b border-[#1e2035] last:border-b-0">
      {legInfo && <LegBanner legInfo={legInfo} />}

      <div className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors">
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
        <div className="shrink-0 flex items-center gap-1.5">
          <OddsBtn odds={odds.home} />
          <OddsBtn odds={odds.draw} />
          <OddsBtn odds={odds.away} />
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-[#1e2035] shrink-0" />

        {/* O/U */}
        <div className="shrink-0 flex items-center gap-1.5">
          <div className="text-right mr-1">
            <p className="text-[10px] text-slate-600 uppercase tracking-wide">O/U</p>
            <p className="text-xs font-medium text-slate-500">{odds.overPoint ?? 2.5}</p>
          </div>
          <OddsBtn odds={odds.overOdds} />
          <OddsBtn odds={odds.underOdds} />
        </div>
      </div>
    </div>
  );
}
