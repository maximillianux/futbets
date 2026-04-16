'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/Header';
import LeagueSection from '@/components/LeagueSection';
import { LEAGUES } from '@/lib/leagues';
import { Game } from '@/lib/odds';
import { LogoMap } from '@/lib/espn';
import { StatsResponse } from './api/stats/route';

type OddsData = Record<string, Game[]>;

export default function Home() {
  const [data, setData] = useState<OddsData | null>(null);
  const [logoMap, setLogoMap] = useState<LogoMap>({});
  const [statsMap, setStatsMap] = useState<StatsResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [oddsRes, logosRes, statsRes] = await Promise.all([
        fetch('/api/odds'),
        fetch('/api/logos'),
        fetch('/api/stats'),
      ]);

      if (!oddsRes.ok) {
        const body = await oddsRes.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${oddsRes.status}`);
      }

      const [oddsJson, logosJson, statsJson] = await Promise.all([
        oddsRes.json() as Promise<OddsData>,
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

  const leaguesWithGames = data
    ? LEAGUES.filter((l) => (data[l.key]?.length ?? 0) > 0)
    : [];

  const totalGames = leaguesWithGames.reduce(
    (sum, l) => sum + (data?.[l.key]?.length ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white">
      <Header onRefresh={fetchData} loading={loading} lastUpdated={lastUpdated} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Hero strip */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-green-500/10 via-[#12141f] to-[#12141f] border border-green-500/10 px-6 py-5">
          <h1 className="text-xl font-bold text-white mb-1">Today&apos;s Fixtures &amp; Odds</h1>
          <p className="text-sm text-slate-400">
            Top football leagues · Average across bookmakers · American odds
          </p>
          {!loading && data && (
            <div className="mt-3 flex gap-4 text-sm">
              <span className="text-white font-semibold">{totalGames} matches</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">{leaguesWithGames.length} leagues</span>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-10 w-10 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
            <p className="text-slate-400">Fetching live odds&hellip;</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6 text-center">
            <p className="text-red-400 font-semibold mb-1">Could not load odds</p>
            <p className="text-sm text-slate-400 mb-4">{error}</p>
            {error.includes('ODDS_API_KEY') && (
              <div className="rounded-lg bg-[#12141f] border border-[#1e2035] p-4 text-left text-sm max-w-lg mx-auto">
                <p className="text-white font-semibold mb-2">Set up your API key:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Get a free key at <span className="text-green-400">the-odds-api.com</span></li>
                  <li>Open <code className="text-amber-400">.env.local</code> in the project root</li>
                  <li>Replace <code className="text-amber-400">your_api_key_here</code> with your key</li>
                  <li>Restart the dev server</li>
                </ol>
              </div>
            )}
            <button
              onClick={fetchData}
              className="mt-4 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-2 text-sm text-green-400 hover:bg-green-500/20 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && data && leaguesWithGames.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-5xl">🌙</span>
            <p className="text-lg font-semibold text-white">No matches in the next 24 hours</p>
            <p className="text-sm text-slate-400">Check back later or refresh to see upcoming fixtures</p>
          </div>
        )}

        {/* League sections */}
        {!loading && !error && leaguesWithGames.length > 0 && (
          <div className="space-y-8">
            {leaguesWithGames.map((league) => (
              <LeagueSection
                key={league.key}
                league={league}
                games={data![league.key]}
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
