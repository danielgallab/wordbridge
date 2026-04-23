import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ROOM_STATUS } from '@/lib/constants';
import { ApiError, withErrorHandler } from '@/lib/api-error';

// POST /api/rooms/end - End a game (called when time runs out)
export const POST = withErrorHandler('rooms/end', async (request: Request) => {
  const { roomId } = await (request as NextRequest).json();

  if (!roomId) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Room ID is required' });
  }

  const supabase = createServiceClient();

  // Only update if the room is still in 'playing' status (prevent race conditions)
  const { error } = await supabase
    .from('rooms')
    .update({
      status: ROOM_STATUS.FINISHED,
      finished_at: new Date().toISOString(),
      winner_id: null, // Draw - no winner
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

  return NextResponse.json({ success: true });
});
