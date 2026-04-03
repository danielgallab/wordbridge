'use client';

import Link from 'next/link';
import { Tutorial } from '@/components/Tutorial';
import { useTutorial } from '@/hooks/useTutorial';

export function HomeClient() {
  const { showTutorial, isLoaded, closeTutorial, openTutorial } = useTutorial();

  return (
    <>
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

      {/* Tutorial Modal */}
      {isLoaded && showTutorial && <Tutorial onClose={closeTutorial} />}
    </>
  );
}
