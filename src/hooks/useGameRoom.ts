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
    rematchStatus,
    localGameEnded,
    setRoom,
    setPlayers,
    updatePlayer,
    endGame,
    tick,
    setOpponentWantsRematch,
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
          console.log('[useGameRoom] room_players realtime event', {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });

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
            const currentRematchStatus = useGameStore.getState().rematchStatus;
            const currentPlayers = useGameStore.getState().players;
            const playerBeforeUpdate = currentPlayers.find(p => p.id === updated.id);

            // Only trigger endGame if:
            // 1. is_winner changed from false to true (not already true from previous game)
            // 2. Room status is 'playing'
            // 3. Not currently in a rematch transition (ignore stale updates)
            const wasAlreadyWinner = playerBeforeUpdate?.is_winner === true;

            console.log('[useGameRoom] Checking if should endGame from room_players update', {
              updatedPlayerId: updated.id,
              updatedIsWinner: updated.is_winner,
              wasAlreadyWinner,
              rematchStatus: currentRematchStatus,
              roomStatus: currentRoom?.status,
              willTriggerEndGame: updated.is_winner && !wasAlreadyWinner && currentRoom?.status === 'playing' && currentRematchStatus !== 'starting',
            });

            if (updated.is_winner && !wasAlreadyWinner && currentRoom?.status === 'playing' && currentRematchStatus !== 'starting') {
              console.log('[useGameRoom] TRIGGERING endGame from room_players update');
              endGame(updated.id);
            }

            // Update rematch state - check if opponent wants rematch
            const isOpponentUpdate = updated.id !== useGameStore.getState().playerId;
            if (isOpponentUpdate && updated.wants_rematch) {
              setOpponentWantsRematch(true);
            }
          } else if (payload.eventType === 'INSERT') {
            // New player joined - refetch all players and room (room status may have changed to 'playing')
            console.log('[useGameRoom] New player joined, fetching players and room');
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
          const currentRematchStatus = useGameStore.getState().rematchStatus;
          const updated = payload.new as {
            id: string;
            code: string;
            status: 'waiting' | 'playing' | 'finished';
            start_word: string;
            target_word: string;
            time_limit: number;
            winner_id: string | null;
          };

          console.log('[useGameRoom] rooms realtime event', {
            prevStatus: prevRoom?.status,
            newStatus: updated.status,
            prevStartWord: prevRoom?.start_word,
            newStartWord: updated.start_word,
            prevWinnerId: prevRoom?.winner_id,
            newWinnerId: updated.winner_id,
            rematchStatus: currentRematchStatus,
          });

          // Handle rematch - detect when a new game starts
          // This can happen in two ways:
          // 1. Room status changes from 'finished' to 'playing' (normal flow)
          // 2. Room status stays 'playing' but start_word changes (race condition where rematch
          //    processes before the game-end notification reaches the server)
          const isRematchFromFinished = updated.status === 'playing' && prevRoom?.status === 'finished';
          const isRematchFromWordChange = updated.status === 'playing' &&
            prevRoom?.status === 'playing' &&
            prevRoom?.start_word !== updated.start_word;

          if (isRematchFromFinished || isRematchFromWordChange) {
            console.log('[useGameRoom] Detected rematch - calling resetForRematch and fetchPlayers', {
              isRematchFromFinished,
              isRematchFromWordChange,
              prevStartWord: prevRoom?.start_word,
              newStartWord: updated.start_word,
            });
            resetForRematch(updated.start_word);
            // Also refetch players to get their reset state
            fetchPlayers();
          }

          setRoom(updated);

          // Only trigger endGame if:
          // 1. Room status is 'finished'
          // 2. Previous room status was 'playing' (prevent duplicate calls)
          // 3. Not in a rematch transition (ignore stale updates)
          console.log('[useGameRoom] Checking if should endGame from rooms update', {
            status: updated.status,
            prevStatus: prevRoom?.status,
            rematchStatus: currentRematchStatus,
            willTriggerEndGame: updated.status === 'finished' && prevRoom?.status === 'playing' && currentRematchStatus !== 'starting',
          });

          if (updated.status === 'finished' && prevRoom?.status === 'playing' && currentRematchStatus !== 'starting') {
            console.log('[useGameRoom] TRIGGERING endGame from rooms update');
            endGame(updated.winner_id);
          }
        }
      )
      .subscribe();

    // Fetch initial players
    fetchPlayers();

    async function fetchPlayers() {
      console.log('[useGameRoom.fetchPlayers] Fetching players for room:', roomId);
      const { data } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId);

      if (data) {
        console.log('[useGameRoom.fetchPlayers] Got players:', data.map(p => ({
          id: p.id,
          is_winner: p.is_winner,
          wants_rematch: p.wants_rematch,
          chainLength: p.chain?.length,
          chainStart: p.chain?.[0],
        })));
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
  }, [roomId, setRoom, setPlayers, updatePlayer, endGame, setOpponentWantsRematch, resetForRematch]);

  // Game timer - runs when room.status is 'playing' and not in rematch transition
  useEffect(() => {
    if (!room || room.status !== 'playing' || rematchStatus === 'starting') {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- room object reference changes frequently, we only want to react to status changes
  }, [room?.status, rematchStatus, tick]);

  const getOpponent = useCallback(() => {
    return players.find(p => p.id !== playerId);
  }, [players, playerId]);

  return {
    room,
    players,
    opponent: getOpponent(),
    isWaiting: room?.status === 'waiting',
    isPlaying: room?.status === 'playing' && rematchStatus !== 'starting' && !localGameEnded,
    isFinished: room?.status === 'finished' || localGameEnded,
  };
}
