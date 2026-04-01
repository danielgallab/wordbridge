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
  isGameOver: boolean;
  winner: 'me' | 'opponent' | 'draw' | null;
  error: string | null;
  isValidating: boolean;

  // Rematch state
  wantsRematch: boolean;
  opponentWantsRematch: boolean;
  rematchInProgress: boolean; // Flag to ignore stale updates during rematch transition

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
  setRematchState: (me: boolean, opponent: boolean) => void;
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
  isGameOver: false,
  winner: null,
  error: null,
  isValidating: false,
  wantsRematch: false,
  opponentWantsRematch: false,
  rematchInProgress: false,

  setRoom: (room) => set({ room }),

  setPlayer: (playerId, playerName) => set({ playerId, playerName }),

  setPlayers: (players) => {
    const state = get();
    const me = players.find(p => p.id === state.playerId);
    const opponent = players.find(p => p.id !== state.playerId);

    // If rematch is in progress, clear the rematchInProgress flag once we receive
    // players with is_winner: false (fresh state from the server)
    const allPlayersReset = players.every(p => !p.is_winner);
    const shouldClearRematchFlag = state.rematchInProgress && allPlayersReset;

    set({
      players,
      myChain: me?.chain || [],
      opponentChainLength: opponent?.chain?.length || 1,
      // Only reveal full opponent chain when game is over
      opponentChain: state.isGameOver ? (opponent?.chain || []) : [],
      // Clear rematch flag if we received fresh player state
      ...(shouldClearRematchFlag ? { rematchInProgress: false } : {}),
    });
  },

  updatePlayer: (playerId, updates) => {
    const state = get();
    const newPlayers = state.players.map(p =>
      p.id === playerId ? { ...p, ...updates } : p
    );

    const me = newPlayers.find(p => p.id === state.playerId);
    const opponent = newPlayers.find(p => p.id !== state.playerId);

    set({
      players: newPlayers,
      myChain: me?.chain || state.myChain,
      opponentChainLength: opponent?.chain?.length || state.opponentChainLength,
      // Only reveal full opponent chain when game is over
      opponentChain: state.isGameOver ? (opponent?.chain || state.opponentChain) : [],
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
      isGameOver: gameFinished,
      winner: null,
      error: null,
      isValidating: false,
    });
  },

  submitWord: async (word) => {
    const state = get();
    if (!state.room || !state.playerId || state.isGameOver || state.isValidating) {
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
    if (state.isGameOver) return state.timeLeft;

    const newTime = Math.max(0, state.timeLeft - 1);
    set({ timeLeft: newTime });

    // Time's up - it's a draw (no winner unless someone reached the target)
    if (newTime === 0 && !state.isGameOver) {
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

    // Reveal full opponent chain now that game is over
    const opponent = state.players.find(p => p.id !== state.playerId);
    set({
      isGameOver: true,
      winner,
      opponentChain: opponent?.chain || [],
    });
  },

  setError: (error) => set({ error }),

  requestRematch: async () => {
    const state = get();
    if (!state.room || !state.playerId) return;

    set({ wantsRematch: true });

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

      if (data.rematchStarted) {
        // The room will be updated via realtime, but we can reset local state
        get().resetForRematch(data.startWord);
      }
    } catch {
      set({ error: 'Failed to request rematch', wantsRematch: false });
      setTimeout(() => set({ error: null }), 2500);
    }
  },

  setRematchState: (me, opponent) => {
    set({ wantsRematch: me, opponentWantsRematch: opponent });
  },

  resetForRematch: (startWord) => {
    const state = get();
    // Set rematchInProgress to true temporarily to ignore stale is_winner updates
    set({
      rematchInProgress: true,
      myChain: [startWord],
      opponentChainLength: 1,
      opponentChain: [],
      timeLeft: state.room?.time_limit || TOTAL_TIME,
      isGameOver: false,
      winner: null,
      error: null,
      isValidating: false,
      wantsRematch: false,
      opponentWantsRematch: false,
    });
    // Clear the flag after a short delay to allow realtime updates to settle
    setTimeout(() => {
      set({ rematchInProgress: false });
    }, 500);
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
    isGameOver: false,
    winner: null,
    error: null,
    isValidating: false,
    wantsRematch: false,
    opponentWantsRematch: false,
    rematchInProgress: false,
  }),
}));
