'use client';

import { Trophy, RotateCcw, Home, Plus, LogIn } from 'lucide-react';
import Link from 'next/link';
import { ChainDisplay } from '@/components/game/ChainDisplay';
interface PracticeCompletionModalProps {
  puzzle: { start_word: string; target_word: string };
  chain: string[];
  pathQuality: { rating: string; emoji: string; description: string } | null;
  onNewPuzzle: () => void;
}

const PATH_QUALITY_CONFIG: Record<string, { emoji: string; label: string; description: string; color: string }> = {
  perfect: {
    emoji: '🌟',
    label: 'Perfect!',
    description: 'Optimal path!',
    color: 'text-yellow-400',
  },
  great: {
    emoji: '⭐',
    label: 'Great Path!',
    description: 'Very efficient solution',
    color: 'text-green-400',
  },
  good: {
    emoji: '👍',
    label: 'Good Path',
    description: 'Nice work!',
    color: 'text-blue-400',
  },
  okay: {
    emoji: '🎯',
    label: 'Complete',
    description: 'You made it!',
    color: 'text-gray-400',
  },
};

export function PracticeCompletionModal({
  puzzle,
  chain,
  pathQuality,
  onNewPuzzle,
}: PracticeCompletionModalProps) {
  const quality = pathQuality?.rating || 'okay';
  const config = PATH_QUALITY_CONFIG[quality] || PATH_QUALITY_CONFIG.okay;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[var(--surface)] border-2 border-[var(--correct)] rounded-lg p-6">
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{config.emoji}</div>
          <h2 className={`text-2xl font-bold mb-1 ${config.color}`}>
            {config.label}
          </h2>
          <p className="text-[var(--text-muted)] text-sm">{config.description}</p>
        </div>

        {/* Stats */}
        <div className="bg-[var(--background)] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-[var(--correct)]" />
            <span className="text-sm font-medium text-[var(--text-muted)]">
              Completed in {chain.length - 1} {chain.length === 2 ? 'word' : 'words'}
            </span>
          </div>
          <div className="text-center">
            <span className="font-mono font-bold text-lg text-[var(--present)] uppercase">
              {puzzle.start_word}
            </span>
            <span className="text-[var(--text-muted)] mx-2">→</span>
            <span className="font-mono font-bold text-lg text-[var(--correct)] uppercase">
              {puzzle.target_word}
            </span>
          </div>
        </div>

        {/* Chain Display */}
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-2">
            Your Solution
          </div>
          <ChainDisplay
            chain={chain}
            targetWord={puzzle.target_word}
            isPlayer
            isValidating={false}
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {/* New Puzzle Button */}
          <button
            onClick={onNewPuzzle}
            className="w-full py-3 rounded-md bg-[var(--correct)] text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            New Puzzle
          </button>

          {/* Daily Challenge Button */}
          <Link
            href="/"
            className="w-full py-3 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Daily Challenge
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
      </div>
    </div>
  );
}
