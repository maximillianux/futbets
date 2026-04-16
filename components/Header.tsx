'use client';

import { useState } from 'react';

interface HeaderProps {
  onRefresh: () => void;
  loading: boolean;
  lastUpdated: Date | null;
}

export default function Header({ onRefresh, loading, lastUpdated }: HeaderProps) {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-50 border-b border-[#1e2035] bg-[#0a0b14]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <span className="text-2xl font-black tracking-tight text-white">
              fut<span className="text-green-400">bets</span>
            </span>
          </div>
          <span className="hidden sm:block h-5 w-px bg-[#1e2035]" />
          <span className="hidden sm:block text-sm text-slate-400">{today}</span>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="hidden md:block text-xs text-slate-500">
              Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-1.5 text-sm text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}
