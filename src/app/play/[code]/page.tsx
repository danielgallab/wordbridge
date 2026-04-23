'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { GameArena } from '@/components/game';
import { useGameStore } from '@/stores/gameStore';
import { ROOM_STATUS } from '@/lib/constants';

function getStoredPlayerId(code: string): string | null {
  try {
    return localStorage.getItem(`wb_player_${code.toUpperCase()}`);
  } catch {
    return null;
  }
}

function storePlayerId(code: string, playerId: string) {
  try {
    localStorage.setItem(`wb_player_${code.toUpperCase()}`, playerId);
  } catch {
    // localStorage not available
  }
}

export default function PlayPage() {
  const params = useParams();
  const code = params.code as string;

  const { room, playerId, setRoom, setPlayer, initGame } = useGameStore();
  const roomAlreadyLoaded = room && room.code === code.toUpperCase();
  const [loading, setLoading] = useState(!roomAlreadyLoaded);
  const [error, setError] = useState('');
  const [needsJoin, setNeedsJoin] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [roomData, setRoomData] = useState<{ status: string; room_players?: { length: number } } | null>(null);

  // Persist playerId to localStorage whenever it changes
  useEffect(() => {
    if (playerId && code) {
      storePlayerId(code, playerId);
    }
  }, [playerId, code]);

  useEffect(() => {
    if (roomAlreadyLoaded) {
      return;
    }

    async function fetchRoom() {
      try {
        const res = await fetch(`/api/rooms?code=${code}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Room not found');
          setLoading(false);
          return;
        }

        const fetchedRoom = data.room;
        const players = fetchedRoom.room_players || [];
        setRoomData(fetchedRoom);

        // Try to restore session: check Zustand first, then localStorage
        const storedId = playerId || getStoredPlayerId(code);
        const matchedPlayer = storedId
          ? players.find((p: { id: string }) => p.id === storedId)
          : null;

        if (matchedPlayer) {
          // Player found in room — restore full session
          setRoom(fetchedRoom);
          setPlayer(matchedPlayer.id, matchedPlayer.player_name);
          initGame(fetchedRoom, matchedPlayer.id, players);
          storePlayerId(code, matchedPlayer.id);
          setLoading(false);
        } else {
          // No player session — show join form
          setRoom(fetchedRoom);
          setNeedsJoin(true);
          setLoading(false);
        }
      } catch {
        setError('Failed to load room');
        setLoading(false);
      }
    }

    fetchRoom();
  }, [code, roomAlreadyLoaded, playerId, setRoom, setPlayer, initGame]);

  const handleJoin = async () => {
    if (!playerName.trim()) {
      setJoinError('Please enter your name');
      return;
    }

    setIsJoining(true);
    setJoinError('');

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase(),
          playerName: playerName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setJoinError(data.error || 'Failed to join room');
        setIsJoining(false);
        return;
      }

      // Set up game state
      const joinedRoom = data.room;
      const player = data.player;
      setRoom(joinedRoom);
      setPlayer(player.id, player.player_name);
      initGame(joinedRoom, player.id, joinedRoom.room_players || []);
      storePlayerId(code, player.id);
      setNeedsJoin(false);
    } catch {
      setJoinError('Network error. Please try again.');
      setIsJoining(false);
    }
  };

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

  // Inline join form for new players
  if (needsJoin) {
    const roomStatus = roomData?.status;
    const gameAlreadyStarted = roomStatus !== ROOM_STATUS.WAITING;

    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 tracking-tight">
            WORDBRIDGE
          </h1>
          <p className="text-center text-[var(--text-muted)] text-xs sm:text-sm mb-6">
            You&apos;ve been invited to a game!
          </p>

          <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-lg p-4 sm:p-6">
            {/* Room code display */}
            <div className="text-center mb-4">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">
                Room Code
              </p>
              <div className="text-2xl font-mono font-bold tracking-widest text-[var(--present)]">
                {code.toUpperCase()}
              </div>
            </div>

            {gameAlreadyStarted ? (
              <div className="text-center">
                <p className="text-[var(--text-muted)] mb-4">
                  This game has already started.
                </p>
                <Link
                  href="/multiplayer"
                  className="inline-block px-6 py-3 rounded-md bg-[var(--correct)] text-white font-bold hover:opacity-90 transition-opacity"
                >
                  Create Your Own Room
                </Link>
              </div>
            ) : (
              <>
                {/* Name input */}
                <label className="block text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isJoining) handleJoin();
                  }}
                  placeholder="Enter your name"
                  maxLength={16}
                  className="w-full px-4 py-3 rounded-md bg-[var(--background)] border-2 border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--present)] mb-4"
                  autoFocus
                />

                {/* Join button */}
                <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="w-full py-3 rounded-md bg-[var(--present)] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  {isJoining ? 'Joining...' : 'Join Game'}
                </button>

                {/* Error */}
                {joinError && (
                  <p className="text-sm text-[var(--error)] text-center mt-4">{joinError}</p>
                )}
              </>
            )}
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-2 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 max-w-3xl mx-auto w-full">
        <Link
          href="/"
          className="text-sm sm:text-base text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          &larr; <span className="hidden sm:inline">Leave</span>
        </Link>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">WORDBRIDGE</h1>
        <div className="text-xs sm:text-sm font-mono text-[var(--text-muted)]">
          {code.toUpperCase()}
        </div>
      </div>

      {/* Game */}
      <GameArena />
    </main>
  );
}
