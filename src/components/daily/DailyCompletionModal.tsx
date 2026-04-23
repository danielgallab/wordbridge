'use client';

import { useState, useEffect } from 'react';
import { Upload, Plus, LogIn, CheckCircle, PartyPopper } from 'lucide-react';
import { useDailyStore } from '@/stores/dailyStore';
import { DailyLeaderboard } from './DailyLeaderboard';
import { DailyStats } from './DailyStats';
import { NameInputModal } from './NameInputModal';
import type { DailyPuzzle } from '@/types';
import type { PathQuality } from '@/lib/scoring';
import type { ShareCompletion } from '@/lib/daily.server';
import { getWordEmoji } from '@/lib/wordEmoji';
import Link from 'next/link';

interface DailyCompletionModalProps {
  puzzle: DailyPuzzle;
  chain: string[];
  attempts: { valid: boolean }[];
  pathQuality: { rating: PathQuality; emoji: string; description: string } | null;
  shareData?: ShareCompletion | null;
  alreadyCompleted?: boolean;
}

export function DailyCompletionModal({
  puzzle,
  chain,
  attempts,
  pathQuality,
  shareData,
  alreadyCompleted,
}: DailyCompletionModalProps) {
  const { loadLeaderboard, stats, sessionId, previousCompletion, shareCode } = useDailyStore();
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
  // Show name input only when just completed AND doesn't already have a name saved
  const hasExistingName = !!(stats?.playerName || previousCompletion?.playerName);
  const [showNameInput, setShowNameInput] = useState(!alreadyCompleted && !hasExistingName);
  const [isSubmittingName, setIsSubmittingName] = useState(false);

  // Load leaderboard on mount
  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handleNameSubmit = async (name: string) => {
    setIsSubmittingName(true);
    try {
      const response = await fetch('/api/daily/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          puzzleId: puzzle.id,
          playerName: name,
        }),
      });

      if (response.ok) {
        setShowNameInput(false);
        // Reload leaderboard to show updated name
        await loadLeaderboard();
      }
    } catch (error) {
      console.error('Failed to submit name:', error);
    } finally {
      setIsSubmittingName(false);
    }
  };

  const handleNameSkip = () => {
    setShowNameInput(false);
  };

  const wordCount = chain.length;
  const puzzleNumber = puzzle.id;
  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleShare = async () => {
    // Build attempt pattern: ✅ for valid, ❌ for invalid
    const attemptIcons = attempts.map(a => a.valid ? '✅' : '❌').join(' ');
    const startEmoji = getWordEmoji(puzzle.start_word);
    const targetEmoji = getWordEmoji(puzzle.target_word);
    const startDisplay = startEmoji || puzzle.start_word.toUpperCase();
    const targetDisplay = targetEmoji || puzzle.target_word.toUpperCase();
    const attemptLine = `${startDisplay} → ${attemptIcons} → ${targetDisplay}`;

    // Use completion ID for short share URL
    const shareUrl = shareCode
      ? `https://wordbridge.danielgallab.com/?share=${shareCode}`
      : `https://wordbridge.danielgallab.com`;

    const validWords = attempts.filter(a => a.valid).length;
    const shareText =
      `WordBridge Daily #${puzzleNumber}\n` +
      `Bridged in ${validWords} word${validWords === 1 ? '' : 's'}\n\n` +
      `${attemptLine}\n\n` +
      shareUrl;

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

        {/* Sharer's Path - shown when opened from a share link */}
        {shareData && (
          <div className="bg-[var(--background)] rounded-lg p-3 mb-4 border border-[var(--border)]">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-2">
              {shareData.playerName ? `${shareData.playerName}'s Solution` : 'Their Solution'}
            </div>
            <div className="font-mono text-sm text-[var(--text-muted)] break-words">
              {shareData.chain.join(' → ')}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-2">
              {shareData.wordCount} words
            </div>
          </div>
        )}

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full py-3 rounded-md bg-[var(--correct)] text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mb-4"
        >
          <Upload className="w-4 h-4" />
          {shareStatus === 'copied' ? 'Copied!' : 'Share Result'}
        </button>

        {/* Name Input - only show when just completed (not already completed) */}
        {showNameInput && (
          <NameInputModal
            onSubmit={handleNameSubmit}
            onSkip={handleNameSkip}
            isSubmitting={isSubmittingName}
          />
        )}

        {/* Stats */}
        {stats && <DailyStats stats={stats} />}

        {/* Leaderboard */}
        <DailyLeaderboard />

        {/* Action Buttons */}
        <div className="space-y-2 mt-4">
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
