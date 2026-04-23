import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getOpenAI, HINT_GENERATION_PROMPT } from '@/lib/openai';
import { validateWordPair } from '@/lib/validate-word';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { debug } from '@/lib/debug';

// Schema for hint word generation
const HintWordsResult = z.object({
  words: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const { currentWord, targetWord, usedWords = [] } = await request.json();

    if (!currentWord || !targetWord) {
      return NextResponse.json(
        { error: 'currentWord and targetWord are required' },
        { status: 400 }
      );
    }

    const word = currentWord.toLowerCase().trim();
    const target = targetWord.toLowerCase().trim();
    const used = new Set(usedWords.map((w: string) => w.toLowerCase().trim()));

    const supabase = createServiceClient();

    // Step 1: Query cache for known valid pairs
    const { data: cachedPairs } = await supabase
      .from('word_associations')
      .select('word2')
      .eq('word1', word)
      .eq('is_valid', true)
      .limit(20);

    // Filter out used words and shuffle
    let hintWords: string[] = [];
    if (cachedPairs && cachedPairs.length > 0) {
      hintWords = cachedPairs
        .map((p: { word2: string }) => p.word2)
        .filter((w: string) => !used.has(w) && w !== target) // Don't hint the target word directly
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
    }

    // Step 2: If we have enough cached hints, return them
    if (hintWords.length >= 3) {
      return NextResponse.json({ words: hintWords });
    }

    // Step 3: Need more hints - generate with OpenAI and validate
    const openai = getOpenAI();
    
    const candidateResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: HINT_GENERATION_PROMPT },
        {
          role: 'user',
          content: `Current word: ${word}\nTarget word: ${target}\nAlready used: ${Array.from(used).join(', ') || 'none'}\nAlready suggested: ${hintWords.join(', ') || 'none'}`
        },
      ],
      response_format: zodResponseFormat(HintWordsResult, 'hints'),
      max_completion_tokens: 100,
    });

    const candidateContent = candidateResponse.choices[0]?.message?.content;
    let candidates: string[] = [];

    if (candidateContent) {
      try {
        const parsed = JSON.parse(candidateContent);
        candidates = parsed.words || [];
      } catch {
        debug.api.error('Failed to parse hint candidates');
      }
    }    

    // Filter candidates
    candidates = candidates
      .map(w => w.toLowerCase().trim())
      .filter(w =>
        w &&
        !used.has(w) &&
        w !== target &&
        w !== word &&
        !hintWords.includes(w) &&
        /^[a-z]+$/.test(w)
      );

    // Step 4: Validate each candidate (in parallel, limit to 8)
    const validationPromises = candidates.slice(0, 8).map(async (candidate) => {
      const result = await validateWordPair(word, candidate);
      return { word: candidate, isValid: result.isValid };
    });

    const validationResults = await Promise.all(validationPromises);

    // Add valid candidates to hint words
    const validCandidates = validationResults
      .filter(r => r.isValid)
      .map(r => r.word);

    // Cache new valid pairs (don't await)
    if (validCandidates.length > 0) {
      const inserts = validCandidates.map(w => ({
        word1: word,
        word2: w,
        is_valid: true,
        rejection_reason: null,
      }));
      supabase.from('word_associations').insert(inserts).then(() => {
        debug.api.log('Cached hint words:', validCandidates);
      }).catch((err: unknown) => {
        debug.api.error('Failed to cache hint words:', err);
      });
    }

    // Combine cached + newly validated
    hintWords = [...hintWords, ...validCandidates].slice(0, 5);

    // Shuffle final result
    hintWords.sort(() => Math.random() - 0.5);

    return NextResponse.json({ words: hintWords });
  } catch (error) {
    debug.api.error('Hint generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate hints', words: [] },
      { status: 500 }
    );
  }
}
