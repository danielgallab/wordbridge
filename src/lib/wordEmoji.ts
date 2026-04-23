import * as emoji from 'node-emoji';

/**
 * Get an emoji for a word if one exists
 * @param word - The word to look up (case insensitive)
 * @returns The emoji string or empty string if no mapping exists
 */
export function getWordEmoji(word: string): string {
  const normalized = word.toLowerCase().trim();

  // Try exact match first
  const exact = emoji.get(normalized);
  if (exact && !exact.startsWith(':')) {
    return exact;
  }

  // Try search as fallback
  const results = emoji.search(normalized);
  if (results.length > 0 && results[0].name === normalized) {
    return results[0].emoji;
  }

  return '';
}
