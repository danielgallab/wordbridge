// Shared constants for the WordBridge application

// --- Rejection reasons ---

export type RejectionReason =
  | 'not_related'
  | 'already_used'
  | 'invalid_word'
  | 'same_as_previous'
  | 'too_abstract'
  | 'proper_noun'
  | 'multi_hop'
  | 'misspelled';

export const REJECTION_MESSAGES: Record<RejectionReason, string> = {
  not_related: 'Not related enough — try a more direct connection',
  already_used: 'Already used — each word can only appear once',
  invalid_word: 'Not a valid word — try a common English word',
  same_as_previous: 'Same as previous — use a different word',
  too_abstract: 'Too abstract — try something more concrete',
  proper_noun: 'No proper nouns — use common words only',
  multi_hop: 'Too far apart — add a word in between',
  misspelled: 'Check spelling — did you mean something else?',
};

// --- Room status ---

export const ROOM_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished',
} as const;

export type RoomStatus = (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];

// --- Difficulty ---

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

// --- Game mode ---

export const GAME_MODES = ['speed', 'shortest'] as const;
export type GameMode = (typeof GAME_MODES)[number];

// --- Game timing ---

export const DEFAULT_TIME_LIMIT = 90;
export const DEFAULT_SHORTEST_TIME_LIMIT = 60;
