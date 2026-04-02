'use client';

import Link from 'next/link';
import { DailyChallenge } from '@/components/daily';
import { Tutorial } from '@/components/Tutorial';
import { useTutorial } from '@/hooks/useTutorial';

export default function Home() {
  const { showTutorial, isLoaded, closeTutorial, openTutorial } = useTutorial();

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
        <DailyChallenge />

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
        <div className="mt-6 flex items-center justify-center gap-6">
          <button
            onClick={openTutorial}
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
            How to play
          </button>
          <Link
            href="/word-web"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="5" r="3" />
              <circle cx="19" cy="12" r="3" />
              <circle cx="5" cy="12" r="3" />
              <circle cx="12" cy="19" r="3" />
              <path d="M12 8v8M15 10l4 2M9 10l-4 2M15 14l4-2M9 14l-4-2" />
            </svg>
            Word Web
          </Link>
        </div>
      </div>

      {/* Tutorial Modal */}
      {isLoaded && showTutorial && <Tutorial onClose={closeTutorial} />}
    </main>
  );
}
