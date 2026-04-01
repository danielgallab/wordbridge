'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Timer } from './Timer';
import { PlayerPanel } from './PlayerPanel';
import { useGameStore } from '@/stores/gameStore';
import { useGameRoom } from '@/hooks/useGameRoom';

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
    isGameOver,
    winner,
    error,
    isValidating,
    players,
    wantsRematch,
    opponentWantsRematch,
    submitWord,
    requestRematch,
    reset,
  } = useGameStore();

  const { opponent, isWaiting, isPlaying } = useGameRoom(room?.id || null);

  const myPlayer = players.find(p => p.id === playerId);
  const myName = myPlayer?.player_name || 'You';
  const opponentName = opponent?.player_name || 'Opponent';

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

  // Waiting for opponent
  if (isWaiting) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-lg p-8">
          <h2 className="text-xl font-bold mb-4">Waiting for opponent...</h2>
          <div className="mb-6">
            <p className="text-[var(--text-muted)] mb-2">Share this code:</p>
            <div className="text-4xl font-mono font-bold tracking-widest text-[var(--present)]">
              {room.code}
            </div>
          </div>
          <div className="flex gap-1 justify-center mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <button
            onClick={handleGoHome}
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-center flex-1">
          <div className="text-sm text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Connect
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono font-bold text-[var(--present)] uppercase">
              {room.start_word}
            </span>
            <span className="text-[var(--text-muted)]">→</span>
            <span className="font-mono font-bold text-[var(--correct)] uppercase">
              {room.target_word}
            </span>
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="flex justify-center mb-6">
        <Timer timeLeft={timeLeft} totalTime={room.time_limit || TOTAL_TIME} />
      </div>

      {/* Arena */}
      <div className="grid grid-cols-2 gap-4 relative">
        <PlayerPanel
          name={myName}
          chain={myChain}
          targetWord={room.target_word}
          isYou
          isWinner={winner === 'me'}
          showInput={isPlaying && !isGameOver}
          onSubmitWord={handleSubmitWord}
          isValidating={isValidating}
          error={error}
        />

        {/* VS Divider */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
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
          showChainLengthOnly={!isGameOver}
        />
      </div>

      {/* Game Over Overlay */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[var(--background)] border-2 border-[var(--border)] rounded-xl p-8 text-center max-w-sm w-full mx-4">
            <div className="text-5xl mb-4">
              {winner === 'me' ? '🏆' : winner === 'opponent' ? '💀' : '🤝'}
            </div>
            <h2
              className={`text-2xl font-bold mb-2 ${
                winner === 'me'
                  ? 'text-[var(--correct)]'
                  : winner === 'opponent'
                  ? 'text-[var(--error)]'
                  : 'text-[var(--present)]'
              }`}
            >
              {winner === 'me' ? 'You Win!' : winner === 'opponent' ? `${opponentName} Wins` : 'Draw!'}
            </h2>
            <p className="text-[var(--text-muted)] mb-4">
              {winner === 'me'
                ? `Your chain: ${myChain.length - 1} steps`
                : winner === 'opponent'
                ? `${opponentName}'s chain: ${opponentChain.length - 1} steps`
                : 'Same number of steps!'}
            </p>

            {myChain.length > 1 && (
              <div className="bg-[var(--surface)] rounded-lg p-3 mb-4 text-left">
                <div className="text-xs uppercase text-[var(--text-muted)] mb-1 font-bold">
                  Your chain
                </div>
                <div className="font-mono text-sm text-[var(--present)]">
                  {myChain.join(' → ')}
                </div>
              </div>
            )}

            {opponentChain.length > 1 && (
              <div className="bg-[var(--surface)] rounded-lg p-3 mb-4 text-left">
                <div className="text-xs uppercase text-[var(--text-muted)] mb-1 font-bold">
                  {opponentName}&apos;s chain
                </div>
                <div className="font-mono text-sm text-[var(--text-muted)]">
                  {opponentChain.join(' → ')}
                </div>
              </div>
            )}

            {wantsRematch ? (
              <div className="w-full py-3 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold mb-3 flex items-center justify-center gap-2">
                {opponentWantsRematch ? (
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
