'use client';

import { useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Home, RotateCcw, Plus, LogIn } from 'lucide-react';
import { usePracticeStore, type PracticePuzzle } from '@/stores/practiceStore';
import { WordInput, type WordInputHandle } from '@/components/game/WordInput';
import { ChainDisplay } from '@/components/game/ChainDisplay';
import { HintBubble } from '@/components/game/HintBubble';
import { useHintTrigger } from '@/hooks/useHintTrigger';
import { usePlayerExperience } from '@/hooks/usePlayerExperience';
import { PracticeCompletionModal } from './PracticeCompletionModal';
import { calculatePathQuality } from '@/lib/scoring';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { PracticeData } from '@/lib/daily.server';

interface PracticeModeProps {
  initialData: PracticeData | null;
}

export function PracticeMode({ initialData }: PracticeModeProps) {
  const initialized = useRef(false);
  const prevChainLengthRef = useRef(0);
  const prevErrorRef = useRef<string | null>(null);
  const wordInputRef = useRef<WordInputHandle>(null);
  const { play: playSound } = useSoundEffects();
  const { isExperienced, autoHintsEnabled, incrementGamesCompleted } = usePlayerExperience();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onClearInput: () => wordInputRef.current?.clear(),
    onFocusInput: () => wordInputRef.current?.focus(),
  });
  const {
    puzzle,
    chain,
    isComplete,
    isLoading,
    isValidating,
    error,
    initializeWithData,
    loadNewPuzzle,
    submitWord,
    reset,
    // Hint state
    hintWords,
    showHints,
    rejectionCount,
    lastWordTimestamp,
    isFetchingHints,
    fetchHints,
    dismissHints,
  } = usePracticeStore();

  // Hint trigger hook - respects player experience and preferences
  useHintTrigger({
    chainLength: chain.length,
    rejectionCount,
    lastWordTimestamp,
    onTrigger: fetchHints,
    enabled: autoHintsEnabled && !isComplete && !isLoading && !!puzzle,
    showHints,
    isFetchingHints,
    isExperienced,
  });

  // Initialize with SSR data on mount, or fetch if no initial data
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (initialData?.puzzle) {
      initializeWithData(initialData.puzzle as PracticePuzzle);
    } else {
      loadNewPuzzle();
    }
  }, [initialData, initializeWithData, loadNewPuzzle]);

  // Play sound effects on chain changes and errors
  useEffect(() => {
    // Play success sound when chain grows
    if (chain.length > prevChainLengthRef.current && prevChainLengthRef.current > 0) {
      if (isComplete) {
        playSound('win');
        // Track game completion for hint frequency scaling
        incrementGamesCompleted();
      } else {
        playSound('success');
      }
    }
    prevChainLengthRef.current = chain.length;
  }, [chain.length, isComplete, playSound, incrementGamesCompleted]);

  useEffect(() => {
    // Play error sound when error appears
    if (error && error !== prevErrorRef.current) {
      playSound('error');
    }
    prevErrorRef.current = error;
  }, [error, playSound]);

  const handleSubmitWord = useCallback(
    async (word: string) => {
      await submitWord(word);
    },
    [submitWord]
  );

  const handleNewPuzzle = useCallback(() => {
    reset();
    loadNewPuzzle();
  }, [reset, loadNewPuzzle]);

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
          <p className="text-[var(--text-muted)] mt-2">Loading puzzle...</p>
        </div>
      </div>
    );
  }

  // Calculate path quality for completed puzzles
  const pathQuality = isComplete && chain.length > 1
    ? calculatePathQuality(chain.length, 'medium')
    : null;

  // Show completion modal when complete
  if (isComplete) {
    return (
      <PracticeCompletionModal
        puzzle={puzzle}
        chain={chain}
        pathQuality={pathQuality}
        onNewPuzzle={handleNewPuzzle}
      />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
          Practice Mode
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
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Results won&apos;t be saved
        </p>
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

        {/* Hint Bubble */}
        {showHints && hintWords.length > 0 && (
          <HintBubble words={hintWords} onDismiss={dismissHints} />
        )}

        {/* Word Input */}
        <WordInput
          ref={wordInputRef}
          onSubmit={handleSubmitWord}
          disabled={isComplete}
          isValidating={isValidating}
          error={error}
        />
      </div>

      {/* Actions */}
      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <Link
            href="/"
            className="flex-1 py-2.5 rounded-md border border-[var(--border)] text-[var(--text-muted)] text-sm font-medium hover:border-[var(--present)] hover:text-[var(--present)] transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Daily Challenge
          </Link>
          <button
            onClick={handleNewPuzzle}
            className="flex-1 py-2.5 rounded-md border border-[var(--border)] text-[var(--text-muted)] text-sm font-medium hover:border-[var(--correct)] hover:text-[var(--correct)] transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            New Puzzle
          </button>
        </div>

        {/* Multiplayer Buttons */}
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

      </div>
  );
}
