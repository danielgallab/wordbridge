'use client';

import { Trophy, Check } from 'lucide-react';

interface CompactPlayerPanelProps {
  name: string;
  chain: string[];
  isWinner?: boolean;
  showFullChain?: boolean; // Show after game ends
  hasFinished?: boolean; // For shortest mode - player reached target
  targetWord?: string; // To check if player reached target
  hideStepCount?: boolean; // Hide step count during shortest mode gameplay
}

export function CompactPlayerPanel({
  name,
  chain,
  isWinner = false,
  showFullChain = false,
  hasFinished = false,
  targetWord,
  hideStepCount = false,
}: CompactPlayerPanelProps) {
  const chainLength = chain.length > 0 ? chain.length - 1 : 0; // Exclude start word

  // Check if player reached target (for shortest mode display)
  const reachedTarget = hasFinished || (targetWord && chain.length > 0 &&
    chain[chain.length - 1]?.toLowerCase() === targetWord.toLowerCase());

  return (
    <div
      className={`
        p-2 sm:p-3 rounded-lg border-2
        ${isWinner ? 'border-[var(--correct)] bg-[var(--correct)]/5' :
          reachedTarget ? 'border-[var(--present)] bg-[var(--present)]/5' :
          'border-[var(--border)] bg-[var(--surface)]'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm font-bold text-[var(--text)]">
          {name}
        </span>
        <div className="flex items-center gap-1">
          {reachedTarget && !isWinner && (
            <Check className="w-4 h-4 text-[var(--present)]" />
          )}
          {isWinner && (
            <Trophy className="w-4 h-4 text-[var(--correct)]" />
          )}
        </div>
      </div>

      {showFullChain ? (
        <div className="font-mono text-xs text-[var(--text-muted)] break-words">
          {chain.join(' → ')}
        </div>
      ) : hideStepCount ? (
        <div className="text-xs text-[var(--text-muted)]">
          {reachedTarget ? (
            <span className="text-[var(--present)]">Done</span>
          ) : (
            <span>Playing...</span>
          )}
        </div>
      ) : (
        <div className="text-xs text-[var(--text-muted)]">
          {chainLength} {chainLength === 1 ? 'step' : 'steps'}
          {reachedTarget && !showFullChain && (
            <span className="text-[var(--present)] ml-1">Done</span>
          )}
        </div>
      )}
    </div>
  );
}
