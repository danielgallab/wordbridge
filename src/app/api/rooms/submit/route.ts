import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ROOM_STATUS } from '@/lib/constants';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { debug, monitor } from '@/lib/debug';

// POST /api/rooms/submit - Submit a word to the chain
export const POST = withErrorHandler('rooms/submit', async (request: Request) => {
  checkRateLimit(request as NextRequest, 'rooms/submit', RATE_LIMITS.submit);

  const { roomId, playerId, word } = await request.json();

  if (!roomId || !playerId || !word?.trim()) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Missing required fields' });
  }

  const supabase = createServiceClient();

  // Fetch room and player in parallel
  const fetchStart = performance.now();
  const [roomResult, playerResult] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).single(),
    supabase.from('room_players').select('*').eq('id', playerId).single(),
  ]);
  monitor.trackLatency('rooms/submit:fetch', performance.now() - fetchStart);

  const { data: room, error: roomError } = roomResult;
  const { data: player, error: playerError } = playerResult;

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
  const isWinner = finalWord === room.target_word.toLowerCase();

  const updateData: Record<string, unknown> = { chain: newChain };
  if (isWinner) {
    updateData.finished_at = new Date().toISOString();
    updateData.is_winner = true;
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

  // If winner, update room
  if (isWinner) {
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
  }

  return NextResponse.json({
    success: true,
    chain: newChain,
    isWinner,
  });
});
