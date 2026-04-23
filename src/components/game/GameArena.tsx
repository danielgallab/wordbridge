'use client';

import { useCallback, useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Timer } from './Timer';
import { PlayerPanel } from './PlayerPanel';
import { CompactPlayerPanel } from './CompactPlayerPanel';
import { useGameStore } from '@/stores/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { useGameRoom } from '@/hooks/useGameRoom';
import { calculatePathQuality } from '@/lib/scoring';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { getWordEmoji } from '@/lib/wordEmoji';

// Lazy load the game over modal content since it's not needed until game ends
const GameOverContent = lazy(() => import('./GameOverContent').then(m => ({ default: m.GameOverContent })));

// Loading fallback for lazy-loaded component
function GameOverLoading() {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background)] border-2 border-[var(--border)] rounded-xl p-8 text-center">
        <div className="flex gap-1 justify-center">
          <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

const TOTAL_TIME = 90;

export function GameArena() {
  const router = useRouter();

  // Use useShallow to prevent re-renders when unrelated state changes
  const {
    room,
    playerId,
    myChain,
    myAttempts,
    timeLeft,
    rematchStatus,
    winner,
    error,
    isValidating,
    players,
    isHost,
  } = useGameStore(
    useShallow((state) => ({
      room: state.room,
      playerId: state.playerId,
      myChain: state.myChain,
      myAttempts: state.myAttempts,
      timeLeft: state.timeLeft,
      rematchStatus: state.rematchStatus,
      winner: state.winner,
      error: state.error,
      isValidating: state.isValidating,
      players: state.players,
      isHost: state.isHost,
    }))
  );

  // Actions don't need shallow comparison - they're stable references
  const submitWord = useGameStore((state) => state.submitWord);
  const requestRematch = useGameStore((state) => state.requestRematch);
  const startGame = useGameStore((state) => state.startGame);
  const reset = useGameStore((state) => state.reset);

  const { otherPlayers, myPlayer, isWaiting, isPlaying, isFinished } = useGameRoom(room?.id || null);

  const myName = myPlayer?.player_name || 'You';
  const winnerPlayer = players.find(p => p.id === winner);
  const didIWin = winner === playerId;
  const isDraw = winner === null && isFinished;

  // Derive rematch state from rematchStatus
  const wantsRematch = rematchStatus === 'requested';
  const opponentWantsRematch = rematchStatus === 'pending';
  const isRematchStarting = rematchStatus === 'starting';
  const showGameOver = isFinished && rematchStatus !== 'starting';

  // Delay showing rematch UI so both players can see chains first
  const [showRematchUI, setShowRematchUI] = useState(false);
  const [gameOverKey, setGameOverKey] = useState(0);
  const [prevChainLength, setPrevChainLength] = useState(myChain.length);

  // Sound effects
  const { play: playSound } = useSoundEffects();

  
  // Play sound on successful word submission
  useEffect(() => {
    if (myChain.length > prevChainLength) {
      playSound('success');
    }
    setPrevChainLength(myChain.length);
  }, [myChain.length, prevChainLength, playSound]);

  // Play sound on error
  useEffect(() => {
    if (error) {
      playSound('error');
    }
  }, [error, playSound]);

  // Play sound on game end
  useEffect(() => {
    if (showGameOver) {
      if (didIWin) {
        playSound('win');
      } else if (!isDraw) {
        playSound('lose');
      }
    }
  }, [showGameOver, didIWin, isDraw, playSound]);

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

  const handleShare = useCallback(async () => {
    // Build attempt pattern: ✅ for valid, ❌ for invalid
    const attemptIcons = myAttempts.map(a => a.valid ? '✅' : '❌').join(' ');
    const startEmoji = getWordEmoji(room?.start_word || '');
    const targetEmoji = getWordEmoji(room?.target_word || '');
    const startDisplay = startEmoji || room?.start_word.toUpperCase();
    const targetDisplay = targetEmoji || room?.target_word.toUpperCase();
    const attemptLine = `${startDisplay} → ${attemptIcons} → ${targetDisplay}`;
    const validWords = myAttempts.filter(a => a.valid).length;

    // Build opponent chain lines
    const opponentLines = otherPlayers
      .filter(p => p.chain && p.chain.length > 1)
      .map(p => `${p.player_name}: ${p.chain.join(' → ')}`)
      .join('\n');

    const shareText =
      `WordBridge Multiplayer\n` +
      `Bridged in ${validWords} word${validWords === 1 ? '' : 's'}\n\n` +
      `${attemptLine}\n` +
      (opponentLines ? `\n${opponentLines}\n` : '') +
      `\nhttps://wordbridge.danielgallab.com`;

    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
    } catch {
      // User cancelled or error - try clipboard as fallback
      try {
        await navigator.clipboard.writeText(shareText);
      } catch {
        // Clipboard not available
      }
    }
  }, [room?.start_word, room?.target_word, myChain, myAttempts, otherPlayers]);

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

  // Copy invite link handler
  const [linkCopied, setLinkCopied] = useState(false);
  const linkCopiedTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleCopyInviteLink = useCallback(async () => {
    const url = `${window.location.origin}/play/${room?.code}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, text: `Join my WordBridge game!` });
      } else {
        await navigator.clipboard.writeText(url);
        setLinkCopied(true);
        clearTimeout(linkCopiedTimeout.current);
        linkCopiedTimeout.current = setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setLinkCopied(true);
        clearTimeout(linkCopiedTimeout.current);
        linkCopiedTimeout.current = setTimeout(() => setLinkCopied(false), 2000);
      } catch {
        // Clipboard not available
      }
    }
  }, [room?.code]);

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

          {/* Copy invite link button */}
          <button
            onClick={handleCopyInviteLink}
            className="w-full py-2.5 mb-4 sm:mb-6 rounded-md border-2 border-[var(--present)] text-[var(--present)] font-bold text-sm hover:bg-[var(--present)] hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            {linkCopied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Link Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                Copy Invite Link
              </>
            ) }
          </button>

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
      <div className="space-y-4">
        {/* Your Panel - Full Size */}
        <PlayerPanel
          name={myName}
          chain={myChain}
          targetWord={room.target_word}
          isYou
          isWinner={didIWin}
          showInput={isPlaying}
          onSubmitWord={handleSubmitWord}
          isValidating={isValidating}
          error={error}
        />

        {/* Other Players Grid - Compact */}
        {otherPlayers.length > 0 && (
          <div>
            <h3 className="text-xs uppercase text-[var(--text-muted)] font-bold mb-2 px-1">
              Other Players ({otherPlayers.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {otherPlayers.map((player) => (
                <CompactPlayerPanel
                  key={player.id}
                  name={player.player_name}
                  chain={player.chain}
                  isWinner={winner === player.id}
                  showFullChain={isFinished}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Game Over Overlay - Lazy Loaded */}
      {showGameOver && (
        <Suspense fallback={<GameOverLoading />}>
          <GameOverContent
            didIWin={didIWin}
            isDraw={isDraw}
            winnerPlayer={winnerPlayer}
            pathQuality={pathQuality}
            myChain={myChain}
            otherPlayers={otherPlayers}
            winner={winner}
            room={{ start_word: room.start_word, target_word: room.target_word }}
            showRematchUI={showRematchUI}
            wantsRematch={wantsRematch}
            isRematchStarting={isRematchStarting}
            opponentWantsRematch={opponentWantsRematch}
            onShare={handleShare}
            onRequestRematch={requestRematch}
            onGoHome={handleGoHome}
          />
        </Suspense>
      )}

      </div>
  );
}
