import { create } from 'zustand';
import type { DailyPuzzle, DailyCompletion, PlayerStats, LeaderboardEntry } from '@/types';
import type { DailyData } from '@/lib/daily.server';
import { REJECTION_MESSAGES, type RejectionReason } from '@/lib/constants';
import { debug } from '@/lib/debug';

// localStorage keys for persisting game progress
const CHAIN_STORAGE_KEY = 'wordbridge_daily_chain';
const ATTEMPTS_STORAGE_KEY = 'wordbridge_daily_attempts';

interface StoredChain {
  puzzleDate: string;
  chain: string[];
}

interface StoredAttempts {
  puzzleDate: string;
  attempts: { valid: boolean }[];
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
    if (data.puzzleDate === puzzleDate) {
      return data.chain;
    }
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

// Attempts persist separately so they survive completion (needed for share text)
function saveAttemptsToStorage(puzzleDate: string, attempts: { valid: boolean }[]): void {
  if (typeof window === 'undefined') return;
  try {
    const data: StoredAttempts = { puzzleDate, attempts };
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be unavailable or full
  }
}

function loadAttemptsFromStorage(puzzleDate: string): { valid: boolean }[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    if (!stored) return [];
    const data: StoredAttempts = JSON.parse(stored);
    if (data.puzzleDate === puzzleDate) {
      return data.attempts;
    }
    localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
    return [];
  } catch {
    return [];
  }
}


interface DailyState {
  // Puzzle state
  puzzle: DailyPuzzle | null;
  chain: string[];
  attempts: { valid: boolean }[];
  shareCode: string | null;
  isComplete: boolean;
  hasCompletedToday: boolean;

  // Completion data (for already completed puzzles)
  previousCompletion: DailyCompletion | null;

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

  // Hint actions
  fetchHints: () => Promise<void>;
  incrementRejectionCount: () => void;
  resetHintState: () => void;
  dismissHints: () => void;
}

export const useDailyStore = create<DailyState>((set, get) => ({
  puzzle: null,
  chain: [],
  attempts: [],
  shareCode: null,
  isComplete: false,
  hasCompletedToday: false,
  previousCompletion: null,
  isLoading: false,
  isValidating: false,
  error: null,

  // Hint state
  hintWords: [],
  showHints: false,
  rejectionCount: 0,
  lastWordTimestamp: Date.now(),
  isFetchingHints: false,

  stats: null,
  leaderboard: [],
  totalCompletions: 0,
  sessionId: '',

  setSessionId: (sessionId) => set({ sessionId }),

  initializeWithData: (data, sessionId) => {
    let chain: string[];
    const attempts = loadAttemptsFromStorage(data.puzzle.puzzle_date);

    if (data.hasCompletedToday && data.completion) {
      // User already completed today's puzzle - show their solution
      chain = data.completion.chain;
      clearChainStorage();
    } else {
      // Check for saved progress from localStorage
      const savedChain = loadChainFromStorage(data.puzzle.puzzle_date);
      if (savedChain && savedChain.length > 0 && savedChain[0] === data.puzzle.start_word) {
        chain = savedChain;
      } else {
        chain = [data.puzzle.start_word];
      }
    }

    set({
      puzzle: data.puzzle,
      chain,
      attempts,
      shareCode: data.completion?.shareCode ?? null,
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
      const attempts = loadAttemptsFromStorage(puzzle.puzzle_date);
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
        attempts,
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
          shareCode: data.completion?.shareCode ?? get().shareCode,
          stats: data.stats,
          // If already completed, show their solution
          chain: data.hasCompleted && data.completion ? data.completion.chain : get().chain,
          isComplete: data.hasCompleted,
        });
      }
    } catch (error) {
      debug.dailyStore.error('Failed to load status:', error);
    }
  },

  loadLeaderboard: async () => {
    const { puzzle } = get();
    if (!puzzle) return;

    try {
      const response = await fetch(`/api/daily/leaderboard?puzzleId=${puzzle.id}&limit=50`);
      const data = await response.json();

      if (response.ok) {
        set({
          leaderboard: data.leaderboard,
          totalCompletions: data.totalCompletions,
        });
      }
    } catch (error) {
      debug.dailyStore.error('Failed to load leaderboard:', error);
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
        // Rollback optimistic update and record failed attempt
        const reason = data.reason as RejectionReason | undefined;
        const errorMessage =
          reason && REJECTION_MESSAGES[reason]
            ? REJECTION_MESSAGES[reason]
            : data.error || 'Failed to submit word';
        const newAttempts = [...state.attempts, { valid: false }];
        set({
          error: errorMessage,
          isValidating: false,
          chain: previousChain,
          attempts: newAttempts,
          rejectionCount: state.rejectionCount + 1,
        });
        if (state.puzzle) {
          saveAttemptsToStorage(state.puzzle.puzzle_date, newAttempts);
        }
        setTimeout(() => set({ error: null }), 2500);
        return false;
      }

      // Update with server-confirmed chain, record successful attempt, and reset hint state
      const newAttempts = [...state.attempts, { valid: true }];
      set({
        chain: data.chain,
        attempts: newAttempts,
        shareCode: data.shareCode ?? state.shareCode,
        isValidating: false,
        isComplete: data.isComplete,
        hasCompletedToday: data.isComplete && !data.isPractice ? true : state.hasCompletedToday,
        // Reset hints on successful word
        hintWords: [],
        showHints: false,
        rejectionCount: 0,
        lastWordTimestamp: Date.now(),
      });

      // Save attempts (persists across reloads, even after completion)
      if (state.puzzle) {
        saveAttemptsToStorage(state.puzzle.puzzle_date, newAttempts);
      }

      // Save chain progress to localStorage (only for non-complete games)
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
      attempts: [],
      shareCode: null,
      isComplete: false,
      hasCompletedToday: false,
      previousCompletion: null,
      isLoading: false,
      isValidating: false,
      error: null,
      hintWords: [],
      showHints: false,
      rejectionCount: 0,
      lastWordTimestamp: Date.now(),
      isFetchingHints: false,
      stats: null,
      leaderboard: [],
      totalCompletions: 0,
    }),

  // Hint actions
  fetchHints: async () => {
    const state = get();
    if (!state.puzzle || state.isFetchingHints || state.isComplete || state.hasCompletedToday) return;

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
