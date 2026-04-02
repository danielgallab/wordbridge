'use client';

import { ChainDisplay } from './ChainDisplay';
import { WordInput } from './WordInput';

interface PlayerPanelProps {
  name: string;
  chain: string[];
  targetWord: string;
  isYou?: boolean;
  isWinner?: boolean;
  showInput?: boolean;
  onSubmitWord?: (word: string) => void;
  isValidating?: boolean;
  error?: string | null;
  isThinking?: boolean;
  chainLength?: number; // For showing opponent progress without revealing words
  showChainLengthOnly?: boolean; // Hide actual words, just show progress
}

export function PlayerPanel({
  name,
  chain,
  targetWord,
  isYou = false,
  isWinner = false,
  showInput = false,
  onSubmitWord,
  isValidating,
  error,
  isThinking,
  chainLength,
  showChainLengthOnly = false,
}: PlayerPanelProps) {
  const displayLength = chainLength ?? chain.length;
  return (
    <div
      className={`
        p-3 sm:p-4 rounded-lg border-2
        ${isWinner ? 'border-[var(--correct)] bg-[var(--correct)]/5' : 'border-[var(--border)]'}
        ${isYou ? 'border-[var(--present)]' : ''}
      `}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold uppercase text-[var(--text-muted)]">
          {name}
        </span>
        {isYou && (
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--present)] text-white font-bold">
            YOU
          </span>
        )}
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--correct)]/10 border border-[var(--correct)]/30">
          <span className="text-xs uppercase text-[var(--correct)] font-bold">Target</span>
          <span className="font-mono font-bold uppercase text-[var(--correct)]">
            {targetWord}
          </span>
        </div>
      </div>

      <div className="min-h-[120px] sm:min-h-[180px] mb-3">
        {showChainLengthOnly ? (
          <div className="flex flex-col items-center justify-center h-[120px] sm:h-[180px] text-center">
            <div className="text-4xl sm:text-6xl font-bold text-[var(--text-muted)] mb-2">
              {displayLength - 1}
            </div>
            <div className="text-xs sm:text-sm text-[var(--text-muted)] uppercase tracking-wider">
              {displayLength - 1 === 1 ? 'word' : 'words'}
            </div>
          </div>
        ) : (
          <ChainDisplay chain={chain} targetWord={targetWord} isPlayer={isYou} isValidating={isValidating} />
        )}
        {isThinking && (
          <div className="flex gap-1 items-center px-3 py-2 text-[var(--text-muted)] text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {showInput && onSubmitWord && (
        <WordInput
          onSubmit={onSubmitWord}
          isValidating={isValidating}
          error={error}
        />
      )}
    </div>
  );
}
