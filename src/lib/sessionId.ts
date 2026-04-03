const COOKIE_NAME = 'wordbridge_session_id';

// Get session ID synchronously (client-side only)
export function getSessionIdClient(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(^| )${COOKIE_NAME}=([^;]+)`));
  return match?.[2] || '';
}

// Set session ID cookie (client-side)
export function setSessionIdClient(sessionId: string): void {
  if (typeof document === 'undefined') return;
  // Set cookie to expire in 1 year
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${COOKIE_NAME}=${sessionId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

// Ensure session ID exists, creating one if needed (client-side)
export function ensureSessionId(): string {
  let sessionId = getSessionIdClient();
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    setSessionIdClient(sessionId);
  }
  return sessionId;
}

// Get today's date in UTC (YYYY-MM-DD format)
export function getTodayUTC(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}
