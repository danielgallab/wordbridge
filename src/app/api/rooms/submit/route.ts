import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// POST /api/rooms/submit - Submit a word to the chain
export async function POST(request: NextRequest) {
  const totalStart = performance.now();
  const timings: Record<string, number> = {};

  try {
    let start = performance.now();
    const { roomId, playerId, word } = await request.json();
    timings['parseRequest'] = performance.now() - start;

    if (!roomId || !playerId || !word?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    start = performance.now();
    const supabase = createServiceClient();
    timings['createSupabaseClient'] = performance.now() - start;

    // Fetch room and player in parallel
    start = performance.now();
    const [roomResult, playerResult] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).single(),
      supabase.from('room_players').select('*').eq('id', playerId).single(),
    ]);
    timings['fetchRoomAndPlayer'] = performance.now() - start;

    const { data: room, error: roomError } = roomResult;
    const { data: player, error: playerError } = playerResult;

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'playing') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const currentChain = player.chain || [];
    const lastWord = currentChain[currentChain.length - 1];
    // Basic cleanup only - AI will handle singularization
    const newWord = word.trim().toLowerCase();

    // Don't allow duplicates (check will be refined after AI normalization)
    if (currentChain.includes(newWord)) {
      return NextResponse.json({ error: 'Already used', reason: 'already_used' }, { status: 400 });
    }

    // Validate word association via our API
    start = performance.now();
    const validateRes = await fetch(new URL('/api/validate-word', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word1: lastWord, word2: newWord }),
    });

    const validateData = await validateRes.json();
    timings['validateWord'] = performance.now() - start;

    if (!validateData.isValid) {
      return NextResponse.json(
        { error: `"${newWord}" is not associated with "${lastWord}"`, reason: validateData.reason },
        { status: 400 }
      );
    }

    // Use the normalized word if AI provided one (e.g., "hands" -> "hand")
    const finalWord = validateData.normalizedWord || newWord;

    // Check if the normalized word is already in the chain
    if (currentChain.includes(finalWord)) {
      return NextResponse.json({ error: 'Already used', reason: 'already_used' }, { status: 400 });
    }

    // Add word to chain
    const newChain = [...currentChain, finalWord];
    const isWinner = finalWord === room.target_word.toLowerCase();

    const updateData: Record<string, unknown> = { chain: newChain };
    if (isWinner) {
      updateData.finished_at = new Date().toISOString();
      updateData.is_winner = true;
    }

    start = performance.now();
    const { error: updateError } = await supabase
      .from('room_players')
      .update(updateData)
      .eq('id', playerId);
    timings['updatePlayerChain'] = performance.now() - start;

    if (updateError) {
      console.error('Update chain error:', updateError);
      return NextResponse.json({ error: 'Failed to update chain' }, { status: 500 });
    }

    // If winner, update room
    if (isWinner) {
      start = performance.now();
      await supabase
        .from('rooms')
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
          winner_id: playerId,
        })
        .eq('id', roomId);
      timings['updateRoomWinner'] = performance.now() - start;
    }

    timings['total'] = performance.now() - totalStart;
    console.log(`[Submit Word] "${newWord}" | Timings (ms):`, JSON.stringify(timings, null, 0));

    return NextResponse.json({
      success: true,
      chain: newChain,
      isWinner,
    });
  } catch (error) {
    console.error('Submit word error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
