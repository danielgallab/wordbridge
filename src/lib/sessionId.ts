// Generate or retrieve persistent session ID from localStorage
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = localStorage.getItem('wordbridge_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('wordbridge_session_id', sessionId);
  }
  return sessionId;
}

// Get today's date in UTC (YYYY-MM-DD format)
export function getTodayUTC(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}
