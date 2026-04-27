import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ROOM_STATUS } from '@/lib/constants';
import { ApiError, withErrorHandler } from '@/lib/api-error';

interface RoomPlayerRecord {
  id: string;
  room_id: string;
  player_name: string;
  chain: string[] | null;
  finished_at: string | null;
  is_winner: boolean;
}

// POST /api/rooms/end - End a game (called when time runs out)
export const POST = withErrorHandler('rooms/end', async (request: Request) => {
  const { roomId } = await (request as NextRequest).json();

  if (!roomId) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Room ID is required' });
  }

  const supabase = createServiceClient();

  // Fetch room and players to determine winner in shortest mode
  const [roomResult, playersResult] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).single(),
    supabase.from('room_players').select('*').eq('room_id', roomId),
  ]);

  const { data: room, error: roomError } = roomResult;
  const { data: players } = playersResult;

  if (roomError || !room) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Room not found' });
  }

  // Don't update if game already finished
  if (room.status !== ROOM_STATUS.PLAYING) {
    return NextResponse.json({ success: true, alreadyFinished: true });
  }

  let winnerId: string | null = null;

  // In shortest mode, determine winner based on who reached target with shortest chain
  const typedPlayers = players as RoomPlayerRecord[] | null;
  if (room.game_mode === 'shortest' && typedPlayers && typedPlayers.length > 0) {
    // Filter players who reached the target (have finished_at set)
    const finishedPlayers = typedPlayers.filter((p: RoomPlayerRecord) => p.finished_at !== null);

    if (finishedPlayers.length > 0) {
      // Sort by chain length, then by finish time
      const sorted = finishedPlayers.sort((a: RoomPlayerRecord, b: RoomPlayerRecord) => {
        const lengthDiff = (a.chain?.length || Infinity) - (b.chain?.length || Infinity);
        if (lengthDiff !== 0) return lengthDiff;
        return new Date(a.finished_at!).getTime() - new Date(b.finished_at!).getTime();
      });
      winnerId = sorted[0]?.id || null;

      // Mark the winner
      if (winnerId) {
        await supabase
          .from('room_players')
          .update({ is_winner: true })
          .eq('id', winnerId);
      }
    }
    // If no one finished in shortest mode, it's a draw (winnerId stays null)
  }
  // In speed mode, if time runs out with no winner, it's a draw (winnerId stays null)

  // Update room to finished
  const { error } = await supabase
    .from('rooms')
    .update({
      status: ROOM_STATUS.FINISHED,
      finished_at: new Date().toISOString(),
      winner_id: winnerId,
    })
    .eq('id', roomId)
    .eq('status', ROOM_STATUS.PLAYING); // Only update if still playing

  if (error) {
    throw new ApiError({
      code: 'DATABASE_ERROR',
      message: 'Failed to end game',
      detail: 'rooms update failed',
      cause: error,
    });
  }

  return NextResponse.json({ success: true, winnerId });
});
