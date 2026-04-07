import { create } from 'zustand';
import type { DailyPuzzle, DailyCompletion, PlayerStats, LeaderboardEntry } from '@/types';
import type { DailyData } from '@/lib/daily.server';

// localStorage key for persisting in-progress chain
const CHAIN_STORAGE_KEY = 'wordbridge_daily_chain';

interface StoredChain {
  puzzleDate: string;
  chain: string[];
}

function saveChainToStorage(puzzleDate: string, chain: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const data: StoredChain = { puzzleDate, chain };
    localStorage.setItem(CHAIN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be unavailable or full
  }
}

function loadChainFromStorage(puzzleDate: string): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(CHAIN_STORAGE_KEY);
    if (!stored) return null;
    const data: StoredChain = JSON.parse(stored);
    // Only return chain if it's for today's puzzle
    if (data.puzzleDate === puzzleDate) {
      return data.chain;
    }
    // Clear stale data from previous days
    localStorage.removeItem(CHAIN_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

function clearChainStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CHAIN_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

export type RejectionReason =
  | 'not_related'
  | 'already_used'
  | 'invalid_word'
  | 'same_as_previous'
  | 'too_abstract'
  | 'proper_noun'
  | 'multi_hop'
  | 'misspelled';

const REJECTION_MESSAGES: Record<RejectionReason, string> = {
  not_related: 'Not related enough — try a more direct connection',
  already_used: 'Already used — each word can only appear once',
  invalid_word: 'Not a valid word — try a common English word',
  same_as_previous: 'Same as previous — use a different word',
  too_abstract: 'Too abstract — try something more concrete',
  proper_noun: 'No proper nouns — use common words only',
  multi_hop: 'Too far apart — add a word in between',
  misspelled: 'Check spelling — did you mean something else?',
};

interface DailyState {
  // Puzzle state
  puzzle: DailyPuzzle | null;
  chain: string[];
  isComplete: boolean;
  hasCompletedToday: boolean;

  // Completion data (for already completed puzzles)
  previousCompletion: DailyCompletion | null;

  // UI state
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;

  // Stats
  stats: PlayerStats | null;
  leaderboard: LeaderboardEntry[];
  totalCompletions: number;

  // Session
  sessionId: string;

  // Actions
  initializeWithData: (data: DailyData, sessionId: string) => void;
  setSessionId: (sessionId: string) => void;
  loadPuzzle: () => Promise<void>;
  loadStatus: () => Promise<void>;
  loadLeaderboard: () => Promise<void>;
  submitWord: (word: string) => Promise<boolean>;
  reset: () => void;
}

export const useDailyStore = create<DailyState>((set, get) => ({
  puzzle: null,
  chain: [],
  isComplete: false,
  hasCompletedToday: false,
  previousCompletion: null,
  isLoading: false,
  isValidating: false,
  error: null,
  stats: null,
  leaderboard: [],
  totalCompletions: 0,
  sessionId: '',

  setSessionId: (sessionId) => set({ sessionId }),

  initializeWithData: (data, sessionId) => {
    let chain: string[];

    if (data.hasCompletedToday && data.completion) {
      // User already completed today's puzzle - show their solution
      chain = data.completion.chain;
      clearChainStorage();
    } else {
      // Check for saved progress from localStorage
      const savedChain = loadChainFromStorage(data.puzzle.puzzle_date);
      if (savedChain && savedChain.length > 0 && savedChain[0] === data.puzzle.start_word) {
        // Restore saved progress
        chain = savedChain;
      } else {
        // Start fresh
        chain = [data.puzzle.start_word];
      }
    }

    set({
      puzzle: data.puzzle,
      chain,
      isComplete: data.hasCompletedToday,
      hasCompletedToday: data.hasCompletedToday,
      previousCompletion: data.completion,
      stats: data.stats,
      sessionId,
      isLoading: false,
    });
  },

  loadPuzzle: async () => {
    const { sessionId } = get();
    set({ isLoading: true, error: null });

    try {
      // Fetch puzzle and status in parallel
      const [puzzleResponse, statusResponse] = await Promise.all([
        fetch('/api/daily/puzzle'),
        sessionId ? fetch(`/api/daily/status?sessionId=${sessionId}`) : Promise.resolve(null),
      ]);

      const puzzleData = await puzzleResponse.json();

      if (!puzzleResponse.ok) {
        set({ error: puzzleData.error || 'Failed to load puzzle', isLoading: false });
        return;
      }

      const puzzle = puzzleData.puzzle as DailyPuzzle;

      // Process status response if available
      let statusData = null;
      if (statusResponse && statusResponse.ok) {
        statusData = await statusResponse.json();
      }

      let chain: string[];
      if (statusData?.hasCompleted && statusData?.completion) {
        chain = statusData.completion.chain;
        clearChainStorage();
      } else {
        // Check for saved progress
        const savedChain = loadChainFromStorage(puzzle.puzzle_date);
        if (savedChain && savedChain.length > 0 && savedChain[0] === puzzle.start_word) {
          chain = savedChain;
        } else {
          chain = [puzzle.start_word];
        }
      }

      set({
        puzzle,
        chain,
        isLoading: false,
        hasCompletedToday: statusData?.hasCompleted ?? false,
        previousCompletion: statusData?.completion ?? null,
        stats: statusData?.stats ?? null,
        isComplete: statusData?.hasCompleted ?? false,
      });
    } catch {
      set({ error: 'Network error. Please try again.', isLoading: false });
    }
  },

  loadStatus: async () => {
    const { puzzle, sessionId } = get();
    if (!sessionId) return;

    try {
      // puzzleId is optional - API will use today's puzzle if not provided
      const url = puzzle
        ? `/api/daily/status?sessionId=${sessionId}&puzzleId=${puzzle.id}`
        : `/api/daily/status?sessionId=${sessionId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        set({
          hasCompletedToday: data.hasCompleted,
          previousCompletion: data.completion,
          stats: data.stats,
          // If already completed, show their solution
          chain: data.hasCompleted && data.completion ? data.completion.chain : get().chain,
          isComplete: data.hasCompleted,
        });
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  },

  loadLeaderboard: async () => {
    const { puzzle } = get();
    if (!puzzle) return;

    try {
      const response = await fetch(`/api/daily/leaderboard?puzzleId=${puzzle.id}&limit=10`);
      const data = await response.json();

      if (response.ok) {
        set({
          leaderboard: data.leaderboard,
          totalCompletions: data.totalCompletions,
        });
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  },

  submitWord: async (word: string) => {
    const state = get();
    if (!state.puzzle || !state.sessionId || state.isValidating) {
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
          sessionId: state.sessionId,
          puzzleId: state.puzzle.id,
          word: normalizedWord,
          currentChain: previousChain,
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
        hasCompletedToday: data.isComplete && !data.isPractice ? true : state.hasCompletedToday,
      });

      // Save progress to localStorage (only for non-complete attempts)
      if (!data.isComplete && state.puzzle) {
        saveChainToStorage(state.puzzle.puzzle_date, data.chain);
      }

      // If completed, clear localStorage and load leaderboard/stats
      if (data.isComplete) {
        clearChainStorage();
        await get().loadLeaderboard();
        await get().loadStatus();
      }

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
      hasCompletedToday: false,
      previousCompletion: null,
      isLoading: false,
      isValidating: false,
      error: null,
      stats: null,
      leaderboard: [],
      totalCompletions: 0,
    }),
}));
