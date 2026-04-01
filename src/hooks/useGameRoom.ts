'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useGameStore } from '@/stores/gameStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useGameRoom(roomId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    room,
    playerId,
    players,
    isGameOver,
    setRoom,
    setPlayers,
    updatePlayer,
    endGame,
    tick,
    setRematchState,
    resetForRematch,
  } = useGameStore();

  // Subscribe to room changes
  useEffect(() => {
    if (!roomId) return;

    const supabase = createClient();

    // Subscribe to room_players changes
    channelRef.current = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as {
              id: string;
              chain: string[];
              is_winner: boolean;
              wants_rematch: boolean;
            };
            updatePlayer(updated.id, {
              chain: updated.chain,
              is_winner: updated.is_winner,
              wants_rematch: updated.wants_rematch,
            });

            // Check if someone won - but only if the game is still in progress
            // This prevents stale is_winner updates from triggering endGame after a rematch
            const currentRoom = useGameStore.getState().room;
            const currentIsGameOver = useGameStore.getState().isGameOver;
            const currentPlayers = useGameStore.getState().players;
            const rematchInProgress = useGameStore.getState().rematchInProgress;
            const playerBeforeUpdate = currentPlayers.find(p => p.id === updated.id);

            // Only trigger endGame if:
            // 1. is_winner changed from false to true (not already true from previous game)
            // 2. Game is not already over locally
            // 3. Room status is 'playing'
            // 4. Not currently in a rematch transition (ignore stale updates)
            const wasAlreadyWinner = playerBeforeUpdate?.is_winner === true;
            if (updated.is_winner && !wasAlreadyWinner && !currentIsGameOver && currentRoom?.status === 'playing' && !rematchInProgress) {
              endGame(updated.id);
            }

            // Update rematch state
            const playersForRematch = useGameStore.getState().players;
            const me = playersForRematch.find(p => p.id === useGameStore.getState().playerId);
            const opponent = playersForRematch.find(p => p.id !== useGameStore.getState().playerId);

            // If the updated player is opponent, use the new value
            const myRematch = updated.id === useGameStore.getState().playerId
              ? updated.wants_rematch
              : (me?.wants_rematch || false);
            const oppRematch = updated.id !== useGameStore.getState().playerId
              ? updated.wants_rematch
              : (opponent?.wants_rematch || false);

            setRematchState(myRematch, oppRematch);
          } else if (payload.eventType === 'INSERT') {
            // New player joined - refetch all players and room (room status may have changed to 'playing')
            fetchPlayers();
            fetchRoom();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const prevRoom = useGameStore.getState().room;
          const updated = payload.new as {
            id: string;
            code: string;
            status: 'waiting' | 'playing' | 'finished';
            start_word: string;
            target_word: string;
            time_limit: number;
            winner_id: string | null;
          };

          // Handle rematch - room status changed to playing with new words
          // Check BEFORE updating room state so prevRoom comparison works
          if (updated.status === 'playing' && prevRoom?.status === 'finished') {
            resetForRematch(updated.start_word, updated.target_word);
            // Also refetch players to get their reset state
            fetchPlayers();
          }

          setRoom(updated);

          if (updated.status === 'finished') {
            endGame(updated.winner_id);
          }
        }
      )
      .subscribe();

    // Fetch initial players
    fetchPlayers();

    async function fetchPlayers() {
      const { data } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId);

      if (data) {
        setPlayers(data);
      }
    }

    async function fetchRoom() {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (data) {
        setRoom(data);
      }
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, setRoom, setPlayers, updatePlayer, endGame, setRematchState, resetForRematch]);

  // Game timer
  useEffect(() => {
    if (!room || room.status !== 'playing' || isGameOver) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      tick();
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [room?.status, isGameOver, tick]);

  const getOpponent = useCallback(() => {
    return players.find(p => p.id !== playerId);
  }, [players, playerId]);

  return {
    room,
    players,
    opponent: getOpponent(),
    isWaiting: room?.status === 'waiting',
    isPlaying: room?.status === 'playing',
    isFinished: room?.status === 'finished' || isGameOver,
  };
}
