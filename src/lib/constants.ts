// Shared constants for the WordBridge application

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

// Game timing
export const DEFAULT_TIME_LIMIT = 90;
