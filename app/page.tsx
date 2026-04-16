'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import LeagueSection from '@/components/LeagueSection';
import { LEAGUES } from '@/lib/leagues';
import { Game } from '@/lib/odds';
import { LogoMap } from '@/lib/espn';
import { StatsResponse } from './api/stats/route';

type OddsData = Record<string, Game[]>;

function toLocalDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
}

function buildDateRange(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

function DateNav({ selected, onChange }: { selected: string; onChange: (d: string) => void }) {
  const days = buildDateRange();
  return (
    <div className="flex gap-1 mb-6 border-b border-[#1e2035] pb-4">
      {days.map((d) => {
        const dateStr = toLocalDateStr(d);
        const isSelected = dateStr === selected;
        const isToday = dateStr === toLocalDateStr(new Date());
        const dayName = isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return (
          <button
            key={dateStr}
            onClick={() => onChange(dateStr)}
            className={`flex-1 py-2 px-1 rounded-lg text-center transition-colors ${
              isSelected
                ? 'bg-green-500/15 border border-green-500/30 text-green-400'
                : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className="text-[11px] font-bold uppercase tracking-wide">{dayName}</div>
            <div className="text-xs mt-0.5">{dateLabel}</div>
          </button>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<OddsData | null>(null);
  const [logoMap, setLogoMap] = useState<LogoMap>({});
  const [statsMap, setStatsMap] = useState<StatsResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateStr(new Date()));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fixturesRes, logosRes, statsRes] = await Promise.all([
        fetch('/api/fixtures'),
        fetch('/api/logos'),
        fetch('/api/stats'),
      ]);

      if (!fixturesRes.ok) {
        const body = await fixturesRes.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${fixturesRes.status}`);
      }

      const [oddsJson, logosJson, statsJson] = await Promise.all([
        fixturesRes.json() as Promise<OddsData>,
        logosRes.ok ? (logosRes.json() as Promise<LogoMap>) : Promise.resolve({} as LogoMap),
        statsRes.ok ? (statsRes.json() as Promise<StatsResponse>) : Promise.resolve({} as StatsResponse),
      ]);

      setData(oddsJson);
      setLogoMap(logosJson);
      setStatsMap(statsJson);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load odds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter all games to the selected date (local timezone)
  const filteredData: OddsData | null = data
    ? Object.fromEntries(
        Object.entries(data).map(([key, games]) => [
          key,
          games.filter((g) => toLocalDateStr(new Date(g.commence_time)) === selectedDate),
        ])
      )
    : null;

  const leaguesWithGames = filteredData
    ? LEAGUES.filter((l) => (filteredData[l.key]?.length ?? 0) > 0)
    : [];

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white">
      <Header onRefresh={fetchData} loading={loading} lastUpdated={lastUpdated} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <DateNav selected={selectedDate} onChange={setSelectedDate} />

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-10 w-10 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
            <p className="text-slate-400">Fetching odds&hellip;</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6 text-center">
            <p className="text-red-400 font-semibold mb-1">Could not load odds</p>
            <p className="text-sm text-slate-400 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-2 text-sm text-green-400 hover:bg-green-500/20 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredData && leaguesWithGames.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-lg font-semibold text-white">No matches available</p>
            <p className="text-sm text-slate-400">No odds posted for this date yet</p>
          </div>
        )}

        {/* League sections */}
        {!loading && !error && leaguesWithGames.length > 0 && (
          <div className="space-y-8">
            {leaguesWithGames.map((league) => (
              <LeagueSection
                key={league.key}
                league={league}
                games={filteredData![league.key]}
                logoMap={logoMap}
                statsMap={statsMap}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-[#1e2035] py-6 text-center text-xs text-slate-600">
        Odds via The Odds API · Logos via ESPN · For entertainment only · Gamble responsibly
      </footer>
    </div>
  );
}
