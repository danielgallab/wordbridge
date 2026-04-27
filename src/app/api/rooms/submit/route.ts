import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ROOM_STATUS } from '@/lib/constants';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { debug, monitor } from '@/lib/debug';

interface RoomPlayerRecord {
  id: string;
  room_id: string;
  player_name: string;
  chain: string[] | null;
  finished_at: string | null;
  is_winner: boolean;
  wants_rematch: boolean;
}

// POST /api/rooms/submit - Submit a word to the chain
export const POST = withErrorHandler('rooms/submit', async (request: Request) => {
  checkRateLimit(request as NextRequest, 'rooms/submit', RATE_LIMITS.submit);

  const { roomId, playerId, word } = await request.json();

  if (!roomId || !playerId || !word?.trim()) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Missing required fields' });
  }

  const supabase = createServiceClient();

  // Fetch room, player, and all players in parallel
  const fetchStart = performance.now();
  const [roomResult, playerResult, allPlayersResult] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).single(),
    supabase.from('room_players').select('*').eq('id', playerId).single(),
    supabase.from('room_players').select('*').eq('room_id', roomId),
  ]);
  monitor.trackLatency('rooms/submit:fetch', performance.now() - fetchStart);

  const { data: room, error: roomError } = roomResult;
  const { data: player, error: playerError } = playerResult;
  const { data: allPlayers } = allPlayersResult;

  if (roomError || !room) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Room not found' });
  }

  if (room.status !== ROOM_STATUS.PLAYING) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Game is not active' });
  }

  if (playerError || !player) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Player not found' });
  }

  const currentChain = player.chain || [];
  const lastWord = currentChain[currentChain.length - 1];
  const newWord = word.trim().toLowerCase();

  // Don't allow duplicates
  if (currentChain.includes(newWord)) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Already used', reason: 'already_used' });
  }

  // Validate word association via our API
  const validateStart = performance.now();
  const validateRes = await fetch(new URL('/api/validate-word', (request as NextRequest).url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word1: lastWord, word2: newWord }),
  });

  const validateData = await validateRes.json();
  monitor.trackLatency('rooms/submit:validate', performance.now() - validateStart);

  if (!validateData.isValid) {
    throw new ApiError({
      code: 'BAD_REQUEST',
      message: `"${newWord}" is not associated with "${lastWord}"`,
      reason: validateData.reason,
    });
  }

  // Use the normalized word if AI provided one
  const finalWord = validateData.normalizedWord || newWord;

  // Check if the normalized word is already in the chain
  if (currentChain.includes(finalWord)) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Already used', reason: 'already_used' });
  }

  // Add word to chain
  const newChain = [...currentChain, finalWord];
  const reachedTarget = finalWord === room.target_word.toLowerCase();
  const isShortestMode = room.game_mode === 'shortest';

  const updateData: Record<string, unknown> = { chain: newChain };

  // In speed mode, reaching target means immediate win
  // In shortest mode, reaching target marks player as finished but doesn't end the game
  if (reachedTarget) {
    updateData.finished_at = new Date().toISOString();
    // Only mark as winner immediately in speed mode
    if (!isShortestMode) {
      updateData.is_winner = true;
    }
  }

  const { error: updateError } = await supabase
    .from('room_players')
    .update(updateData)
    .eq('id', playerId);

  if (updateError) {
    throw new ApiError({
      code: 'DATABASE_ERROR',
      message: 'Failed to update chain',
      detail: 'room_players update failed',
      cause: updateError,
    });
  }

  // Handle game end logic based on mode
  if (reachedTarget && !isShortestMode) {
    // Speed mode: First to finish wins immediately
    const { error: roomUpdateError } = await supabase
      .from('rooms')
      .update({
        status: ROOM_STATUS.FINISHED,
        finished_at: new Date().toISOString(),
        winner_id: playerId,
      })
      .eq('id', roomId);

    if (roomUpdateError) {
      debug.api.error('Failed to update room winner:', roomUpdateError);
    }
  } else if (reachedTarget && isShortestMode) {
    // Shortest mode: Check if all players have finished
    // Refresh player data after our update
    const { data: updatedPlayers } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId);

    const typedPlayers = updatedPlayers as RoomPlayerRecord[] | null;
    const allFinished = typedPlayers?.every((p: RoomPlayerRecord) => p.finished_at !== null);

    if (allFinished && typedPlayers) {
      // All players finished - determine winner by shortest chain
      const finishedPlayers = typedPlayers.filter((p: RoomPlayerRecord) => p.finished_at !== null);
      const sortedByChainLength = finishedPlayers.sort(
        (a: RoomPlayerRecord, b: RoomPlayerRecord) => (a.chain?.length || Infinity) - (b.chain?.length || Infinity)
      );

      const shortestLength = sortedByChainLength[0]?.chain?.length;
      const winners = sortedByChainLength.filter((p: RoomPlayerRecord) => p.chain?.length === shortestLength);

      // If there's a tie, the first to finish among tied players wins
      const tiebreaker = winners.sort(
        (a: RoomPlayerRecord, b: RoomPlayerRecord) => new Date(a.finished_at!).getTime() - new Date(b.finished_at!).getTime()
      );
      const winnerId = tiebreaker[0]?.id;

      // Mark the winner
      if (winnerId) {
        await supabase
          .from('room_players')
          .update({ is_winner: true })
          .eq('id', winnerId);
      }

      // End the game
      const { error: roomUpdateError } = await supabase
        .from('rooms')
        .update({
          status: ROOM_STATUS.FINISHED,
          finished_at: new Date().toISOString(),
          winner_id: winnerId || null,
        })
        .eq('id', roomId);

      if (roomUpdateError) {
        debug.api.error('Failed to update room for shortest mode:', roomUpdateError);
      }
    }
  }

  return NextResponse.json({
    success: true,
    chain: newChain,
    reachedTarget,
    isWinner: reachedTarget && !isShortestMode, // Only immediate winner in speed mode
  });
});
