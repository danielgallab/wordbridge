import Link from 'next/link';
import { DailyChallenge } from '@/components/daily';
import { getSessionId } from '@/lib/sessionId.server';
import { getDailyData } from '@/lib/daily.server';
import { HomeClient } from '@/components/HomeClient';

export default async function Home() {
  const sessionId = await getSessionId();
  const dailyData = await getDailyData(sessionId);

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 tracking-tight">
          WORDBRIDGE
        </h1>
        <p className="text-center text-[var(--text-muted)] text-xs sm:text-sm mb-6 sm:mb-8">
          Connect words in the shortest chain
        </p>

        {/* Daily Challenge */}
        <DailyChallenge initialData={dailyData} />

        {/* Multiplayer CTA */}
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)] uppercase">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
          <Link
            href="/multiplayer"
            className="w-full py-3 rounded-md bg-[var(--present)] text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Challenge a Friend
          </Link>
        </div>

        {/* Footer links */}
        <HomeClient />
      </div>
    </main>
  );
}
