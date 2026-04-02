'use client';

import type { PlayerStats } from '@/types';

interface DailyStatsProps {
  stats: PlayerStats;
}

export function DailyStats({ stats }: DailyStatsProps) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      <StatBox label="Played" value={stats.totalCompletions} />
      <StatBox label="Streak" value={stats.currentStreak} />
      <StatBox label="Max Streak" value={stats.maxStreak} />
      <StatBox
        label="Best"
        value={stats.bestWordCount ?? '-'}
        subtitle="words"
      />
    </div>
  );
}

function StatBox({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
}) {
  return (
    <div className="bg-[var(--background)] rounded-lg p-2 text-center">
      <div className="text-xl font-bold text-[var(--text)]">{value}</div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      {subtitle && (
        <div className="text-xs text-[var(--text-muted)]">{subtitle}</div>
      )}
    </div>
  );
}
