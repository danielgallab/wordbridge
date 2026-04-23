'use client';

import Link from 'next/link';
import { HelpCircle, Network, Swords, Dumbbell } from 'lucide-react';
import { Tutorial } from '@/components/Tutorial';
import { useTutorial } from '@/hooks/useTutorial';

export function HomeClient() {
  const { showTutorial, isLoaded, closeTutorial, openTutorial } = useTutorial();

  return (
    <>
      {/* Navigation links */}
      <nav className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Link
          href="/practice"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <Dumbbell size={16} />
          Practice
        </Link>
        <Link
          href="/multiplayer"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <Swords size={16} />
          Multiplayer
        </Link>
        <Link
          href="/word-web"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <Network size={16} />
          Word Web
        </Link>
        <button
          onClick={openTutorial}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <HelpCircle size={16} />
          How to play
        </button>
      </nav>

      {/* Tutorial Modal */}
      {isLoaded && showTutorial && <Tutorial onClose={closeTutorial} />}
    </>
  );
}
