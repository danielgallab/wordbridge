'use client';

import { useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Plus, LogIn } from 'lucide-react';
import { useDailyStore } from '@/stores/dailyStore';
import { ensureSessionId } from '@/lib/sessionId';
import { WordInput } from '@/components/game/WordInput';
import { ChainDisplay } from '@/components/game/ChainDisplay';
import { DailyCompletionModal } from './DailyCompletionModal';
import { calculatePathQuality } from '@/lib/scoring';
import type { DailyData } from '@/lib/daily.server';

interface DailyChallengeProps {
  initialData: DailyData | null;
}

export function DailyChallenge({ initialData }: DailyChallengeProps) {
  const initialized = useRef(false);
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
    initializeWithData,
    submitWord,
    startPracticeMode,
  } = useDailyStore();

  // Initialize store with SSR data on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Ensure session cookie exists (creates one if new user)
    const sid = ensureSessionId();

    if (initialData) {
      initializeWithData(initialData, sid);
    }
  }, [initialData, initializeWithData]);

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
          <ChainDisplay
            chain={chain}
            targetWord={puzzle.target_word}
            isPlayer
            isValidating={isValidating}
          />
        </div>

        {/* Word Input */}
        <WordInput
          onSubmit={handleSubmitWord}
          disabled={isComplete}
          isValidating={isValidating}
          error={error}
        />
      </div>

      {/* Multiplayer CTA */}
      <div className="mt-4 opacity-40 hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">or play with friends</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>
        <div className="flex gap-2">
          <Link
            href="/multiplayer?action=create"
            className="flex-1 py-2.5 rounded-md border border-[var(--border)] text-[var(--text-muted)] text-sm font-medium hover:border-[var(--correct)] hover:text-[var(--correct)] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Room
          </Link>
          <Link
            href="/multiplayer?action=join"
            className="flex-1 py-2.5 rounded-md border border-[var(--border)] text-[var(--text-muted)] text-sm font-medium hover:border-[var(--present)] hover:text-[var(--present)] transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Join Room
          </Link>
        </div>
      </div>
    </div>
  );
}
