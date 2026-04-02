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

const WordAssociationResult = z.object({
  reasoning: z.string(),
  related: z.boolean(),
  rejection_reason: z.enum([
    'not_related',
    'too_abstract',
    'multi_hop',
    'proper_noun',
    'misspelled',
    'invalid_word',
  ]).nullable(),
});

export async function POST(request: NextRequest) {
  const totalStart = performance.now();
  const timings: Record<string, number> = {};

  try {
    let start = performance.now();
    const { word1, word2 } = await request.json();
    timings['parseRequest'] = performance.now() - start;

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

    start = performance.now();
    const supabase = createServiceClient();
    timings['createSupabaseClient'] = performance.now() - start;

    // Check cache first (both directions)
    start = performance.now();
    const { data: cached } = await supabase
      .from('word_associations')
      .select('is_valid, rejection_reason')
      .or(`and(word1.eq.${w1},word2.eq.${w2}),and(word1.eq.${w2},word2.eq.${w1})`)
      .limit(1)
      .single();
    timings['cacheCheck'] = performance.now() - start;

    if (cached !== null) {
      timings['total'] = performance.now() - totalStart;
      console.log(`[Validate Word] "${w1}" <-> "${w2}" | CACHE HIT | Timings (ms):`, JSON.stringify(timings));
      return NextResponse.json({
        isValid: cached.is_valid,
        cached: true,
        reason: cached.rejection_reason || (cached.is_valid ? undefined : 'not_related'),
      });
    }

    // Call OpenAI gpt-5.4-mini with structured output (optimized for speed)
    start = performance.now();
    const openai = getOpenAI();
    timings['getOpenAIClient'] = performance.now() - start;

    start = performance.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: WORD_VALIDATION_PROMPT },
        { role: 'user', content: `${w1},${w2}` },
      ],
      response_format: zodResponseFormat(WordAssociationResult, 'word_association'),
      reasoning_effort: 'none',
      verbosity: 'low',
    });
    timings['openaiCall'] = performance.now() - start;

    const content = response.choices[0]?.message?.content;
    let isValid = false;
    let rejectionReason: string | undefined;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        isValid = parsed.related === true;
        rejectionReason = parsed.rejection_reason;
        console.log(`[Word Validation] "${w1}" <-> "${w2}": ${isValid ? 'VALID' : 'INVALID'} | Reasoning: ${parsed.reasoning} | Rejection: ${rejectionReason || 'none'}`);
      } catch {
        isValid = false;
        rejectionReason = 'invalid_word';
      }
    }

    // Cache the result (including rejection reason)
    start = performance.now();
    await supabase.from('word_associations').insert({
      word1: w1,
      word2: w2,
      is_valid: isValid,
      rejection_reason: rejectionReason,
    });
    timings['cacheInsert'] = performance.now() - start;

    timings['total'] = performance.now() - totalStart;
    console.log(`[Validate Word] "${w1}" <-> "${w2}" | CACHE MISS | Timings (ms):`, JSON.stringify(timings));

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
