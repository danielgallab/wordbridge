import { REJECTION_MESSAGES, type RejectionReason } from '@/lib/constants';

/**
 * Normalize a word for submission (trim + lowercase).
 */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * Check if a word is already in the chain. Returns an error message if so, null otherwise.
 */
export function checkDuplicate(word: string, chain: string[]): string | null {
  const normalized = normalizeWord(word);
  if (chain.includes(normalized)) {
    return `"${word}" is already in your chain`;
  }
  return null;
}

/**
 * Parse an API error response into a user-friendly error message.
 * Handles rejection reasons from the validate-word API.
 */
export function parseSubmissionError(data: { error?: string; reason?: string }): string {
  const reason = data.reason as RejectionReason | undefined;
  if (reason && REJECTION_MESSAGES[reason]) {
    return REJECTION_MESSAGES[reason];
  }
  return data.error || 'Failed to submit word';
}

/**
 * Sets an error message on a Zustand store and automatically clears it after a delay.
 * Returns a cleanup function to cancel the pending clear (useful if component unmounts).
 */
export function flashError(
  set: (partial: { error: string | null }) => void,
  message: string,
  durationMs = 2500,
): () => void {
  set({ error: message });
  const timeout = setTimeout(() => set({ error: null }), durationMs);
  return () => clearTimeout(timeout);
}
