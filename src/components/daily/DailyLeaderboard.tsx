'use client';

import { useDailyStore } from '@/stores/dailyStore';

export function DailyLeaderboard() {
  const { leaderboard, totalCompletions } = useDailyStore();

  if (leaderboard.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--background)] rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">
          Today&apos;s Leaderboard
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          {totalCompletions} {totalCompletions === 1 ? 'player' : 'players'}
        </div>
      </div>
      <div className="space-y-1">
        {leaderboard.slice(0, 5).map((entry) => (
          <div
            key={`${entry.rank}-${entry.completedAt}`}
            className="flex items-center justify-between py-1"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${
                  entry.rank === 1
                    ? 'bg-[var(--present)]/20 text-[var(--present)]'
                    : entry.rank === 2
                    ? 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]'
                    : entry.rank === 3
                    ? 'bg-[var(--present)]/10 text-[var(--present)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {entry.rank}
              </span>
              <span className="text-sm text-[var(--text)]">
                {entry.playerName}
              </span>
            </div>
            <span className="text-sm font-mono text-[var(--text-muted)]">
              {entry.wordCount} words
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
