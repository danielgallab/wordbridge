import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// POST /api/rooms/rematch - Request a rematch
export async function POST(request: NextRequest) {
  try {
    const { roomId, playerId } = await request.json();

    if (!roomId || !playerId) {
      return NextResponse.json({ error: 'Room ID and Player ID are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Mark this player as wanting a rematch
    const { error: updateError } = await supabase
      .from('room_players')
      .update({ wants_rematch: true })
      .eq('id', playerId)
      .eq('room_id', roomId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to request rematch' }, { status: 500 });
    }

    // Check if both players want a rematch
    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId);

    if (playersError || !players) {
      return NextResponse.json({ error: 'Failed to check players' }, { status: 500 });
    }

    const allWantRematch = players.length === 2 && players.every(p => p.wants_rematch);

    if (allWantRematch) {
      // Get a new random word pair
      const { data: wordPairs, error: pairError } = await supabase
        .from('word_pairs')
        .select('*')
        .limit(10);

      if (pairError || !wordPairs?.length) {
        return NextResponse.json({ error: 'No word pairs available' }, { status: 500 });
      }

      const randomPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];

      // IMPORTANT: Reset players FIRST before changing room status
      // This prevents race conditions where the room status changes to 'playing'
      // but players still have is_winner: true from the previous game
      for (const player of players) {
        await supabase
          .from('room_players')
          .update({
            chain: [randomPair.start_word],
            is_winner: false,
            wants_rematch: false,
            finished_at: null,
          })
          .eq('id', player.id);
      }

      // Now reset the room for a new game (after players are reset)
      const { error: roomError } = await supabase
        .from('rooms')
        .update({
          status: 'playing',
          start_word: randomPair.start_word,
          target_word: randomPair.target_word,
          winner_id: null,
          started_at: new Date().toISOString(),
          finished_at: null,
        })
        .eq('id', roomId);

      if (roomError) {
        console.error('Room reset error:', roomError);
        return NextResponse.json({ error: 'Failed to start rematch' }, { status: 500 });
      }

      return NextResponse.json({
        rematchStarted: true,
        startWord: randomPair.start_word,
        targetWord: randomPair.target_word,
      });
    }

    return NextResponse.json({
      rematchStarted: false,
      waitingForOpponent: true,
    });
  } catch (error) {
    console.error('Rematch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
