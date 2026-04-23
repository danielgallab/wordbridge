'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useDailyStore } from '@/stores/dailyStore';

export function DailyLeaderboard() {
  const { leaderboard, totalCompletions, sessionId } = useDailyStore();
  const [expandedRank, setExpandedRank] = useState<number | null>(null);

  if (leaderboard.length === 0) {
    return null;
  }

  const toggleExpand = (rank: number) => {
    setExpandedRank(expandedRank === rank ? null : rank);
  };

  // Each row is ~36px (py-1.5 + text). 5 rows ≈ 180px.
  const ROW_HEIGHT = 36;
  const VISIBLE_ROWS = 5;

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
      <div
        className="space-y-1 overflow-y-auto"
        style={{ maxHeight: ROW_HEIGHT * VISIBLE_ROWS }}
      >
        {leaderboard.map((entry) => (
          <div key={`${entry.rank}-${entry.completedAt}`}>
            <button
              onClick={() => entry.chain && toggleExpand(entry.rank)}
              className={`w-full flex items-center justify-between py-1.5 px-1 rounded transition-colors ${
                entry.chain ? 'hover:bg-[var(--surface)] cursor-pointer' : 'cursor-default'
              }`}
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
                <span className={`text-sm ${entry.sessionId === sessionId ? 'font-bold text-[var(--present)]' : 'text-[var(--text)]'}`}>
                  {entry.sessionId === sessionId ? 'You' : entry.playerName}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-mono text-[var(--text-muted)]">
                  {entry.wordCount} words
                </span>
                {entry.chain && (
                  expandedRank === entry.rank ? (
                    <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                  )
                )}
              </div>
            </button>
            {/* Expandable chain display */}
            {expandedRank === entry.rank && entry.chain && (
              <div className="ml-7 mr-1 mt-1 mb-2 p-2 bg-[var(--surface)] rounded border border-[var(--border)]">
                <div className="font-mono text-xs text-[var(--present)] break-words leading-relaxed">
                  {entry.chain.join(' → ')}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
