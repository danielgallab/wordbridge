import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ROOM_STATUS } from '@/lib/constants';
import { ApiError, withErrorHandler } from '@/lib/api-error';

// POST /api/rooms/start - Start a game (host only)
export const POST = withErrorHandler('rooms/start', async (request: Request) => {
  const { roomId, playerId } = await (request as NextRequest).json();

  if (!roomId) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Room ID is required' });
  }

  if (!playerId) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Player ID is required' });
  }

  const supabase = createServiceClient();

  // Get the room with players
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select(`
      *,
      room_players (*)
    `)
    .eq('id', roomId)
    .single();

  if (roomError || !room) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Room not found' });
  }

  if (room.status !== ROOM_STATUS.WAITING) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Game already started' });
  }

  // Check if at least 2 players are in the room
  if (!room.room_players || room.room_players.length < 2) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Need at least 2 players to start' });
  }

  // Check if requester is the host (first player to join based on created_at)
  const sortedPlayers = [...room.room_players].sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const hostId = sortedPlayers[0]?.id;

  if (playerId !== hostId) {
    throw new ApiError({ code: 'FORBIDDEN', message: 'Only the host can start the game' });
  }

  // Start the game with server timestamp
  const startedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('rooms')
    .update({
      status: ROOM_STATUS.PLAYING,
      started_at: startedAt,
    })
    .eq('id', roomId);

  if (updateError) {
    throw new ApiError({
      code: 'DATABASE_ERROR',
      message: 'Failed to start game',
      detail: 'rooms update failed',
      cause: updateError,
    });
  }

  return NextResponse.json({
    success: true,
    started_at: startedAt,
  });
});
