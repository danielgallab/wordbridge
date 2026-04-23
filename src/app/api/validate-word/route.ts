import { NextRequest } from 'next/server';
import { validateWordPair } from '@/lib/validate-word';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { monitor } from '@/lib/debug';

export const POST = withErrorHandler('validate-word', async (request: Request) => {
  checkRateLimit(request as NextRequest, 'validate-word', RATE_LIMITS.ai);

  const { word1, word2 } = await request.json();

  if (!word1 || !word2) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Both words are required' });
  }

  const start = performance.now();
  const result = await validateWordPair(word1, word2);
  const duration = performance.now() - start;

  monitor.trackLatency('validate-word', duration);
  monitor.trackCacheHit('validate-word', result.cached);

  const { NextResponse } = await import('next/server');
  return NextResponse.json(result);
});
