'use client';

interface ChainDisplayProps {
  chain: string[];
  targetWord: string;
  isPlayer?: boolean;
  isValidating?: boolean;
  chainLength?: number;
  censored?: boolean;
}

export function ChainDisplay({ chain, targetWord, isPlayer = false, isValidating = false, chainLength, censored = false }: ChainDisplayProps) {
  // For censored display, show only the middle words (exclude start word at index 0)
  const displayCount = censored ? (chainLength ?? chain.length) : chain.length;

  if (censored) {
    // Show only middle words (skip the start word)
    const middleWordCount = Math.max(0, displayCount - 1);

    if (middleWordCount === 0) {
      return (
        <div className="flex items-center justify-center h-[120px] sm:h-[180px] text-center">
          <span className="text-sm text-[var(--text-muted)]">No words yet</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-0">
        {Array.from({ length: middleWordCount }, (_, i) => (
          <div key={i}>
            {/* Connecting arrow */}
            <div className="flex justify-center py-0.5">
              <svg
                className="w-3 h-3 text-[var(--text-muted)] opacity-40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </div>
            <div className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-md font-bold uppercase text-xs sm:text-sm flex items-center justify-between bg-[var(--surface)] border border-[var(--border)]">
              <span className="blur-sm select-none text-[var(--text-muted)]">????</span>
              <span className="text-xs opacity-60">+{i + 1}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const items = chain;

  return (
    <div className="flex flex-col gap-0">
      {items.map((item, index) => {
        const word = item as string;
        const isStart = index === 0;
        const isTarget = word.toLowerCase() === targetWord.toLowerCase();
        const isLastWord = index === items.length - 1;
        const isPending = isPlayer && isValidating && isLastWord && !isStart;

        return (
          <div key={`${word}-${index}`}>
            {/* Connecting arrow between words */}
            {index > 0 && (
              <div className="flex justify-center py-0.5">
                <svg
                  className="w-3 h-3 text-[var(--text-muted)] animate-arrow-appear"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </div>
            )}
            <div
              className={`
                px-2 sm:px-3 py-1.5 sm:py-2 rounded-md font-bold uppercase text-xs sm:text-sm
                flex items-center justify-between
                ${isStart ? 'bg-[var(--present)] text-white' : ''}
                ${isTarget ? 'bg-[var(--correct)] text-white' : ''}
                ${!isStart && !isTarget ? 'bg-[var(--surface)] border border-[var(--border)]' : ''}
                ${isPending ? 'opacity-60 animate-pulse' : ''}
              `}
              style={{
                animation: isLastWord && !isPending ? 'pop 0.15s ease' : undefined,
              }}
            >
              <span>{word}</span>
              <span className="text-xs opacity-60">
                {isPending ? '...' : `+${index}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
