'use client';

import { useState, useEffect } from 'react';
import { Upload, Plus, LogIn, CheckCircle, PartyPopper } from 'lucide-react';
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
  alreadyCompleted?: boolean;
}

export function DailyCompletionModal({
  puzzle,
  chain,
  pathQuality,
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
              <div className="flex justify-center mb-2">
                <CheckCircle className="w-10 h-10 text-[var(--correct)]" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text)]">Already Completed!</h2>
              <p className="text-sm text-[var(--text-muted)]">{today}</p>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-2">
                <PartyPopper className="w-12 h-12 text-[var(--correct)]" />
              </div>
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
            <Upload className="w-4 h-4" />
            {shareStatus === 'copied' ? 'Copied!' : 'Share Result'}
          </button>

          {/* Practice Button */}
          <Link
            href="/practice"
            className="w-full py-3 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold hover:opacity-90 transition-opacity flex items-center justify-center"
          >
            Practice Mode
          </Link>

          {/* Multiplayer Buttons */}
          <div className="flex gap-2">
            <Link
              href="/multiplayer?action=create"
              className="flex-1 py-3 rounded-md bg-[var(--correct)] text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Room
            </Link>
            <Link
              href="/multiplayer?action=join"
              className="flex-1 py-3 rounded-md bg-[var(--present)] text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Join Room
            </Link>
          </div>
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
