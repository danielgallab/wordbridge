'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, Network, Plus, LogIn } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { Tutorial } from '@/components/Tutorial';
import { useTutorial } from '@/hooks/useTutorial';

export default function MultiplayerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAction = searchParams.get('action');

  const { setRoom, setPlayer, initGame } = useGameStore();
  const { showTutorial, isLoaded, closeTutorial, openTutorial } = useTutorial();

  const [mode, setMode] = useState<'create' | 'join'>(
    initialAction === 'join' ? 'join' : 'create'
  );
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

  const switchMode = (newMode: 'create' | 'join') => {
    setMode(newMode);
    setError('');
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Back to Daily */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Daily Challenge
        </Link>

        {/* Header */}
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 tracking-tight">
          {mode === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}
        </h1>
        <p className="text-center text-[var(--text-muted)] text-xs sm:text-sm mb-6">
          {mode === 'create'
            ? 'Start a new game and invite a friend'
            : 'Enter a room code to join a friend'}
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

          {mode === 'create' ? (
            <>
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
                disabled={isCreating}
                className="w-full py-3 rounded-md bg-[var(--correct)] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {isCreating ? 'Creating...' : 'Create Room'}
              </button>
            </>
          ) : (
            <>
              {/* Room Code input */}
              <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="XXXX"
                maxLength={4}
                className="w-full px-4 py-3 rounded-md bg-[var(--background)] border-2 border-[var(--border)] text-[var(--text)] font-mono text-center text-xl uppercase placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--present)] mb-4"
              />

              {/* Join Room button */}
              <button
                onClick={handleJoinRoom}
                disabled={isJoining}
                className="w-full py-3 rounded-md bg-[var(--present)] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {isJoining ? 'Joining...' : 'Join Room'}
              </button>
            </>
          )}

          {/* Error message */}
          {error && (
            <p className="text-sm text-[var(--error)] text-center mt-4">{error}</p>
          )}

          {/* Switch mode */}
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            {mode === 'create' ? (
              <button
                onClick={() => switchMode('join')}
                className="w-full text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center justify-center gap-2"
              >
                <LogIn size={14} />
                Have a room code? Join instead
              </button>
            ) : (
              <button
                onClick={() => switchMode('create')}
                className="w-full text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                Want to host? Create a room
              </button>
            )}
          </div>
        </div>

        {/* Footer links */}
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
      </div>

      {/* Tutorial Modal */}
      {isLoaded && showTutorial && <Tutorial onClose={closeTutorial} />}
    </main>
  );
}
