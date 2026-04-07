'use client';

import { Trophy } from 'lucide-react';

interface CompactPlayerPanelProps {
  name: string;
  chain: string[];
  isWinner?: boolean;
  showFullChain?: boolean; // Show after game ends
}

export function CompactPlayerPanel({
  name,
  chain,
  isWinner = false,
  showFullChain = false,
}: CompactPlayerPanelProps) {
  const chainLength = chain.length > 0 ? chain.length - 1 : 0; // Exclude start word

  return (
    <div
      className={`
        p-2 sm:p-3 rounded-lg border-2
        ${isWinner ? 'border-[var(--correct)] bg-[var(--correct)]/5' : 'border-[var(--border)] bg-[var(--surface)]'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm font-bold text-[var(--text)]">
          {name}
        </span>
        {isWinner && (
          <Trophy className="w-4 h-4 text-[var(--correct)]" />
        )}
      </div>

      {showFullChain ? (
        <div className="font-mono text-xs text-[var(--text-muted)] break-words">
          {chain.join(' → ')}
        </div>
      ) : (
        <div className="text-xs text-[var(--text-muted)]">
          {chainLength} {chainLength === 1 ? 'step' : 'steps'}
        </div>
      )}
    </div>
  );
}
