import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { RoomPlayer } from '@/types';
import { generateWordPair } from '@/lib/wordPairs';
import { ROOM_STATUS } from '@/lib/constants';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { debug } from '@/lib/debug';

// POST /api/rooms/rematch - Request a rematch
export const POST = withErrorHandler('rooms/rematch', async (request: Request) => {
  const { roomId, playerId } = await (request as NextRequest).json();

  if (!roomId || !playerId) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Room ID and Player ID are required' });
  }

  const supabase = createServiceClient();

  // Mark this player as wanting a rematch
  const { error: updateError } = await supabase
    .from('room_players')
    .update({ wants_rematch: true })
    .eq('id', playerId)
    .eq('room_id', roomId);

  if (updateError) {
    throw new ApiError({
      code: 'DATABASE_ERROR',
      message: 'Failed to request rematch',
      detail: 'room_players update failed',
      cause: updateError,
    });
  }

  // Check if both players want a rematch
  const { data: players, error: playersError } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId);

  if (playersError || !players) {
    throw new ApiError({
      code: 'DATABASE_ERROR',
      message: 'Failed to check players',
      detail: 'room_players select failed',
      cause: playersError,
    });
  }

  debug.api.log('[rematch] Players state', {
    playerCount: players.length,
    players: players.map((p: RoomPlayer) => ({
      id: p.id,
      wants_rematch: p.wants_rematch,
      is_winner: p.is_winner,
    })),
  });

  const allWantRematch = players.length >= 2 && players.every((p: RoomPlayer) => p.wants_rematch);

  if (allWantRematch) {
    debug.api.log('[rematch] Both players want rematch - starting new game');

    // Generate a fresh random word pair
    let randomPair;
    try {
      randomPair = await generateWordPair(supabase, 'medium');
    } catch (err) {
      throw new ApiError({
        code: 'UPSTREAM_ERROR',
        message: 'Failed to generate new word pair — please try again',
        detail: 'Word pair generation failed for rematch',
        cause: err,
      });
    }

    // Reset players FIRST before changing room status
    for (const player of players) {
      const { error: playerResetError } = await supabase
        .from('room_players')
        .update({
          chain: [randomPair.start_word],
          is_winner: false,
          wants_rematch: false,
          finished_at: null,
        })
        .eq('id', player.id);

      if (playerResetError) {
        debug.api.error('[rematch] Player reset error:', playerResetError);
      }
    }

    // Now reset the room for a new game
    const { error: roomError } = await supabase
      .from('rooms')
      .update({
        status: ROOM_STATUS.PLAYING,
        start_word: randomPair.start_word,
        target_word: randomPair.target_word,
        winner_id: null,
        started_at: new Date().toISOString(),
        finished_at: null,
      })
      .eq('id', roomId);

    if (roomError) {
      throw new ApiError({
        code: 'DATABASE_ERROR',
        message: 'Failed to start rematch',
        detail: 'rooms update failed',
        cause: roomError,
      });
    }

    debug.api.log('[rematch] Rematch started successfully');
    return NextResponse.json({
      rematchStarted: true,
      startWord: randomPair.start_word,
      targetWord: randomPair.target_word,
    });
  }

  debug.api.log('[rematch] Waiting for opponent');
  return NextResponse.json({
    rematchStarted: false,
    waitingForOpponent: true,
  });
});
