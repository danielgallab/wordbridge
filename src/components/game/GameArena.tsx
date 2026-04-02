'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Timer } from './Timer';
import { PlayerPanel } from './PlayerPanel';
import { useGameStore } from '@/stores/gameStore';
import { useGameRoom } from '@/hooks/useGameRoom';
import { calculatePathQuality } from '@/lib/scoring';

const TOTAL_TIME = 90;

export function GameArena() {
  const router = useRouter();

  const {
    room,
    playerId,
    myChain,
    opponentChain,
    opponentChainLength,
    timeLeft,
    rematchStatus,
    winner,
    error,
    isValidating,
    players,
    isHost,
    submitWord,
    requestRematch,
    startGame,
    reset,
  } = useGameStore();

  const { opponent, isWaiting, isPlaying, isFinished } = useGameRoom(room?.id || null);

  const myPlayer = players.find(p => p.id === playerId);
  const myName = myPlayer?.player_name || 'You';
  const opponentName = opponent?.player_name || 'Opponent';

  // Derive rematch state from rematchStatus
  const wantsRematch = rematchStatus === 'requested';
  const opponentWantsRematch = rematchStatus === 'pending';
  const isRematchStarting = rematchStatus === 'starting';
  const showGameOver = isFinished && rematchStatus !== 'starting';

  // Delay showing rematch UI so both players can see chains first
  const [showRematchUI, setShowRematchUI] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
  const [gameOverKey, setGameOverKey] = useState(0);

  // Reset showRematchUI when game over state changes
  useEffect(() => {
    if (showGameOver) {
      setGameOverKey(prev => prev + 1);
    }
  }, [showGameOver]);

  // Delay showing rematch UI after game over
  useEffect(() => {
    if (!showGameOver) {
      return;
    }
    setShowRematchUI(false);
    const timer = setTimeout(() => setShowRematchUI(true), 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOverKey]);

  // Calculate path quality for display
  const pathQuality = myChain.length > 1
    ? calculatePathQuality(myChain.length, room?.difficulty || 'medium')
    : null;

  const handleShare = async () => {
    const shareText = `WordBridge: ${room?.start_word.toUpperCase()} → ${room?.target_word.toUpperCase()}\n` +
      `My chain (${myChain.length - 1} steps): ${myChain.join(' → ')}\n` +
      `Play at: wordbridge.app`;

    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 2000);
      }
    } catch {
      // User cancelled or error - try clipboard as fallback
      try {
        await navigator.clipboard.writeText(shareText);
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 2000);
      } catch {
        // Clipboard not available
      }
    }
  };

  const handleSubmitWord = useCallback(
    async (word: string) => {
      await submitWord(word);
    },
    [submitWord]
  );

  const handleGoHome = () => {
    reset();
    router.push('/');
  };

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[var(--text-muted)]">Loading game...</p>
      </div>
    );
  }

  // Waiting for players / lobby
  if (isWaiting) {
    const canStart = players.length >= 2;
    // Sort players by created_at to ensure host (first player) is always first
    const sortedPlayers = [...players].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );

    return (
      <div className="w-full max-w-md mx-auto text-center px-2">
        <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-lg p-4 sm:p-8">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
            {isHost ? 'Waiting for players...' : 'Waiting for host to start...'}
          </h2>

          {/* Room code */}
          <div className="mb-4 sm:mb-6">
            <p className="text-sm sm:text-base text-[var(--text-muted)] mb-2">Share this code:</p>
            <div className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-[var(--present)]">
              {room.code}
            </div>
          </div>

          {/* Player list */}
          <div className="mb-4 sm:mb-6">
            <p className="text-xs uppercase text-[var(--text-muted)] mb-2 font-bold">
              Players ({sortedPlayers.length}/8)
            </p>
            <div className="space-y-2">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`px-3 py-2 rounded-md border ${
                    player.id === playerId
                      ? 'border-[var(--present)] bg-[var(--present)]/10'
                      : 'border-[var(--border)] bg-[var(--background)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{player.player_name}</span>
                    <div className="flex items-center gap-2">
                      {player.id === playerId && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--present)] text-white font-bold">
                          YOU
                        </span>
                      )}
                      {index === 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--correct)] text-white font-bold">
                          HOST
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Waiting animation or Start button */}
          {isHost ? (
            <button
              onClick={startGame}
              disabled={!canStart}
              className={`w-full py-3 rounded-md font-bold transition-opacity mb-3 ${
                canStart
                  ? 'bg-[var(--correct)] text-white hover:opacity-90'
                  : 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
              }`}
            >
              {canStart ? 'Start Game' : 'Need at least 2 players'}
            </button>
          ) : (
            <div className="flex gap-1 justify-center mb-4 sm:mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}

          <button
            onClick={handleGoHome}
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="text-center flex-1">
          <div className="text-xs sm:text-sm text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Connect
          </div>
          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm sm:text-base text-[var(--present)] uppercase">
              {room.start_word}
            </span>
            <span className="text-[var(--text-muted)]">→</span>
            <span className="font-mono font-bold text-sm sm:text-base text-[var(--correct)] uppercase">
              {room.target_word}
            </span>
          </div>
          {room.difficulty && (
            <div className="flex justify-center mt-1">
              <span
                className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                  room.difficulty === 'easy'
                    ? 'bg-[var(--correct)]/20 text-[var(--correct)]'
                    : room.difficulty === 'medium'
                    ? 'bg-[var(--present)]/20 text-[var(--present)]'
                    : 'bg-[var(--error)]/20 text-[var(--error)]'
                }`}
              >
                {room.difficulty}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Timer */}
      <div className="flex justify-center mb-4 sm:mb-6">
        <Timer timeLeft={timeLeft} totalTime={room.time_limit || TOTAL_TIME} />
      </div>

      {/* Arena */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        <PlayerPanel
          name={myName}
          chain={myChain}
          targetWord={room.target_word}
          isYou
          isWinner={winner === 'me'}
          showInput={isPlaying}
          onSubmitWord={handleSubmitWord}
          isValidating={isValidating}
          error={error}
        />

        {/* VS Divider - hidden on mobile since panels stack */}
        <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-10 h-10 rounded-full bg-[var(--background)] border-2 border-[var(--border)] flex items-center justify-center font-bold text-[var(--text-muted)]">
            VS
          </div>
        </div>

        <PlayerPanel
          name={opponentName}
          chain={opponentChain}
          targetWord={room.target_word}
          isWinner={winner === 'opponent'}
          chainLength={opponentChainLength}
          showChainLengthOnly={!isFinished}
        />
      </div>

      {/* Game Over Overlay */}
      {showGameOver && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[var(--background)] border-2 border-[var(--border)] rounded-xl p-4 sm:p-8 text-center max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">
              {winner === 'me' ? '🏆' : winner === 'opponent' ? '💀' : '🤝'}
            </div>
            <h2
              className={`text-xl sm:text-2xl font-bold mb-2 ${
                winner === 'me'
                  ? 'text-[var(--correct)]'
                  : winner === 'opponent'
                  ? 'text-[var(--error)]'
                  : 'text-[var(--present)]'
              }`}
            >
              {winner === 'me' ? 'You Win!' : winner === 'opponent' ? `${opponentName} Wins` : 'Draw!'}
            </h2>

            {/* Path quality rating */}
            {pathQuality && winner === 'me' && (
              <div className="mb-3">
                <span className="text-2xl">{pathQuality.emoji}</span>
                <p className="text-sm text-[var(--text-muted)]">{pathQuality.description}</p>
              </div>
            )}

            {/* Side-by-side chain comparison */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {myChain.length > 1 && (
                <div className="bg-[var(--surface)] rounded-lg p-2 sm:p-3 text-left">
                  <div className="text-xs uppercase text-[var(--text-muted)] mb-1 font-bold">
                    You ({myChain.length - 1} steps)
                  </div>
                  <div className="font-mono text-xs text-[var(--present)] break-words">
                    {myChain.join(' → ')}
                  </div>
                </div>
              )}

              {opponentChain.length > 1 && (
                <div className="bg-[var(--surface)] rounded-lg p-2 sm:p-3 text-left">
                  <div className="text-xs uppercase text-[var(--text-muted)] mb-1 font-bold">
                    {opponentName} ({opponentChain.length - 1} steps)
                  </div>
                  <div className="font-mono text-xs text-[var(--text-muted)] break-words">
                    {opponentChain.join(' → ')}
                  </div>
                </div>
              )}
            </div>

            {/* Share button */}
            <button
              onClick={handleShare}
              className="w-full py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold hover:opacity-90 transition-opacity mb-3 flex items-center justify-center gap-2"
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

            {/* Rematch UI - delayed appearance */}
            {showRematchUI && (
              <>
                {wantsRematch || isRematchStarting ? (
                  <div className="w-full py-3 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold mb-3 flex items-center justify-center gap-2">
                    {isRematchStarting ? (
                      <>Starting rematch...</>
                    ) : (
                      <>
                        Waiting for {opponentName}
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={requestRematch}
                    className="w-full py-3 rounded-md bg-[var(--correct)] text-white font-bold hover:opacity-90 transition-opacity mb-3"
                  >
                    {opponentWantsRematch ? `${opponentName} wants a rematch!` : 'Play Again'}
                  </button>
                )}
              </>
            )}

            <button
              onClick={handleGoHome}
              className="w-full py-3 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold hover:opacity-90 transition-opacity"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
