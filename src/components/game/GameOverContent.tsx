'use client';

import { Upload, Trophy, Skull, Handshake } from 'lucide-react';
import { useState } from 'react';

interface Player {
  id: string;
  player_name: string;
  chain: string[];
  is_winner: boolean;
}

interface PathQuality {
  emoji: string;
  description: string;
}

interface GameOverContentProps {
  didIWin: boolean;
  isDraw: boolean;
  winnerPlayer: Player | undefined;
  pathQuality: PathQuality | null;
  myChain: string[];
  otherPlayers: Player[];
  winner: string | null;
  room: {
    start_word: string;
    target_word: string;
    game_mode?: 'speed' | 'shortest';
  };
  showRematchUI: boolean;
  wantsRematch: boolean;
  isRematchStarting: boolean;
  opponentWantsRematch: boolean;
  onShare: () => Promise<void>;
  onRequestRematch: () => void;
  onGoHome: () => void;
}

export function GameOverContent({
  didIWin,
  isDraw,
  winnerPlayer,
  pathQuality,
  myChain,
  otherPlayers,
  winner,
  room,
  showRematchUI,
  wantsRematch,
  isRematchStarting,
  opponentWantsRematch,
  onShare,
  onRequestRematch,
  onGoHome,
}: GameOverContentProps) {
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
  const isShortestMode = room.game_mode === 'shortest';

  // Get winner's chain length for display
  const winnerChainLength = winnerPlayer?.chain ? winnerPlayer.chain.length - 1 : 0;

  const handleShare = async () => {
    try {
      await onShare();
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch {
      // Error handled in parent
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background)] border-2 border-[var(--border)] rounded-xl p-4 sm:p-8 text-center max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="text-4xl sm:text-5xl mb-3 sm:mb-4 flex justify-center">
          {didIWin ? (
            <Trophy className="w-12 h-12 sm:w-14 sm:h-14 text-[var(--correct)]" />
          ) : isDraw ? (
            <Handshake className="w-12 h-12 sm:w-14 sm:h-14 text-[var(--present)]" />
          ) : (
            <Skull className="w-12 h-12 sm:w-14 sm:h-14 text-[var(--error)]" />
          )}
        </div>
        <h2
          className={`text-xl sm:text-2xl font-bold mb-2 ${
            didIWin
              ? 'text-[var(--correct)]'
              : isDraw
              ? 'text-[var(--present)]'
              : 'text-[var(--error)]'
          }`}
        >
          {didIWin ? 'You Win!' : isDraw ? 'Draw!' : `${winnerPlayer?.player_name || 'Someone'} Wins!`}
        </h2>

        {/* Shortest mode: Show winning chain length */}
        {isShortestMode && winnerPlayer && !isDraw && (
          <p className="text-sm text-[var(--text-muted)] mb-2">
            Shortest path: {winnerChainLength} {winnerChainLength === 1 ? 'step' : 'steps'}
          </p>
        )}

        {/* Path quality rating */}
        {pathQuality && didIWin && (
          <div className="mb-3">
            <span className="text-2xl">{pathQuality.emoji}</span>
            <p className="text-sm text-[var(--text-muted)]">{pathQuality.description}</p>
          </div>
        )}

        {/* Share button */}
        <button
          onClick={handleShare}
          className="w-full py-2 rounded-md bg-[var(--correct)] text-white font-bold hover:opacity-90 transition-opacity mb-4 flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {shareStatus === 'copied' ? 'Copied!' : 'Share Result'}
        </button>

        {/* All players chain comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {/* Your chain first */}
          {myChain.length > 1 && (
            <div className={`bg-[var(--surface)] rounded-lg p-2 sm:p-3 text-left ${didIWin ? 'border-2 border-[var(--correct)]' : ''}`}>
              <div className="text-xs uppercase text-[var(--text-muted)] mb-1 font-bold flex items-center justify-between">
                <span>You ({myChain.length - 1} steps)</span>
                {didIWin && <Trophy className="w-3 h-3 text-[var(--correct)]" />}
              </div>
              <div className="font-mono text-xs text-[var(--present)] break-words">
                {myChain.join(' → ')}
              </div>
            </div>
          )}

          {/* Other players chains */}
          {otherPlayers.map((player) => {
            const playerChain = player.chain;
            if (!playerChain || playerChain.length <= 1) return null;
            const isPlayerWinner = winner === player.id;

            return (
              <div
                key={player.id}
                className={`bg-[var(--surface)] rounded-lg p-2 sm:p-3 text-left ${isPlayerWinner ? 'border-2 border-[var(--correct)]' : ''}`}
              >
                <div className="text-xs uppercase text-[var(--text-muted)] mb-1 font-bold flex items-center justify-between">
                  <span>{player.player_name} ({playerChain.length - 1} steps)</span>
                  {isPlayerWinner && <Trophy className="w-3 h-3 text-[var(--correct)]" />}
                </div>
                <div className="font-mono text-xs text-[var(--text-muted)] break-words">
                  {playerChain.join(' → ')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rematch UI - delayed appearance */}
        {showRematchUI && (
          <>
            {wantsRematch || isRematchStarting ? (
              <div className="w-full py-3 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold mb-3 flex items-center justify-center gap-2">
                {isRematchStarting ? (
                  <>Starting rematch...</>
                ) : (
                  <>
                    Waiting for other players
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
                onClick={onRequestRematch}
                className="w-full py-3 rounded-md bg-[var(--correct)] text-white font-bold hover:opacity-90 transition-opacity mb-3"
              >
                {opponentWantsRematch ? 'Others want a rematch!' : 'Play Again'}
              </button>
            )}
          </>
        )}

        <button
          onClick={onGoHome}
          className="w-full py-3 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold hover:opacity-90 transition-opacity"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
