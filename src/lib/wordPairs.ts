import { SupabaseClient } from '@supabase/supabase-js';
import { getOpenAI, WORD_PAIR_GENERATION_PROMPT } from '@/lib/openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const WordPairResult = z.object({
  start_word: z.string(),
  target_word: z.string(),
  reasoning: z.string(),
});

export type Difficulty = 'easy' | 'medium' | 'hard';

export async function getRecentlyUsedWords(supabase: SupabaseClient): Promise<string[]> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: recentRooms } = await supabase
    .from('rooms')
    .select('start_word, target_word')
    .gte('created_at', threeDaysAgo.toISOString())
    .limit(50);

  if (!recentRooms) return [];

  const words = new Set<string>();
  for (const room of recentRooms) {
    words.add(room.start_word);
    words.add(room.target_word);
  }
  return Array.from(words);
}

async function getCachedWordPair(supabase: SupabaseClient, difficulty: Difficulty, recentWords: string[]): Promise<{ start_word: string; target_word: string } | null> {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  // Build query to find a cached pair that hasn't been used recently
  const query = supabase
    .from('word_pairs')
    .select('id, start_word, target_word, used_count')
    .eq('difficulty', difficulty)
    .or(`last_used_at.is.null,last_used_at.lt.${oneDayAgo.toISOString()}`)
    .order('used_count', { ascending: true })
    .order('last_used_at', { ascending: true, nullsFirst: true })
    .limit(10);

  const { data: candidates } = await query;

  if (!candidates || candidates.length === 0) return null;

  // Filter out pairs that contain recently used words
  const recentWordsSet = new Set(recentWords);
  const validPair = candidates.find(
    pair => !recentWordsSet.has(pair.start_word) && !recentWordsSet.has(pair.target_word)
  );

  if (!validPair) return null;

  // Update usage stats
  await supabase
    .from('word_pairs')
    .update({
      used_count: (validPair.used_count || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', validPair.id);

  console.log(`[Word Pair Cache Hit] ${validPair.start_word} → ${validPair.target_word} (${difficulty})`);

  return { start_word: validPair.start_word, target_word: validPair.target_word };
}

async function storeWordPair(supabase: SupabaseClient, startWord: string, targetWord: string, difficulty: Difficulty, reasoning: string): Promise<void> {
  const { error } = await supabase
    .from('word_pairs')
    .upsert({
      start_word: startWord,
      target_word: targetWord,
      difficulty,
      reasoning,
      used_count: 1,
      last_used_at: new Date().toISOString(),
    }, {
      onConflict: 'start_word,target_word',
    });

  if (error) {
    console.error('Failed to cache word pair:', error);
  } else {
    console.log(`[Word Pair Cached] ${startWord} → ${targetWord} (${difficulty})`);
  }
}

async function generateWordPairFromAI(supabase: SupabaseClient, difficulty: Difficulty, recentWords: string[]) {
  const openai = getOpenAI();

  let avoidClause = '';
  if (recentWords.length > 0) {
    avoidClause = ` Do NOT use any of these recently used words: ${recentWords.join(', ')}.`;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-mini',
    temperature: 1.2,
    seed: Math.floor(Math.random() * 1000000),
    messages: [
      { role: 'system', content: WORD_PAIR_GENERATION_PROMPT },
      { role: 'user', content: `Generate a ${difficulty} difficulty word pair.${avoidClause}` },
    ],
    response_format: zodResponseFormat(WordPairResult, 'word_pair'),
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate word pair');
  }

  const parsed = JSON.parse(content);
  const startWord = parsed.start_word.toLowerCase().trim();
  const targetWord = parsed.target_word.toLowerCase().trim();

  console.log(`[Word Pair Generated] ${startWord} → ${targetWord} (${difficulty}) | Reasoning: ${parsed.reasoning}`);

  // Cache the newly generated pair
  await storeWordPair(supabase, startWord, targetWord, difficulty, parsed.reasoning);

  return { start_word: startWord, target_word: targetWord };
}

/**
 * Get a word pair for a game - checks cache first, generates new one if needed.
 */
export async function generateWordPair(supabase: SupabaseClient, difficulty: Difficulty = 'medium') {
  const recentWords = await getRecentlyUsedWords(supabase);

  // Try to get a cached word pair first
  const cachedPair = await getCachedWordPair(supabase, difficulty, recentWords);
  if (cachedPair) {
    return cachedPair;
  }

  // No suitable cached pair found, generate a new one
  return generateWordPairFromAI(supabase, difficulty, recentWords);
}
