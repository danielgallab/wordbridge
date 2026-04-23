import { SupabaseClient } from '@supabase/supabase-js';
import { WORD_BANK, getWordBankSize } from './wordBank';
import { getOpenAI } from '@/lib/openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import type { Difficulty } from '@/lib/constants';

export type { Difficulty };

// Schema for AI-generated words to add to the bank
const NewWordsResult = z.object({
  words: z.array(z.string()),
});

// In-memory cache of AI-added words (loaded from DB on first request)
let aiWordsCache: Set<string> | null = null;

/**
 * Load AI-added words from the database
 */
async function loadAIWordsFromDB(supabase: SupabaseClient): Promise<Set<string>> {
  if (aiWordsCache !== null) {
    return aiWordsCache;
  }

  const { data: words } = await supabase
    .from('word_bank')
    .select('word')
    .eq('source', 'ai');

  aiWordsCache = new Set<string>();
  if (words) {
    for (const row of words) {
      aiWordsCache.add(row.word);
    }
  }

  console.log(`[Word Bank] Loaded ${aiWordsCache.size} AI-added words from database`);
  return aiWordsCache;
}

/**
 * Save a new AI-generated word to the database
 */
async function saveWordToDB(supabase: SupabaseClient, word: string): Promise<boolean> {
  const { error } = await supabase
    .from('word_bank')
    .insert({ word: word.toLowerCase(), source: 'ai' });

  if (error) {
    // Likely a duplicate, ignore
    if (error.code === '23505') return false;
    console.error('[Word Bank] Failed to save word:', error);
    return false;
  }

  // Update the cache
  if (aiWordsCache) {
    aiWordsCache.add(word.toLowerCase());
  }

  return true;
}

/**
 * Get the full word pool (static bank + AI-added words from DB)
 */
async function getWordPool(supabase: SupabaseClient): Promise<string[]> {
  const aiWords = await loadAIWordsFromDB(supabase);
  return [...WORD_BANK, ...Array.from(aiWords)];
}

/**
 * Get recently used word pairs from the database (last 24 hours)
 */
async function getRecentlyUsedPairs(supabase: SupabaseClient): Promise<Set<string>> {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { data: recentPairs } = await supabase
    .from('word_pairs')
    .select('start_word, target_word')
    .gte('last_used_at', oneDayAgo.toISOString())
    .limit(200);

  const pairSet = new Set<string>();
  if (recentPairs) {
    for (const pair of recentPairs) {
      // Store both directions to avoid "cat→dog" and "dog→cat" in same day
      pairSet.add(`${pair.start_word}:${pair.target_word}`);
      pairSet.add(`${pair.target_word}:${pair.start_word}`);
    }
  }
  return pairSet;
}

/**
 * Record a used pair in the database
 */
async function recordUsedPair(
  supabase: SupabaseClient,
  startWord: string,
  targetWord: string,
  difficulty: Difficulty
): Promise<void> {
  // Try to update existing pair
  const { data: existing } = await supabase
    .from('word_pairs')
    .select('id, used_count')
    .eq('start_word', startWord)
    .eq('target_word', targetWord)
    .single();

  if (existing) {
    await supabase
      .from('word_pairs')
      .update({
        used_count: (existing.used_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Insert new pair record
    await supabase.from('word_pairs').insert({
      start_word: startWord,
      target_word: targetWord,
      difficulty,
      used_count: 1,
      last_used_at: new Date().toISOString(),
    });
  }
}

/**
 * Select two random words from the pool that haven't been used as a pair recently
 */
function selectRandomPair(
  wordPool: string[],
  recentPairs: Set<string>,
  maxAttempts: number = 50
): { startWord: string; targetWord: string } | null {
  for (let i = 0; i < maxAttempts; i++) {
    const startIndex = Math.floor(Math.random() * wordPool.length);
    let targetIndex = Math.floor(Math.random() * wordPool.length);

    // Ensure different words
    while (targetIndex === startIndex) {
      targetIndex = Math.floor(Math.random() * wordPool.length);
    }

    const startWord = wordPool[startIndex];
    const targetWord = wordPool[targetIndex];
    const pairKey = `${startWord}:${targetWord}`;

    // Check if this pair was used recently
    if (!recentPairs.has(pairKey)) {
      return { startWord, targetWord };
    }
  }

  // If we couldn't find an unused pair after maxAttempts, just return any pair
  // This is a fallback and should rarely happen with a large word bank
  const startIndex = Math.floor(Math.random() * wordPool.length);
  let targetIndex = Math.floor(Math.random() * wordPool.length);
  while (targetIndex === startIndex) {
    targetIndex = Math.floor(Math.random() * wordPool.length);
  }

  return {
    startWord: wordPool[startIndex],
    targetWord: wordPool[targetIndex],
  };
}

/**
 * Use AI to generate new words to add to the bank
 * Called periodically to expand variety
 */
async function expandWordBank(
  supabase: SupabaseClient,
  existingWords: string[]
): Promise<number> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    reasoning_effort: 'minimal',
    messages: [
      {
        role: 'system',
        content: `You are a word generator for a word association game. Generate 20 new common English nouns that would be good for word chain games.

RULES:
1. Only common, single-word English nouns
2. No proper nouns, no obscure words
3. Words should have many possible associations
4. Avoid words that are too similar to each other
5. Mix different categories: nature, objects, food, animals, places, etc.

Return ONLY words that are NOT in this existing list: ${existingWords.slice(0, 200).join(', ')}`,
      },
      {
        role: 'user',
        content: 'Generate 20 new words for the word bank.',
      },
    ],
    response_format: zodResponseFormat(NewWordsResult, 'new_words'),
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return 0;

  const parsed = JSON.parse(content);
  const newWords: string[] = parsed.words.map((w: string) => w.toLowerCase().trim());

  // Save each word to the database
  let addedCount = 0;
  for (const word of newWords) {
    const saved = await saveWordToDB(supabase, word);
    if (saved) addedCount++;
  }

  return addedCount;
}

/**
 * Get a word pair for a game.
 * Uses the static word bank with random selection.
 * Tracks recently used pairs to avoid repetition.
 */
export async function generateWordPair(
  supabase: SupabaseClient,
  difficulty: Difficulty = 'medium'
) {
  // Get recently used pairs to avoid
  const recentPairs = await getRecentlyUsedPairs(supabase);

  // Get the full word pool (static + AI words from DB)
  let wordPool = await getWordPool(supabase);

  // If we've used a lot of pairs recently, expand the bank with AI
  // This happens when recentPairs is > 30% of possible combinations
  const possiblePairs = wordPool.length * (wordPool.length - 1);
  const aiWordsCount = aiWordsCache?.size || 0;

  if (recentPairs.size > possiblePairs * 0.3 && aiWordsCount < 500) {
    console.log('[Word Bank] Expanding word bank with AI...');
    try {
      const addedCount = await expandWordBank(supabase, wordPool);
      if (addedCount > 0) {
        wordPool = await getWordPool(supabase);
        console.log(`[Word Bank] Added ${addedCount} new words. Total pool: ${wordPool.length}`);
      }
    } catch (error) {
      console.error('[Word Bank] Failed to expand word bank:', error);
    }
  }

  // Select a random pair that hasn't been used recently
  const pair = selectRandomPair(wordPool, recentPairs);

  if (!pair) {
    // Absolute fallback - should never happen
    throw new Error('Failed to select word pair');
  }

  // Record the usage
  await recordUsedPair(supabase, pair.startWord, pair.targetWord, difficulty);

  console.log(`[Word Pair] ${pair.startWord} → ${pair.targetWord} (${difficulty}) [Pool: ${wordPool.length} words]`);

  return {
    start_word: pair.startWord,
    target_word: pair.targetWord,
  };
}

/**
 * Get stats about the word bank
 */
export async function getWordBankStats(supabase: SupabaseClient) {
  const aiWords = await loadAIWordsFromDB(supabase);
  return {
    staticWords: getWordBankSize(),
    aiAddedWords: aiWords.size,
    totalWords: getWordBankSize() + aiWords.size,
  };
}
