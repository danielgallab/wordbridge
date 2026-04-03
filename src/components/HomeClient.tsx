'use client';

import Link from 'next/link';
import { HelpCircle, Network } from 'lucide-react';
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
          <HelpCircle size={16} />
          How to play
        </button>
        <Link
          href="/word-web"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <Network size={16} />
          Word Web
        </Link>
      </div>

      {/* Tutorial Modal */}
      {isLoaded && showTutorial && <Tutorial onClose={closeTutorial} />}
    </>
  );
}
