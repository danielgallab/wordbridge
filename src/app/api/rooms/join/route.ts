import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ROOM_STATUS } from '@/lib/constants';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

// POST /api/rooms/join - Join an existing room
export const POST = withErrorHandler('rooms/join', async (request: Request) => {
  checkRateLimit(request as NextRequest, 'rooms/join', RATE_LIMITS.room);

  const { code, playerName } = await request.json();

  if (!code?.trim()) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Room code is required' });
  }

  if (!playerName?.trim()) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Player name is required' });
  }

  const supabase = createServiceClient();

  // Find the room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select(`
      *,
      room_players (*)
    `)
    .eq('code', code.toUpperCase())
    .single();

  if (roomError || !room) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Room not found' });
  }

  if (room.status !== ROOM_STATUS.WAITING) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Game already started' });
  }

  // Allow up to 8 players per room
  if (room.room_players?.length >= 8) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Room is full' });
  }

  // Check if player name already taken in room
  const nameTaken = room.room_players?.some(
    (p: { player_name: string }) => p.player_name.toLowerCase() === playerName.trim().toLowerCase()
  );
  if (nameTaken) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Name already taken in this room' });
  }

  // Add player to room
  const { data: player, error: playerError } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      player_name: playerName.trim(),
      chain: [room.start_word],
    })
    .select()
    .single();

  if (playerError) {
    throw new ApiError({
      code: 'DATABASE_ERROR',
      message: 'Failed to join room',
      detail: 'room_players insert failed',
      cause: playerError,
    });
  }

  // Refetch room with all players for proper initialization
  const { data: updatedRoom } = await supabase
    .from('rooms')
    .select(`
      *,
      room_players (*)
    `)
    .eq('id', room.id)
    .single();

  return NextResponse.json({
    room: updatedRoom || { ...room, room_players: [...(room.room_players || []), player] },
    player,
  });
});
