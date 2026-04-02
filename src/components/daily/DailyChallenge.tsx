'use client';

import { useEffect, useCallback } from 'react';
import { useDailyStore } from '@/stores/dailyStore';
import { getSessionId } from '@/lib/sessionId';
import { WordInput } from '@/components/game/WordInput';
import { DailyCompletionModal } from './DailyCompletionModal';
import { calculatePathQuality } from '@/lib/scoring';

export function DailyChallenge() {
  const {
    puzzle,
    chain,
    isComplete,
    hasCompletedToday,
    isPracticeMode,
    isLoading,
    isValidating,
    error,
    sessionId,
    setSessionId,
    loadPuzzle,
    submitWord,
    startPracticeMode,
  } = useDailyStore();

  // Initialize session and load puzzle
  useEffect(() => {
    const sid = getSessionId();
    setSessionId(sid);
    loadPuzzle();
  }, [setSessionId, loadPuzzle]);

  const handleSubmitWord = useCallback(
    async (word: string) => {
      await submitWord(word);
    },
    [submitWord]
  );

  // Loading state
  if (isLoading || !puzzle) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-lg p-6 text-center">
          <div className="flex gap-1 justify-center">
            <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-[var(--text-muted)] mt-2">Loading today&apos;s puzzle...</p>
        </div>
      </div>
    );
  }

  // Calculate path quality for completed puzzles
  const pathQuality = isComplete && chain.length > 1
    ? calculatePathQuality(chain.length, 'medium')
    : null;

  // Show completion modal when complete
  if (isComplete && !isPracticeMode) {
    return (
      <DailyCompletionModal
        puzzle={puzzle}
        chain={chain}
        pathQuality={pathQuality}
        onPractice={startPracticeMode}
      />
    );
  }

  // Already completed view - show their solution with option to practice
  if (hasCompletedToday && !isPracticeMode && !isComplete) {
    return (
      <DailyCompletionModal
        puzzle={puzzle}
        chain={chain}
        pathQuality={pathQuality}
        onPractice={startPracticeMode}
        alreadyCompleted
      />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
          {isPracticeMode ? 'Practice Mode' : "Today's Challenge"}
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono font-bold text-lg text-[var(--present)] uppercase">
            {puzzle.start_word}
          </span>
          <span className="text-[var(--text-muted)]">→</span>
          <span className="font-mono font-bold text-lg text-[var(--correct)] uppercase">
            {puzzle.target_word}
          </span>
        </div>
        {isPracticeMode && (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Results won&apos;t be saved
          </p>
        )}
      </div>

      {/* Game Card */}
      <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-lg p-4">
        {/* Chain Display */}
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-2">
            Your Chain ({chain.length - 1} {chain.length === 2 ? 'word' : 'words'})
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {chain.map((word, index) => (
              <span key={index} className="flex items-center">
                <span
                  className={`font-mono text-sm uppercase px-2 py-1 rounded ${
                    index === 0
                      ? 'bg-[var(--present)]/20 text-[var(--present)]'
                      : word === puzzle.target_word.toLowerCase()
                      ? 'bg-[var(--correct)]/20 text-[var(--correct)]'
                      : 'bg-[var(--background)] text-[var(--text)]'
                  }`}
                >
                  {word}
                </span>
                {index < chain.length - 1 && (
                  <span className="text-[var(--text-muted)] mx-1">→</span>
                )}
              </span>
            ))}
            {!isComplete && (
              <>
                <span className="text-[var(--text-muted)] mx-1">→</span>
                <span className="font-mono text-sm uppercase px-2 py-1 rounded bg-[var(--correct)]/10 text-[var(--correct)] border border-dashed border-[var(--correct)]/30">
                  {puzzle.target_word}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Word Input */}
        <WordInput
          onSubmit={handleSubmitWord}
          disabled={isComplete}
          isValidating={isValidating}
          error={error}
        />
      </div>

      {/* Session info for debugging (hidden in production) */}
      {process.env.NODE_ENV === 'development' && sessionId && (
        <p className="text-xs text-[var(--text-muted)] text-center mt-2">
          Session: {sessionId.slice(0, 8)}...
        </p>
      )}
    </div>
  );
}
