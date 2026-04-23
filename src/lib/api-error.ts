import { NextResponse } from 'next/server';
import { debug } from '@/lib/debug';

// Error codes that clients can use to determine how to handle the error
export type ApiErrorCode =
  | 'BAD_REQUEST'       // Invalid input from client
  | 'NOT_FOUND'         // Resource not found
  | 'FORBIDDEN'         // Not authorized for this action
  | 'RATE_LIMITED'      // Too many requests
  | 'UPSTREAM_ERROR'    // OpenAI or external service failure
  | 'DATABASE_ERROR'    // Supabase/DB failure
  | 'SERVER_ERROR';     // Unexpected internal error

const STATUS_MAP: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  DATABASE_ERROR: 503,
  SERVER_ERROR: 500,
};

// User-facing messages that don't leak internals
const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  BAD_REQUEST: 'Invalid request',
  NOT_FOUND: 'Not found',
  FORBIDDEN: 'Not authorized',
  RATE_LIMITED: 'Too many requests — please wait a moment',
  UPSTREAM_ERROR: 'Service temporarily unavailable — please try again',
  DATABASE_ERROR: 'Service temporarily unavailable — please try again',
  SERVER_ERROR: 'Something went wrong — please try again',
};

interface ApiErrorOptions {
  code: ApiErrorCode;
  message?: string;          // User-facing message
  reason?: string;           // Machine-readable reason (e.g. RejectionReason)
  detail?: string;           // Internal detail for logging (never sent to client)
  cause?: unknown;           // Original error for logging
}

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  reason?: string;
  detail?: string;
  cause?: unknown;

  constructor(opts: ApiErrorOptions) {
    const message = opts.message ?? DEFAULT_MESSAGES[opts.code];
    super(message);
    this.name = 'ApiError';
    this.code = opts.code;
    this.status = STATUS_MAP[opts.code];
    this.reason = opts.reason;
    this.detail = opts.detail;
    this.cause = opts.cause;
  }

  toResponse(): NextResponse {
    const body: Record<string, unknown> = {
      error: this.message,
      code: this.code,
    };
    if (this.reason) {
      body.reason = this.reason;
    }
    return NextResponse.json(body, { status: this.status });
  }
}

/**
 * Wraps an API route handler to catch ApiError (and unexpected errors)
 * and return structured JSON responses with logging.
 */
export function withErrorHandler(
  routeName: string,
  handler: (request: Request) => Promise<NextResponse>,
) {
  return async (request: Request): Promise<NextResponse> => {
    const start = performance.now();
    try {
      const response = await handler(request);
      const duration = Math.round(performance.now() - start);
      debug.api.log(`[${routeName}] ${response.status} (${duration}ms)`);
      return response;
    } catch (err) {
      const duration = Math.round(performance.now() - start);

      if (err instanceof ApiError) {
        if (err.detail || err.cause) {
          debug.api.error(`[${routeName}] ${err.code}: ${err.detail ?? err.message}`, err.cause ?? '');
        }
        debug.api.log(`[${routeName}] ${err.status} (${duration}ms)`);
        return err.toResponse();
      }

      // Unexpected error — log full details, return generic message
      debug.api.error(`[${routeName}] Unexpected error (${duration}ms):`, err);
      return new ApiError({ code: 'SERVER_ERROR' }).toResponse();
    }
  };
}
