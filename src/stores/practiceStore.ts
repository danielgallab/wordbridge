import { create } from 'zustand';
import { normalizeWord, checkDuplicate, parseSubmissionError, flashError } from '@/lib/submission';

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

  // Hint state
  hintWords: string[];
  showHints: boolean;
  rejectionCount: number;
  lastWordTimestamp: number;
  isFetchingHints: boolean;

  // Actions
  initializeWithData: (puzzle: PracticePuzzle) => void;
  loadNewPuzzle: () => Promise<void>;
  submitWord: (word: string) => Promise<boolean>;
  reset: () => void;

  // Hint actions
  fetchHints: () => Promise<void>;
  incrementRejectionCount: () => void;
  resetHintState: () => void;
  dismissHints: () => void;
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
  puzzle: null,
  chain: [],
  isComplete: false,
  isLoading: false,
  isValidating: false,
  error: null,

  // Hint state
  hintWords: [],
  showHints: false,
  rejectionCount: 0,
  lastWordTimestamp: Date.now(),
  isFetchingHints: false,

  initializeWithData: (puzzle: PracticePuzzle) => {
    set({
      puzzle,
      chain: [puzzle.start_word],
      isComplete: false,
      isLoading: false,
      isValidating: false,
      error: null,
      // Reset hint state
      hintWords: [],
      showHints: false,
      rejectionCount: 0,
      lastWordTimestamp: Date.now(),
      isFetchingHints: false,
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
        // Reset hint state
        hintWords: [],
        showHints: false,
        rejectionCount: 0,
        lastWordTimestamp: Date.now(),
        isFetchingHints: false,
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

    const normalized = normalizeWord(word);
    const dupeError = checkDuplicate(word, state.chain);
    if (dupeError) {
      flashError(set, dupeError);
      return false;
    }

    // Optimistic update
    const previousChain = state.chain;
    set({ isValidating: true, error: null, chain: [...previousChain, normalized] });

    try {
      const response = await fetch('/api/daily/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: normalized,
          currentChain: previousChain,
          targetWord: state.puzzle.target_word,
          isPractice: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        set({
          isValidating: false,
          chain: previousChain,
          rejectionCount: state.rejectionCount + 1,
        });
        flashError(set, parseSubmissionError(data));
        return false;
      }

      // Update with server-confirmed chain and reset hint state
      set({
        chain: data.chain,
        isValidating: false,
        isComplete: data.isComplete,
        hintWords: [],
        showHints: false,
        rejectionCount: 0,
        lastWordTimestamp: Date.now(),
      });

      return true;
    } catch {
      set({ isValidating: false, chain: previousChain });
      flashError(set, 'Network error. Please try again.');
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
      hintWords: [],
      showHints: false,
      rejectionCount: 0,
      lastWordTimestamp: Date.now(),
      isFetchingHints: false,
    }),

  // Hint actions
  fetchHints: async () => {
    const state = get();
    if (!state.puzzle || state.isFetchingHints || state.isComplete) return;

    const currentWord = state.chain[state.chain.length - 1];
    const targetWord = state.puzzle.target_word;

    set({ isFetchingHints: true });

    try {
      const response = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentWord,
          targetWord,
          usedWords: state.chain,
        }),
      });

      const data = await response.json();

      // Verify the chain hasn't changed while the request was in-flight
      const currentState = get();
      const latestWord = currentState.chain[currentState.chain.length - 1];
      if (latestWord !== currentWord) {
        set({ isFetchingHints: false });
        return;
      }

      if (response.ok && data.words && data.words.length > 0) {
        set({
          hintWords: data.words,
          showHints: true,
          isFetchingHints: false,
        });
      } else {
        set({ isFetchingHints: false });
      }
    } catch {
      set({ isFetchingHints: false });
    }
  },

  incrementRejectionCount: () => {
    set((state) => ({ rejectionCount: state.rejectionCount + 1 }));
  },

  resetHintState: () => {
    set({
      hintWords: [],
      showHints: false,
      rejectionCount: 0,
      lastWordTimestamp: Date.now(),
      isFetchingHints: false,
    });
  },

  dismissHints: () => {
    set({ showHints: false });
  },
}));
