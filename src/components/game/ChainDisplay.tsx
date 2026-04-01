'use client';

interface ChainDisplayProps {
  chain: string[];
  targetWord: string;
  isPlayer?: boolean;
  isValidating?: boolean;
}

export function ChainDisplay({ chain, targetWord, isPlayer = false, isValidating = false }: ChainDisplayProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {chain.map((word, index) => {
        const isStart = index === 0;
        const isTarget = word.toLowerCase() === targetWord.toLowerCase();
        const isLastWord = index === chain.length - 1;
        const isPending = isPlayer && isValidating && isLastWord && !isStart;

        return (
          <div
            key={`${word}-${index}`}
            className={`
              px-3 py-2 rounded-md font-bold uppercase text-sm
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
        );
      })}
    </div>
  );
}
