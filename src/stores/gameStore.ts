import { create } from 'zustand';

const TOTAL_TIME = 90;

interface Player {
  id: string;
  player_name: string;
  chain: string[];
  is_winner: boolean;
  wants_rematch?: boolean;
}

interface Room {
  id: string;
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  start_word: string;
  target_word: string;
  time_limit: number;
  winner_id: string | null;
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

  // Game state
  myChain: string[];
  opponentChainLength: number; // Only track length during play
  opponentChain: string[]; // Full chain revealed at game end
  timeLeft: number;
  rematchStatus: RematchStatus;
  localGameEnded: boolean; // Tracks if we've locally ended the game (before server confirms)
  winner: 'me' | 'opponent' | 'draw' | null;
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
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  room: null,
  playerId: null,
  playerName: '',
  players: [],
  myChain: [],
  opponentChainLength: 1,
  opponentChain: [],
  timeLeft: TOTAL_TIME,
  rematchStatus: 'none',
  localGameEnded: false,
  winner: null,
  error: null,
  isValidating: false,

  setRoom: (room) => {
    const state = get();
    const prevRoom = state.room;
    console.log('[gameStore.setRoom]', {
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
    const opponent = players.find(p => p.id !== state.playerId);

    // During rematch transition, don't update chains from potentially stale data
    const shouldUpdateChains = state.rematchStatus !== 'starting';
    const isGameOver = state.room?.status === 'finished';

    console.log('[gameStore.setPlayers]', {
      rematchStatus: state.rematchStatus,
      roomStatus: state.room?.status,
      shouldUpdateChains,
      meIsWinner: me?.is_winner,
      opponentIsWinner: opponent?.is_winner,
      meChainLength: me?.chain?.length,
      opponentChainLength: opponent?.chain?.length,
      meWantsRematch: me?.wants_rematch,
      opponentWantsRematch: opponent?.wants_rematch,
    });

    set({
      players,
      myChain: shouldUpdateChains ? (me?.chain || []) : state.myChain,
      opponentChainLength: shouldUpdateChains ? (opponent?.chain?.length || 1) : state.opponentChainLength,
      // Only reveal full opponent chain when game is over
      opponentChain: isGameOver ? (opponent?.chain || []) : [],
    });
  },

  updatePlayer: (playerId, updates) => {
    const state = get();
    const newPlayers = state.players.map(p =>
      p.id === playerId ? { ...p, ...updates } : p
    );

    const me = newPlayers.find(p => p.id === state.playerId);
    const opponent = newPlayers.find(p => p.id !== state.playerId);

    // During rematch transition, don't update chains from potentially stale data
    const shouldUpdateChains = state.rematchStatus !== 'starting';
    const isGameOver = state.room?.status === 'finished';

    console.log('[gameStore.updatePlayer]', {
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
      opponentChainLength: shouldUpdateChains ? (opponent?.chain?.length || state.opponentChainLength) : state.opponentChainLength,
      // Only reveal full opponent chain when game is over
      opponentChain: isGameOver ? (opponent?.chain || state.opponentChain) : [],
    });
  },

  initGame: (room, playerId, players) => {
    const me = players.find(p => p.id === playerId);
    const opponent = players.find(p => p.id !== playerId);
    const gameFinished = room.status === 'finished';

    set({
      room,
      playerId,
      players,
      myChain: me?.chain || [room.start_word],
      opponentChainLength: opponent?.chain?.length || 1,
      // Only reveal full opponent chain if game is already finished
      opponentChain: gameFinished ? (opponent?.chain || [room.start_word]) : [],
      timeLeft: room.time_limit || TOTAL_TIME,
      rematchStatus: 'none',
      localGameEnded: gameFinished,
      winner: null,
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
        // Rollback optimistic update on error
        set({
          error: data.error || 'Failed to submit word',
          isValidating: false,
          myChain: previousChain  // Restore previous chain
        });
        setTimeout(() => set({ error: null }), 2500);
        return false;
      }

      // Update with server-confirmed chain (should match optimistic)
      set({
        myChain: data.chain,
        isValidating: false,
      });

      if (data.isWinner) {
        get().endGame(state.playerId);
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

    const newTime = Math.max(0, state.timeLeft - 1);
    set({ timeLeft: newTime });

    // Time's up - it's a draw (no winner unless someone reached the target)
    if (newTime === 0 && !state.localGameEnded) {
      get().endGame(null);
    }

    return newTime;
  },

  endGame: (winnerId) => {
    const state = get();
    let winner: 'me' | 'opponent' | 'draw' | null = null;

    if (winnerId === null) {
      winner = 'draw';
    } else if (winnerId === state.playerId) {
      winner = 'me';
    } else {
      winner = 'opponent';
    }

    console.log('[gameStore.endGame] CALLED', {
      winnerId,
      computedWinner: winner,
      rematchStatus: state.rematchStatus,
      roomStatus: state.room?.status,
      myChainLength: state.myChain.length,
      startWord: state.room?.start_word,
      stack: new Error().stack,
    });

    // Reveal full opponent chain now that game is over
    const opponent = state.players.find(p => p.id !== state.playerId);
    set({
      localGameEnded: true,
      winner,
      opponentChain: opponent?.chain || [],
    });

    // If this is a draw (time ran out), notify the server to update room status
    // This ensures room.status becomes 'finished' for rematch detection
    if (winnerId === null && state.room?.id) {
      fetch('/api/rooms/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: state.room.id }),
      }).catch(err => console.error('[gameStore.endGame] Failed to notify server:', err));
    }
  },

  setError: (error) => set({ error }),

  requestRematch: async () => {
    const state = get();
    if (!state.room || !state.playerId) return;

    console.log('[gameStore.requestRematch] Starting rematch request', {
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
      console.log('[gameStore.requestRematch] API response', data);

      if (data.rematchStarted) {
        // Reset local state immediately for the player who triggered rematch
        // The other player will get reset via realtime subscription
        console.log('[gameStore.requestRematch] Calling resetForRematch with startWord:', data.startWord);
        get().resetForRematch(data.startWord);
      }
    } catch (err) {
      console.error('[gameStore.requestRematch] Error:', err);
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
    console.log('[gameStore.resetForRematch] Called', {
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
      console.log('[gameStore.resetForRematch] SKIPPING - already reset for this word');
      return;
    }

    console.log('[gameStore.resetForRematch] Resetting state for new game');
    // Set 'starting' to temporarily ignore stale is_winner updates
    set({
      rematchStatus: 'starting',
      localGameEnded: false,
      myChain: [startWord],
      opponentChainLength: 1,
      opponentChain: [],
      timeLeft: state.room?.time_limit || TOTAL_TIME,
      winner: null,
      error: null,
      isValidating: false,
    });
    // Clear rematch status after a delay to allow realtime updates to settle
    setTimeout(() => {
      console.log('[gameStore.resetForRematch] Clearing rematch status');
      set({ rematchStatus: 'none' });
    }, 1000);
  },

  reset: () => set({
    room: null,
    playerId: null,
    playerName: '',
    players: [],
    myChain: [],
    opponentChainLength: 1,
    opponentChain: [],
    timeLeft: TOTAL_TIME,
    rematchStatus: 'none',
    localGameEnded: false,
    winner: null,
    error: null,
    isValidating: false,
  }),
}));
