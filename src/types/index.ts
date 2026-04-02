export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_wins: number;
  total_games: number;
  best_chain: number | null;
  elo_rating: number;
  created_at: string;
}

export interface WordAssociation {
  id: number;
  word1: string;
  word2: string;
  is_valid: boolean;
  confidence: number | null;
  validated_at: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Room {
  id: string;
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  start_word: string;
  target_word: string;
  time_limit: number;
  difficulty: Difficulty;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  chain: string[];
  finished_at: string | null;
  is_winner: boolean;
  wants_rematch: boolean;
}

export interface GameState {
  roomId: string | null;
  playerChain: string[];
  opponentChain: string[];
  startWord: string;
  targetWord: string;
  timeLeft: number;
  isGameOver: boolean;
  winner: 'player' | 'opponent' | 'draw' | null;
  error: string | null;
  isValidating: boolean;
}

export interface DailyChallenge {
  id: number;
  date: string;
  start_word: string;
  target_word: string;
}

export type ValidationResult = {
  isValid: boolean;
  cached: boolean;
};
