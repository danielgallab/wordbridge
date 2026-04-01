'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { GameArena } from '@/components/game';
import { useGameStore } from '@/stores/gameStore';

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const { room, playerId, setRoom, initGame, setPlayer } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // If we already have the room in state, just mark as loaded
    if (room && room.code === code.toUpperCase()) {
      setLoading(false);
      return;
    }

    // Otherwise fetch room data (for page refresh scenarios)
    async function fetchRoom() {
      try {
        const res = await fetch(`/api/rooms?code=${code}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Room not found');
          setLoading(false);
          return;
        }

        setRoom(data.room);

        // If we don't have a playerId, we need to redirect to join
        if (!playerId) {
          router.push(`/?join=${code}`);
          return;
        }

        const players = data.room.room_players || [];
        initGame(data.room, playerId, players);
        setLoading(false);
      } catch (err) {
        setError('Failed to load room');
        setLoading(false);
      }
    }

    fetchRoom();
  }, [code, room, playerId, setRoom, initGame, router]);

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <p className="text-[var(--text-muted)]">Loading game...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[var(--error)] mb-4">{error}</p>
          <Link
            href="/"
            className="px-6 py-3 rounded-md bg-[var(--correct)] text-white font-bold hover:opacity-90 transition-opacity"
          >
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-w-3xl mx-auto w-full">
        <Link
          href="/"
          className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          &larr; Leave
        </Link>
        <h1 className="text-xl font-bold tracking-tight">WORDBRIDGE</h1>
        <div className="text-sm font-mono text-[var(--text-muted)]">
          {code.toUpperCase()}
        </div>
      </div>

      {/* Game */}
      <GameArena />
    </main>
  );
}
