import { League } from '@/lib/leagues';
import { Game } from '@/lib/odds';
import { LogoMap } from '@/lib/espn';
import { StatsResponse } from '@/app/api/stats/route';
import { PrefetchedMap } from '@/app/page';
import GameRow from './GameCard';

interface LeagueSectionProps {
  league: League;
  games: Game[];
  logoMap: LogoMap;
  statsMap: StatsResponse;
  prefetchedMap: PrefetchedMap;
}

export default function LeagueSection({ league, games, logoMap, statsMap, prefetchedMap }: LeagueSectionProps) {
  const sorted = [...games].sort(
    (a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
  );

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xl">{league.flag}</span>
        <h2 className="text-base font-bold text-white">{league.name}</h2>
        <span className="text-xs text-slate-500">{league.country}</span>
        <span className="ml-auto text-xs text-slate-600">
          {games.length} {games.length === 1 ? 'match' : 'matches'}
        </span>
      </div>

      <div className="rounded-xl bg-[#12141f] border border-[#1e2035] overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-[#1e2035] bg-[#0e1020]">
          <span className="w-[80px] shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Time</span>
          <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Match</span>
        </div>

        {sorted.map((game) => (
          <GameRow
            key={game.id}
            game={game}
            league={league}
            logoMap={logoMap}
            gameStats={statsMap[game.id] ?? null}
            prefetched={prefetchedMap[game.id] ?? null}
          />
        ))}
      </div>
    </section>
  );
}
