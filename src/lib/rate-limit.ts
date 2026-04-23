import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/api-error';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store — resets on cold start, which is fine for basic protection.
// For multi-instance deployments, consider using Redis/Upstash.
const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent unbounded growth
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

// Presets for different endpoint types
export const RATE_LIMITS = {
  /** Endpoints that call OpenAI (validate-word, hint) */
  ai: { limit: 30, windowSeconds: 60 } satisfies RateLimitConfig,

  /** Word submission endpoints */
  submit: { limit: 20, windowSeconds: 60 } satisfies RateLimitConfig,

  /** Room creation / joining */
  room: { limit: 10, windowSeconds: 60 } satisfies RateLimitConfig,
} as const;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * Check rate limit for a request. Throws ApiError if exceeded.
 * Call at the top of your route handler.
 */
export function checkRateLimit(
  request: NextRequest,
  routeName: string,
  config: RateLimitConfig,
): void {
  cleanup();

  const ip = getClientIp(request);
  const key = `${routeName}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return;
  }

  entry.count++;

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    throw new ApiError({
      code: 'RATE_LIMITED',
      message: `Too many requests — please wait ${retryAfter}s`,
      detail: `Rate limit exceeded for ${key}: ${entry.count}/${config.limit} in ${config.windowSeconds}s window`,
    });
  }
}
