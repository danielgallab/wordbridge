'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
import { Tutorial } from '@/components/Tutorial';
import { useTutorial } from '@/hooks/useTutorial';

export default function Home() {
  const router = useRouter();
  const { setRoom, setPlayer, initGame } = useGameStore();
  const { showTutorial, isLoaded, closeTutorial, openTutorial } = useTutorial();

  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName.trim(), difficulty }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create room');
        setIsCreating(false);
        return;
      }

      // Set up game state
      setRoom(data.room);
      setPlayer(data.player.id, data.player.player_name);
      initGame(data.room, data.player.id, [data.player]);

      // Navigate to game
      router.push(`/play/${data.room.code}`);
    } catch {
      setError('Network error. Please try again.');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: joinCode.trim().toUpperCase(),
          playerName: playerName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to join room');
        setIsJoining(false);
        return;
      }

      // Set up game state
      setRoom(data.room);
      setPlayer(data.player.id, data.player.player_name);
      initGame(data.room, data.player.id, data.room.room_players || []);

      // Navigate to game
      router.push(`/play/${data.room.code}`);
    } catch {
      setError('Network error. Please try again.');
      setIsJoining(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 tracking-tight">
          WORDBRIDGE
        </h1>
        <p className="text-center text-[var(--text-muted)] text-xs sm:text-sm mb-6 sm:mb-8">
          Connect words in the shortest chain
        </p>

        {/* Card */}
        <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-lg p-4 sm:p-6">
          {/* Name input */}
          <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={16}
            className="w-full px-4 py-3 rounded-md bg-[var(--background)] border-2 border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--correct)] mb-4"
          />

          {/* Difficulty selector */}
          <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-2">
            Difficulty
          </label>
          <div className="flex gap-2 mb-4">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-md font-bold text-sm capitalize transition-all ${
                  difficulty === d
                    ? d === 'easy'
                      ? 'bg-[var(--correct)] text-white'
                      : d === 'medium'
                      ? 'bg-[var(--present)] text-white'
                      : 'bg-[var(--error)] text-white'
                    : 'bg-[var(--background)] border-2 border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Create Room button */}
          <button
            onClick={handleCreateRoom}
            disabled={isCreating || isJoining}
            className="w-full py-3 rounded-md bg-[var(--correct)] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {isCreating ? 'Creating...' : 'Create Room'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)] uppercase">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Join Room */}
          <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-2">
            Room Code
          </label>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="XXXX"
              maxLength={4}
              className="flex-1 px-4 py-3 rounded-md bg-[var(--background)] border-2 border-[var(--border)] text-[var(--text)] font-mono text-center uppercase placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--present)]"
            />
            <button
              onClick={handleJoinRoom}
              disabled={isCreating || isJoining}
              className="px-6 py-3 rounded-md bg-[var(--present)] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? '...' : 'Join'}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-[var(--error)] text-center">{error}</p>
          )}
        </div>

        {/* How to play button */}
        <div className="mt-6 text-center">
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
        </div>
      </div>

      {/* Tutorial Modal */}
      {isLoaded && showTutorial && <Tutorial onClose={closeTutorial} />}
    </main>
  );
}
