import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, WORD_VALIDATION_PROMPT } from '@/lib/openai';
import { createServiceClient } from '@/lib/supabase/server';
import { singularize } from '@/lib/singularize';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { type RejectionReason } from '@/lib/constants';
import { debug } from '@/lib/debug';

// Minimal schema for faster response (no reasoning = fewer output tokens)
const WordAssociationResult = z.object({
  r: z.boolean(), // related
  x: z.enum(['n', 'a', 'm', 'p', 's', 'i']).nullable(), // rejection: not_related, abstract, multi_hop, proper_noun, misspelled, invalid
  w: z.string().nullable().optional(), // normalized word2 (singular form) - only present if normalization was needed
});

// Map short codes back to full rejection reasons
const rejectionMap: Record<string, RejectionReason> = {
  n: 'not_related',
  a: 'too_abstract',
  m: 'multi_hop',
  p: 'proper_noun',
  s: 'misspelled',
  i: 'invalid_word',
};

export async function POST(request: NextRequest) {
  try {
    const { word1, word2 } = await request.json();

    if (!word1 || !word2) {
      return NextResponse.json(
        { error: 'Both words are required' },
        { status: 400 }
      );
    }

    // word1 should already be normalized (from previous validation)
    // word2 is the new word - only do basic cleanup, let AI handle singularization
    const w1 = word1.toLowerCase().trim();
    const w2 = word2.toLowerCase().trim();

    // Basic validation
    if (w1 === w2) {
      return NextResponse.json({ isValid: false, cached: false, reason: 'same_as_previous' });
    }

    if (!/^[a-z]+$/.test(w1) || !/^[a-z]+$/.test(w2)) {
      return NextResponse.json({ isValid: false, cached: false, reason: 'invalid_word' });
    }

    // Reject very short words (likely abbreviations) and very long words
    if (w1.length < 2 || w2.length < 2 || w1.length > 20 || w2.length > 20) {
      return NextResponse.json({ isValid: false, cached: false, reason: 'invalid_word' });
    }

    const supabase = createServiceClient();

    // Race cache check against OpenAI call - whichever finishes first wins
    const abortController = new AbortController();
    const openai = getOpenAI();

    // Check cache for both the original word2 and a potential singular form
    // We use client-side singularize as a hint for cache lookup only
    // NOTE: We also check reversed order for validity, but we need to track which direction matched
    const w2Singular = singularize(w2);
    const cachePromise = supabase
      .from('word_associations')
      .select('is_valid, rejection_reason, word1, word2')
      .or(
        `and(word1.eq.${w1},word2.eq.${w2}),and(word1.eq.${w2},word2.eq.${w1}),` +
        `and(word1.eq.${w1},word2.eq.${w2Singular}),and(word1.eq.${w2Singular},word2.eq.${w1})`
      )
      .limit(1)
      .maybeSingle()
      .then((result: { data: { is_valid: boolean; rejection_reason: RejectionReason | null; word1: string; word2: string } | null }) => ({
        type: 'cache' as const,
        data: result.data
      }));

    const openaiPromise = openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: WORD_VALIDATION_PROMPT },
        { role: 'user', content: `${w1},${w2}` },
      ],
      response_format: zodResponseFormat(WordAssociationResult, 'word_association'),
      max_completion_tokens: 30, // Slightly more tokens to accommodate normalized word
      temperature: 0,
    }, {
      signal: abortController.signal,
    }).then(response => ({ type: 'openai' as const, data: response }))
      .catch(err => {
        // If aborted, return null - we'll handle this in the race result
        if (err.name === 'AbortError') return null;
        throw err;
      });

    // Race: whoever finishes first wins
    const result = await Promise.race([cachePromise, openaiPromise]);

    if (result && result.type === 'cache' && result.data !== null) {
      abortController.abort(); // Cancel OpenAI request
      // Only return normalizedWord if the cache hit was in the forward direction (word1=w1)
      // and word2 is a singular form of our input w2 (not the reversed lookup)
      let normalizedWord: string | undefined;
      if (result.data.word1 === w1 && result.data.word2 !== w2) {
        // Forward direction cache hit with a different word2 (e.g., singular form)
        normalizedWord = result.data.word2;
      }
      return NextResponse.json({
        isValid: result.data.is_valid,
        cached: true,
        reason: result.data.rejection_reason || (result.data.is_valid ? undefined : 'not_related'),
        normalizedWord,
      });
    }

    // Either cache was null or OpenAI finished first - ensure we have OpenAI response
    const response = (result && result.type === 'openai') ? result.data : await openaiPromise.then(r => r?.data);

    if (!response) {
      // OpenAI failed - reject the word with a user-friendly message rather than 500 error
      debug.api.error('OpenAI response was null or aborted');
      return NextResponse.json({
        isValid: false,
        cached: false,
        reason: 'not_related',
        error: 'Could not validate word, please try again',
      });
    }

    const content = response.choices[0]?.message?.content;
    let isValid = false;
    let rejectionReason: RejectionReason | undefined;
    let normalizedWord: string | undefined;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        isValid = parsed.r === true;
        rejectionReason = parsed.x ? rejectionMap[parsed.x] : undefined;
        // AI returns normalized word in 'w' field if it needed to singularize
        if (parsed.w && parsed.w !== w2) {
          normalizedWord = parsed.w;
        }
      } catch {
        isValid = false;
        rejectionReason = 'invalid_word';
      }
    }

    // Determine the final word to cache (use normalized if provided)
    const finalWord2 = normalizedWord || w2;

    // Cache the result - cache both original and normalized forms if different
    const cacheInserts = [{ word1: w1, word2: finalWord2, is_valid: isValid, rejection_reason: rejectionReason }];
    if (normalizedWord && normalizedWord !== w2) {
      // Also cache the original plural form pointing to the same result
      cacheInserts.push({ word1: w1, word2: w2, is_valid: isValid, rejection_reason: rejectionReason });
    }

    // Don't await to avoid blocking response
    supabase.from('word_associations').insert(cacheInserts).then(() => {
      // Cached successfully
    }).catch((err: unknown) => {
      debug.api.error('Failed to cache word association:', err);
    });

    return NextResponse.json({
      isValid,
      cached: false,
      reason: isValid ? undefined : (rejectionReason || 'not_related'),
      normalizedWord,
    });
  } catch (error) {
    debug.api.error('Word validation error:', error);
    // Return a rejection instead of 500 error for better UX
    return NextResponse.json({
      isValid: false,
      cached: false,
      reason: 'not_related',
      error: 'Validation failed, please try again',
    });
  }
}
