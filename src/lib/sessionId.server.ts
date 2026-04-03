import { cookies } from 'next/headers';

const COOKIE_NAME = 'wordbridge_session_id';

// Get session ID from cookies (server-side)
export async function getSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;
  return sessionId || '';
}
