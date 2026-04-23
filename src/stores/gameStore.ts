import { create } from 'zustand';
import { REJECTION_MESSAGES, DEFAULT_TIME_LIMIT, type RejectionReason } from '@/lib/constants';
import { debug } from '@/lib/debug';

const TOTAL_TIME = DEFAULT_TIME_LIMIT;

// Store timeout ID outside of Zustand state to avoid serialization issues
let rematchTimeoutId: ReturnType<typeof setTimeout> | null = null;

interface Player {
  id: string;
  player_name: string;
  chain: string[];
  is_winner: boolean;
  wants_rematch?: boolean;
  created_at?: string;
}

interface Room {
  id: string;
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  start_word: string;
  target_word: string;
  time_limit: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  winner_id: string | null;
  started_at?: string | null;
}

// Rematch status - only tracks the rematch negotiation flow
// The main game state comes from room.status
export type RematchStatus =
  | 'none'            // No rematch in progress
  | 'requested'       // Current player requested rematch, waiting for opponent
  | 'pending'         // Opponent requested rematch, waiting for current player
  | 'starting';       // Both agreed, transitioning to new game

interface GameState {
  // Room & player info
  room: Room | null;
  playerId: string | null;
  playerName: string;
  players: Player[];
  isHost: boolean;

  // Game state
  myChain: string[];
  myAttempts: { valid: boolean }[];
  timeLeft: number;
  gameStartedAt: string | null; // Server timestamp for synchronized timer
  rematchStatus: RematchStatus;
  localGameEnded: boolean; // Tracks if we've locally ended the game (before server confirms)
  winner: string | null; // Winner player ID, null for draw
  error: string | null;
  isValidating: boolean;

  // Actions
  setRoom: (room: Room) => void;
  setPlayer: (playerId: string, playerName: string) => void;
  setPlayers: (players: Player[]) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  initGame: (room: Room, playerId: string, players: Player[]) => void;
  submitWord: (word: string) => Promise<boolean>;
  tick: () => number;
  endGame: (winnerId: string | null) => void;
  setError: (error: string | null) => void;
  requestRematch: () => Promise<void>;
  setOpponentWantsRematch: (wants: boolean) => void;
  resetForRematch: (startWord: string) => void;
  startGame: () => Promise<boolean>;
  setGameStartedAt: (startedAt: string) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  room: null,
  playerId: null,
  playerName: '',
  players: [],
  isHost: false,
  myChain: [],
  myAttempts: [],
  timeLeft: TOTAL_TIME,
  gameStartedAt: null,
  rematchStatus: 'none',
  localGameEnded: false,
  winner: null,
  error: null,
  isValidating: false,

  setRoom: (room) => {
    const state = get();
    const prevRoom = state.room;
    debug.gameStore.log('setRoom', {
      prevStatus: prevRoom?.status,
      newStatus: room.status,
      prevWinnerId: prevRoom?.winner_id,
      newWinnerId: room.winner_id,
      startWord: room.start_word,
      targetWord: room.target_word,
    });
    set({ room });
  },

  setPlayer: (playerId, playerName) => set({ playerId, playerName }),

  setPlayers: (players) => {
    const state = get();
    const me = players.find(p => p.id === state.playerId);

    // During rematch transition, don't update chains from potentially stale data
    const shouldUpdateChains = state.rematchStatus !== 'starting';

    debug.gameStore.log('setPlayers', {
      rematchStatus: state.rematchStatus,
      roomStatus: state.room?.status,
      shouldUpdateChains,
      meIsWinner: me?.is_winner,
      meChainLength: me?.chain?.length,
      meWantsRematch: me?.wants_rematch,
      totalPlayers: players.length,
    });

    set({
      players,
      myChain: shouldUpdateChains ? (me?.chain || []) : state.myChain,
    });
  },

  updatePlayer: (playerId, updates) => {
    const state = get();
    const newPlayers = state.players.map(p =>
      p.id === playerId ? { ...p, ...updates } : p
    );

    const me = newPlayers.find(p => p.id === state.playerId);

    // During rematch transition, don't update chains from potentially stale data
    const shouldUpdateChains = state.rematchStatus !== 'starting';

    debug.gameStore.log('updatePlayer', {
      updatedPlayerId: playerId,
      isMe: playerId === state.playerId,
      updates,
      rematchStatus: state.rematchStatus,
      roomStatus: state.room?.status,
      shouldUpdateChains,
    });

    set({
      players: newPlayers,
      myChain: shouldUpdateChains ? (me?.chain || state.myChain) : state.myChain,
    });
  },

  initGame: (room, playerId, players) => {
    const me = players.find(p => p.id === playerId);
    const gameFinished = room.status === 'finished';

    // Determine if current player is host (first player by created_at)
    const sortedPlayers = [...players].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
    const isHost = sortedPlayers[0]?.id === playerId;

    // Calculate time remaining based on server start time if game is playing
    let timeLeft = room.time_limit || TOTAL_TIME;
    if (room.status === 'playing' && room.started_at) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(room.started_at).getTime()) / 1000);
      timeLeft = Math.max(0, (room.time_limit || TOTAL_TIME) - elapsedSeconds);
    }

    set({
      room,
      playerId,
      players,
      isHost,
      myChain: me?.chain || [room.start_word],
      myAttempts: [],
      timeLeft,
      gameStartedAt: room.started_at || null,
      rematchStatus: 'none',
      localGameEnded: gameFinished,
      winner: room.winner_id || null,
      error: null,
      isValidating: false,
    });
  },

  submitWord: async (word) => {
    const state = get();
    // Use room.status to check if game is playing
    if (!state.room || !state.playerId || state.room.status !== 'playing' || state.isValidating) {
      return false;
    }

    const normalizedWord = word.trim().toLowerCase();

    // Don't allow duplicates
    if (state.myChain.includes(normalizedWord)) {
      set({ error: `"${word}" is already in your chain` });
      setTimeout(() => set({ error: null }), 2500);
      return false;
    }

    // Optimistic update: immediately add word to chain
    const previousChain = state.myChain;
    const optimisticChain = [...previousChain, normalizedWord];

    set({
      isValidating: true,
      error: null,
      myChain: optimisticChain  // Show word immediately
    });

    try {
      const response = await fetch('/api/rooms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: state.room.id,
          playerId: state.playerId,
          word: normalizedWord,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Rollback optimistic update on error and record failed attempt
        const reason = data.reason as RejectionReason | undefined;
        const errorMessage = reason && REJECTION_MESSAGES[reason]
          ? REJECTION_MESSAGES[reason]
          : (data.error || 'Failed to submit word');
        set({
          error: errorMessage,
          isValidating: false,
          myChain: previousChain,
          myAttempts: [...state.myAttempts, { valid: false }],
        });
        setTimeout(() => set({ error: null }), 2500);
        return false;
      }

      // Update with server-confirmed chain and record successful attempt
      set({
        myChain: data.chain,
        myAttempts: [...state.myAttempts, { valid: true }],
        isValidating: false,
      });

      if (data.isWinner) {
        get().endGame(get().playerId);
      }

      return true;
    } catch {
      // Rollback optimistic update on network error
      set({
        error: 'Network error. Please try again.',
        isValidating: false,
        myChain: previousChain  // Restore previous chain
      });
      setTimeout(() => set({ error: null }), 2500);
      return false;
    }
  },

  tick: () => {
    const state = get();
    // Use room.status to check if game is playing, also check localGameEnded
    if (state.room?.status !== 'playing' || state.localGameEnded) return state.timeLeft;

    // Calculate time remaining from server timestamp to prevent drift
    let newTime: number;
    if (state.gameStartedAt) {
      const timeLimit = state.room?.time_limit || TOTAL_TIME;
      const elapsedSeconds = Math.floor((Date.now() - new Date(state.gameStartedAt).getTime()) / 1000);
      newTime = Math.max(0, timeLimit - elapsedSeconds);
    } else {
      // Fallback to decrement if no server timestamp (shouldn't happen)
      newTime = Math.max(0, state.timeLeft - 1);
    }

    set({ timeLeft: newTime });

    // Time's up - it's a draw (no winner unless someone reached the target)
    if (newTime === 0 && !state.localGameEnded) {
      get().endGame(null);
    }

    return newTime;
  },

  endGame: (winnerId) => {
    const state = get();

    debug.gameStore.log('endGame CALLED', {
      winnerId,
      rematchStatus: state.rematchStatus,
      roomStatus: state.room?.status,
      myChainLength: state.myChain.length,
      startWord: state.room?.start_word,
    });

    set({
      localGameEnded: true,
      winner: winnerId,
    });

    // If this is a draw (time ran out), notify the server to update room status
    // This ensures room.status becomes 'finished' for rematch detection
    if (winnerId === null && state.room?.id) {
      const roomId = state.room.id;
      const notifyServer = async (retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await fetch('/api/rooms/end', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomId }),
            });
            if (response.ok) return;
            debug.gameStore.error(`Server returned ${response.status}, attempt ${i + 1}/${retries}`);
          } catch (err) {
            debug.gameStore.error(`Failed to notify server, attempt ${i + 1}/${retries}:`, err);
          }
          // Wait before retry (exponential backoff)
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      };
      notifyServer();
    }
  },

  setError: (error) => set({ error }),

  requestRematch: async () => {
    const state = get();
    if (!state.room || !state.playerId) return;

    debug.gameStore.log('requestRematch - Starting', {
      roomId: state.room.id,
      playerId: state.playerId,
      rematchStatus: state.rematchStatus,
      currentWinner: state.winner,
    });

    set({ rematchStatus: 'requested' });

    try {
      const response = await fetch('/api/rooms/rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: state.room.id,
          playerId: state.playerId,
        }),
      });

      const data = await response.json();
      debug.gameStore.log('requestRematch - API response', data);

      if (data.rematchStarted) {
        // Reset local state immediately for the player who triggered rematch
        // The other player will get reset via realtime subscription
        debug.gameStore.log('requestRematch - Calling resetForRematch with startWord:', data.startWord);
        get().resetForRematch(data.startWord);
      }
    } catch (err) {
      debug.gameStore.error('requestRematch - Error:', err);
      set({ error: 'Failed to request rematch', rematchStatus: 'none' });
      setTimeout(() => set({ error: null }), 2500);
    }
  },

  setOpponentWantsRematch: (wants: boolean) => {
    const state = get();
    // Only update if we haven't requested yet (opponent requesting first)
    if (wants && state.rematchStatus === 'none') {
      set({ rematchStatus: 'pending' });
    }
    // If we already requested and opponent now wants it too, this should
    // trigger 'starting' via resetForRematch
  },

  resetForRematch: (startWord) => {
    const state = get();
    debug.gameStore.log('resetForRematch - Called', {
      startWord,
      currentStartWord: state.myChain[0],
      currentMyChainLength: state.myChain.length,
      rematchStatus: state.rematchStatus,
      roomStatus: state.room?.status,
      currentWinner: state.winner,
      localGameEnded: state.localGameEnded,
    });

    // If already fully reset for this rematch, skip
    // The key indicator is: rematchStatus is 'none' or 'starting', winner is null,
    // localGameEnded is false, and chain is [startWord]
    // This handles the case where both API response and realtime trigger this
    const alreadyReset = state.myChain.length === 1 &&
      state.myChain[0] === startWord &&
      state.localGameEnded === false &&
      state.winner === null &&
      (state.rematchStatus === 'none' || state.rematchStatus === 'starting');

    if (alreadyReset) {
      debug.gameStore.log('resetForRematch - SKIPPING - already reset for this word');
      return;
    }

    debug.gameStore.log('resetForRematch - Resetting state for new game');
    // Set 'starting' to temporarily ignore stale is_winner updates
    set({
      rematchStatus: 'starting',
      localGameEnded: false,
      myChain: [startWord],
      myAttempts: [],
      timeLeft: state.room?.time_limit || TOTAL_TIME,
      winner: null,
      error: null,
      isValidating: false,
    });
    // Clear any existing timeout before setting a new one
    if (rematchTimeoutId) {
      clearTimeout(rematchTimeoutId);
    }
    // Clear rematch status after a delay to allow realtime updates to settle
    rematchTimeoutId = setTimeout(() => {
      debug.gameStore.log('resetForRematch - Clearing rematch status');
      set({ rematchStatus: 'none' });
      rematchTimeoutId = null;
    }, 1000);
  },

  startGame: async () => {
    const state = get();
    if (!state.room || !state.playerId || !state.isHost) {
      return false;
    }

    try {
      const response = await fetch('/api/rooms/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: state.room.id,
          playerId: state.playerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        set({ error: data.error || 'Failed to start game' });
        setTimeout(() => set({ error: null }), 2500);
        return false;
      }

      // Game started successfully - the room update will come via realtime
      set({ gameStartedAt: data.started_at });
      return true;
    } catch {
      set({ error: 'Network error. Please try again.' });
      setTimeout(() => set({ error: null }), 2500);
      return false;
    }
  },

  setGameStartedAt: (startedAt: string) => {
    const state = get();
    const timeLimit = state.room?.time_limit || TOTAL_TIME;
    const elapsedSeconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const remainingTime = Math.max(0, timeLimit - elapsedSeconds);

    set({
      gameStartedAt: startedAt,
      timeLeft: remainingTime,
    });
  },

  reset: () => {
    // Clear any pending rematch timeout
    if (rematchTimeoutId) {
      clearTimeout(rematchTimeoutId);
      rematchTimeoutId = null;
    }
    set({
      room: null,
      playerId: null,
      playerName: '',
      players: [],
      isHost: false,
      myChain: [],
      myAttempts: [],
      timeLeft: TOTAL_TIME,
      gameStartedAt: null,
      rematchStatus: 'none',
      localGameEnded: false,
      winner: null,
      error: null,
      isValidating: false,
    });
  },
}));
