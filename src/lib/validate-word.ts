import { getOpenAI, WORD_VALIDATION_PROMPT } from '@/lib/openai';
import { createServiceClient } from '@/lib/supabase/server';
import { singularize } from '@/lib/singularize';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { type RejectionReason } from '@/lib/constants';
import { debug, monitor } from '@/lib/debug';

const WordAssociationResult = z.object({
  r: z.boolean(),
  x: z.enum(['n', 'a', 'm', 'p', 's', 'i']).nullable(),
  w: z.string().nullable().optional(),
});

const rejectionMap: Record<string, RejectionReason> = {
  n: 'not_related',
  a: 'too_abstract',
  m: 'multi_hop',
  p: 'proper_noun',
  s: 'misspelled',
  i: 'invalid_word',
};

export interface ValidationResult {
  isValid: boolean;
  cached: boolean;
  reason?: RejectionReason | 'same_as_previous';
  normalizedWord?: string;
  error?: string;
}

export async function validateWordPair(word1: string, word2: string): Promise<ValidationResult> {
  const w1 = word1.toLowerCase().trim();
  const w2 = word2.toLowerCase().trim();

  if (w1 === w2) {
    return { isValid: false, cached: false, reason: 'same_as_previous' };
  }

  if (!/^[a-z]+$/.test(w1) || !/^[a-z]+$/.test(w2)) {
    return { isValid: false, cached: false, reason: 'invalid_word' };
  }

  if (w1.length < 2 || w2.length < 2 || w1.length > 20 || w2.length > 20) {
    return { isValid: false, cached: false, reason: 'invalid_word' };
  }

  const supabase = createServiceClient();
  const abortController = new AbortController();
  const openai = getOpenAI();

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
    reasoning_effort: 'none',
    messages: [
      { role: 'system', content: WORD_VALIDATION_PROMPT },
      { role: 'user', content: `${w1},${w2}` },
    ],
    response_format: zodResponseFormat(WordAssociationResult, 'word_association'),
  }, {
    signal: abortController.signal,
  }).then(response => ({ type: 'openai' as const, data: response }))
    .catch(err => {
      if (err.name === 'AbortError') return null;
      throw err;
    });

  const result = await Promise.race([cachePromise, openaiPromise]);  

  if (result && result.type === 'cache' && result.data !== null) {
    abortController.abort();
    let normalizedWord: string | undefined;
    if (result.data.word1 === w1 && result.data.word2 !== w2) {
      normalizedWord = result.data.word2;
    }
    return {
      isValid: result.data.is_valid,
      cached: true,
      reason: result.data.rejection_reason || (result.data.is_valid ? undefined : 'not_related'),
      normalizedWord,
    };
  }

  const response = (result && result.type === 'openai') ? result.data : await openaiPromise.then(r => r?.data);

  if (!response) {
    debug.api.error('OpenAI response was null or aborted');
    monitor.trackError('validate-word:openai');
    return {
      isValid: false,
      cached: false,
      reason: 'not_related',
      error: 'Could not validate word, please try again',
    };
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
      // Only accept normalization if it's a plausible singular form
      // (the input should start with or contain the normalized word)
      if (parsed.w && parsed.w !== w2 && w2.startsWith(parsed.w)) {
        normalizedWord = parsed.w;
      }
    } catch {
      isValid = false;
      rejectionReason = 'invalid_word';
    }
  }

  const finalWord2 = normalizedWord || w2;

  const cacheInserts = [{ word1: w1, word2: finalWord2, is_valid: isValid, rejection_reason: rejectionReason }];
  if (normalizedWord && normalizedWord !== w2) {
    cacheInserts.push({ word1: w1, word2: w2, is_valid: isValid, rejection_reason: rejectionReason });
  }

  supabase.from('word_associations').insert(cacheInserts).then(() => {
    // Cached successfully
  }).catch((err: unknown) => {
    debug.api.error('Failed to cache word association:', err);
  });

  return {
    isValid,
    cached: false,
    reason: isValid ? undefined : (rejectionReason || 'not_related'),
    normalizedWord,
  };
}
