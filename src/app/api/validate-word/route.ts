import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, WORD_VALIDATION_PROMPT } from '@/lib/openai';
import { createServiceClient } from '@/lib/supabase/server';
import { singularize } from '@/lib/singularize';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

export type RejectionReason =
  | 'not_related'
  | 'already_used'
  | 'invalid_word'
  | 'same_as_previous'
  | 'too_abstract'
  | 'proper_noun'
  | 'multi_hop'
  | 'misspelled';

// Minimal schema for faster response (no reasoning = fewer output tokens)
const WordAssociationResult = z.object({
  r: z.boolean(), // related
  x: z.enum(['n', 'a', 'm', 'p', 's', 'i']).nullable(), // rejection: not_related, abstract, multi_hop, proper_noun, misspelled, invalid
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

    // Singularize words to normalize plurals (e.g., "hands" -> "hand")
    const w1 = singularize(word1.toLowerCase().trim());
    const w2 = singularize(word2.toLowerCase().trim());

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

    const cachePromise = supabase
      .from('word_associations')
      .select('is_valid, rejection_reason')
      .or(`and(word1.eq.${w1},word2.eq.${w2}),and(word1.eq.${w2},word2.eq.${w1})`)
      .limit(1)
      .single()
      .then((result: { data: { is_valid: boolean; rejection_reason: RejectionReason | null } | null }) => ({
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
      max_completion_tokens: 20,
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
      return NextResponse.json({
        isValid: result.data.is_valid,
        cached: true,
        reason: result.data.rejection_reason || (result.data.is_valid ? undefined : 'not_related'),
      });
    }

    // Either cache was null or OpenAI finished first - ensure we have OpenAI response
    const response = (result && result.type === 'openai') ? result.data : await openaiPromise.then(r => r?.data);

    if (!response) {
      throw new Error('Failed to get OpenAI response');
    }

    const content = response.choices[0]?.message?.content;
    let isValid = false;
    let rejectionReason: RejectionReason | undefined;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        isValid = parsed.r === true;
        rejectionReason = parsed.x ? rejectionMap[parsed.x] : undefined;
      } catch {
        isValid = false;
        rejectionReason = 'invalid_word';
      }
    }

    // Cache the result (including rejection reason)
    await supabase.from('word_associations').insert({
      word1: w1,
      word2: w2,
      is_valid: isValid,
      rejection_reason: rejectionReason,
    });

    return NextResponse.json({
      isValid,
      cached: false,
      reason: isValid ? undefined : (rejectionReason || 'not_related'),
    });
  } catch (error) {
    console.error('Word validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate word' },
      { status: 500 }
    );
  }
}
