'use client';

import { useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useGameStore } from '@/stores/gameStore';
import { debug } from '@/lib/debug';
import { ROOM_STATUS, type RoomStatus } from '@/lib/constants';
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
    setGameStartedAt,
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
          debug.useGameRoom.log('room_players realtime event', {
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

            debug.useGameRoom.log('Checking if should endGame from room_players update', {
              updatedPlayerId: updated.id,
              updatedIsWinner: updated.is_winner,
              wasAlreadyWinner,
              rematchStatus: currentRematchStatus,
              roomStatus: currentRoom?.status,
              willTriggerEndGame: updated.is_winner && !wasAlreadyWinner && currentRoom?.status === ROOM_STATUS.PLAYING && currentRematchStatus !== 'starting',
            });

            if (updated.is_winner && !wasAlreadyWinner && currentRoom?.status === ROOM_STATUS.PLAYING && currentRematchStatus !== 'starting') {
              debug.useGameRoom.log('TRIGGERING endGame from room_players update');
              endGame(updated.id);
            }

            // Update rematch state - check if opponent wants rematch
            const isOpponentUpdate = updated.id !== useGameStore.getState().playerId;
            if (isOpponentUpdate && updated.wants_rematch) {
              setOpponentWantsRematch(true);
            }
          } else if (payload.eventType === 'INSERT') {
            // New player joined - refetch all players and room (room status may have changed to 'playing')
            debug.useGameRoom.log('New player joined, fetching players and room');
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
            status: RoomStatus;
            start_word: string;
            target_word: string;
            time_limit: number;
            winner_id: string | null;
            started_at: string | null;
          };

          debug.useGameRoom.log('rooms realtime event', {
            prevStatus: prevRoom?.status,
            newStatus: updated.status,
            prevStartWord: prevRoom?.start_word,
            newStartWord: updated.start_word,
            prevWinnerId: prevRoom?.winner_id,
            newWinnerId: updated.winner_id,
            startedAt: updated.started_at,
            rematchStatus: currentRematchStatus,
          });

          // Handle game start - sync timer with server timestamp
          const isGameStarting = updated.status === ROOM_STATUS.PLAYING && prevRoom?.status === ROOM_STATUS.WAITING;
          if (isGameStarting && updated.started_at) {
            debug.useGameRoom.log('Game starting - syncing timer with server timestamp', {
              startedAt: updated.started_at,
            });
            setGameStartedAt(updated.started_at);
          }

          // Handle rematch - detect when a new game starts
          // This can happen in two ways:
          // 1. Room status changes from 'finished' to 'playing' (normal flow)
          // 2. Room status stays 'playing' but start_word changes (race condition where rematch
          //    processes before the game-end notification reaches the server)
          const isRematchFromFinished = updated.status === ROOM_STATUS.PLAYING && prevRoom?.status === ROOM_STATUS.FINISHED;
          const isRematchFromWordChange = updated.status === ROOM_STATUS.PLAYING &&
            prevRoom?.status === ROOM_STATUS.PLAYING &&
            prevRoom?.start_word !== updated.start_word;

          if (isRematchFromFinished || isRematchFromWordChange) {
            debug.useGameRoom.log('Detected rematch - calling resetForRematch and fetchPlayers', {
              isRematchFromFinished,
              isRematchFromWordChange,
              prevStartWord: prevRoom?.start_word,
              newStartWord: updated.start_word,
            });
            resetForRematch(updated.start_word);
            // Sync timer for rematch as well
            if (updated.started_at) {
              setGameStartedAt(updated.started_at);
            }
            // Also refetch players to get their reset state
            fetchPlayers();
          }

          setRoom(updated);

          // Only trigger endGame if:
          // 1. Room status is 'finished'
          // 2. Previous room status was 'playing' (prevent duplicate calls)
          // 3. Not in a rematch transition (ignore stale updates)
          debug.useGameRoom.log('Checking if should endGame from rooms update', {
            status: updated.status,
            prevStatus: prevRoom?.status,
            rematchStatus: currentRematchStatus,
            willTriggerEndGame: updated.status === ROOM_STATUS.FINISHED && prevRoom?.status === ROOM_STATUS.PLAYING && currentRematchStatus !== 'starting',
          });

          if (updated.status === ROOM_STATUS.FINISHED && prevRoom?.status === ROOM_STATUS.PLAYING && currentRematchStatus !== 'starting') {
            debug.useGameRoom.log('TRIGGERING endGame from rooms update');
            endGame(updated.winner_id);
          }
        }
      )
      .subscribe();

    // Fetch initial players
    fetchPlayers();

    async function fetchPlayers() {
      debug.useGameRoom.log('fetchPlayers - Fetching players for room:', roomId);
      const { data, error } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId);

      if (error) {
        debug.useGameRoom.error('fetchPlayers - Error fetching players:', error);
        return;
      }

      if (data) {
        debug.useGameRoom.log('fetchPlayers - Got players:', data.map(p => ({
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
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) {
        debug.useGameRoom.error('fetchRoom - Error fetching room:', error);
        return;
      }

      if (data) {
        setRoom(data);
      }
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, setRoom, setPlayers, updatePlayer, endGame, setOpponentWantsRematch, resetForRematch, setGameStartedAt]);

  // Game timer - runs when room.status is 'playing' and not in rematch transition
  useEffect(() => {
    // Always clear any existing interval first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!room || room.status !== ROOM_STATUS.PLAYING || rematchStatus === 'starting') {
      return;
    }

    timerRef.current = setInterval(() => {
      tick();
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- room object reference changes frequently, we only want to react to status changes
  }, [room?.status, rematchStatus, tick]);

  // Memoize derived values to prevent unnecessary re-renders
  const otherPlayers = useMemo(() => {
    return players.filter(p => p.id !== playerId);
  }, [players, playerId]);

  const myPlayer = useMemo(() => {
    return players.find(p => p.id === playerId);
  }, [players, playerId]);

  const isWaiting = room?.status === ROOM_STATUS.WAITING;
  const isPlaying = room?.status === ROOM_STATUS.PLAYING && rematchStatus !== 'starting' && !localGameEnded;
  const isFinished = room?.status === ROOM_STATUS.FINISHED || localGameEnded;

  return {
    room,
    players,
    otherPlayers,
    myPlayer,
    isWaiting,
    isPlaying,
    isFinished,
  };
}
