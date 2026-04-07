import { create } from 'zustand';
import { REJECTION_MESSAGES, type RejectionReason } from '@/lib/constants';

export interface PracticePuzzle {
  start_word: string;
  target_word: string;
}

interface PracticeState {
  // Puzzle state
  puzzle: PracticePuzzle | null;
  chain: string[];
  isComplete: boolean;

  // UI state
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;

  // Actions
  initializeWithData: (puzzle: PracticePuzzle) => void;
  loadNewPuzzle: () => Promise<void>;
  submitWord: (word: string) => Promise<boolean>;
  reset: () => void;
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
  puzzle: null,
  chain: [],
  isComplete: false,
  isLoading: false,
  isValidating: false,
  error: null,

  initializeWithData: (puzzle: PracticePuzzle) => {
    set({
      puzzle,
      chain: [puzzle.start_word],
      isComplete: false,
      isLoading: false,
      isValidating: false,
      error: null,
    });
  },

  loadNewPuzzle: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/daily/practice');
      const data = await response.json();

      if (!response.ok) {
        set({ error: data.error || 'Failed to load puzzle', isLoading: false });
        return;
      }

      const puzzle = data.puzzle;

      set({
        puzzle,
        chain: [puzzle.start_word],
        isComplete: false,
        isLoading: false,
      });
    } catch {
      set({ error: 'Network error. Please try again.', isLoading: false });
    }
  },

  submitWord: async (word: string) => {
    const state = get();
    if (!state.puzzle || state.isValidating) {
      return false;
    }

    const normalizedWord = word.trim().toLowerCase();

    // Don't allow duplicates
    if (state.chain.includes(normalizedWord)) {
      set({ error: `"${word}" is already in your chain` });
      setTimeout(() => set({ error: null }), 2500);
      return false;
    }

    // Optimistic update
    const previousChain = state.chain;
    const optimisticChain = [...previousChain, normalizedWord];

    set({
      isValidating: true,
      error: null,
      chain: optimisticChain,
    });

    try {
      const response = await fetch('/api/daily/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: normalizedWord,
          currentChain: previousChain,
          targetWord: state.puzzle.target_word,
          isPractice: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Rollback optimistic update
        const reason = data.reason as RejectionReason | undefined;
        const errorMessage =
          reason && REJECTION_MESSAGES[reason]
            ? REJECTION_MESSAGES[reason]
            : data.error || 'Failed to submit word';
        set({
          error: errorMessage,
          isValidating: false,
          chain: previousChain,
        });
        setTimeout(() => set({ error: null }), 2500);
        return false;
      }

      // Update with server-confirmed chain
      set({
        chain: data.chain,
        isValidating: false,
        isComplete: data.isComplete,
      });

      return true;
    } catch {
      // Rollback on network error
      set({
        error: 'Network error. Please try again.',
        isValidating: false,
        chain: previousChain,
      });
      setTimeout(() => set({ error: null }), 2500);
      return false;
    }
  },

  reset: () =>
    set({
      puzzle: null,
      chain: [],
      isComplete: false,
      isLoading: false,
      isValidating: false,
      error: null,
    }),
}));
