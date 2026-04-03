import { create } from 'zustand';
import type { DailyPuzzle, DailyCompletion, PlayerStats, LeaderboardEntry } from '@/types';
import type { DailyData } from '@/lib/daily.server';

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
  not_related: 'Not related enough',
  already_used: 'Already used',
  invalid_word: 'Not a valid word',
  same_as_previous: 'Same as previous word',
  too_abstract: 'Connection too abstract',
  proper_noun: 'Proper nouns not allowed',
  multi_hop: 'Needs intermediate steps',
  misspelled: 'Check your spelling',
};

interface DailyState {
  // Puzzle state
  puzzle: DailyPuzzle | null;
  chain: string[];
  isComplete: boolean;
  hasCompletedToday: boolean;
  isPracticeMode: boolean;

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
  startPracticeMode: () => void;
  reset: () => void;
}

export const useDailyStore = create<DailyState>((set, get) => ({
  puzzle: null,
  chain: [],
  isComplete: false,
  hasCompletedToday: false,
  isPracticeMode: false,
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
    set({
      puzzle: data.puzzle,
      chain: data.hasCompletedToday && data.completion
        ? data.completion.chain
        : [data.puzzle.start_word],
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

      set({
        puzzle,
        chain: statusData?.hasCompleted && statusData?.completion
          ? statusData.completion.chain
          : [puzzle.start_word],
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

      // If completed, load leaderboard and stats
      if (data.isComplete) {
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

  startPracticeMode: () => {
    const { puzzle } = get();
    if (!puzzle) return;

    set({
      isPracticeMode: true,
      isComplete: false,
      chain: [puzzle.start_word],
    });
  },

  reset: () =>
    set({
      puzzle: null,
      chain: [],
      isComplete: false,
      hasCompletedToday: false,
      isPracticeMode: false,
      previousCompletion: null,
      isLoading: false,
      isValidating: false,
      error: null,
      stats: null,
      leaderboard: [],
      totalCompletions: 0,
    }),
}));
