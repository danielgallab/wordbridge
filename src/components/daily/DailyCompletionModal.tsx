'use client';

import { useState, useEffect } from 'react';
import { useDailyStore } from '@/stores/dailyStore';
import { DailyLeaderboard } from './DailyLeaderboard';
import { DailyStats } from './DailyStats';
import type { DailyPuzzle } from '@/types';
import type { PathQuality } from '@/lib/scoring';
import Link from 'next/link';

interface DailyCompletionModalProps {
  puzzle: DailyPuzzle;
  chain: string[];
  pathQuality: { rating: PathQuality; emoji: string; description: string } | null;
  onPractice: () => void;
  alreadyCompleted?: boolean;
}

export function DailyCompletionModal({
  puzzle,
  chain,
  pathQuality,
  onPractice,
  alreadyCompleted,
}: DailyCompletionModalProps) {
  const { loadLeaderboard, stats } = useDailyStore();
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

  // Load leaderboard on mount
  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const wordCount = chain.length;
  const puzzleNumber = puzzle.id;
  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleShare = async () => {
    const shareText =
      `WordBridge Daily #${puzzleNumber}\n` +
      `${puzzle.start_word.toUpperCase()} → ${puzzle.target_word.toUpperCase()}\n\n` +
      `Solved in ${wordCount} words ${pathQuality?.emoji || ''}\n` +
      `${chain.join(' → ')}\n\n` +
      `Play at wordbridge.app`;

    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(shareText);
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 2000);
      } catch {
        // Clipboard not available
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-lg p-4 sm:p-6">
        {/* Success Header */}
        <div className="text-center mb-4">
          {alreadyCompleted ? (
            <>
              <div className="text-3xl mb-2">✅</div>
              <h2 className="text-xl font-bold text-[var(--text)]">Already Completed!</h2>
              <p className="text-sm text-[var(--text-muted)]">{today}</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">{pathQuality?.emoji || '🎉'}</div>
              <h2 className="text-xl font-bold text-[var(--correct)]">
                {pathQuality?.description || 'Completed!'}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">Daily #{puzzleNumber}</p>
            </>
          )}
        </div>

        {/* Word Count */}
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-[var(--text)]">{wordCount}</div>
          <div className="text-sm text-[var(--text-muted)]">words used</div>
        </div>

        {/* Chain Display */}
        <div className="bg-[var(--background)] rounded-lg p-3 mb-4">
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-2">
            Your Solution
          </div>
          <div className="font-mono text-sm text-[var(--present)] break-words">
            {chain.join(' → ')}
          </div>
        </div>

        {/* Stats */}
        {stats && <DailyStats stats={stats} />}

        {/* Leaderboard */}
        <DailyLeaderboard />

        {/* Action Buttons */}
        <div className="space-y-2 mt-4">
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-full py-3 rounded-md bg-[var(--correct)] text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
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
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            {shareStatus === 'copied' ? 'Copied!' : 'Share Result'}
          </button>

          {/* Practice Button */}
          <button
            onClick={onPractice}
            className="w-full py-3 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold hover:opacity-90 transition-opacity"
          >
            Practice Again
          </button>

          {/* Multiplayer Button */}
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

        {/* Next Puzzle Countdown */}
        <NextPuzzleCountdown />
      </div>
    </div>
  );
}

function NextPuzzleCountdown() {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center mt-4 pt-4 border-t border-[var(--border)]">
      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
        Next puzzle in
      </div>
      <div className="font-mono text-lg text-[var(--text)]">{timeLeft}</div>
    </div>
  );
}
