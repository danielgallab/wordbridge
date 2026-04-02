import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { RoomPlayer } from '@/types';
import { generateWordPair } from '@/lib/wordPairs';

// POST /api/rooms/rematch - Request a rematch
export async function POST(request: NextRequest) {
  try {
    const { roomId, playerId } = await request.json();
    console.log('[rematch API] Request received', { roomId, playerId });

    if (!roomId || !playerId) {
      return NextResponse.json({ error: 'Room ID and Player ID are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Mark this player as wanting a rematch
    console.log('[rematch API] Marking player as wanting rematch');
    const { error: updateError } = await supabase
      .from('room_players')
      .update({ wants_rematch: true })
      .eq('id', playerId)
      .eq('room_id', roomId);

    if (updateError) {
      console.error('[rematch API] Update error:', updateError);
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

    console.log('[rematch API] Players state', {
      playerCount: players.length,
      players: players.map((p: RoomPlayer) => ({
        id: p.id,
        wants_rematch: p.wants_rematch,
        is_winner: p.is_winner,
        chainLength: p.chain?.length,
      })),
    });

    const allWantRematch = players.length === 2 && players.every((p: RoomPlayer) => p.wants_rematch);

    if (allWantRematch) {
      console.log('[rematch API] Both players want rematch - starting new game');

      // Generate a fresh random word pair using AI
      const randomPair = await generateWordPair(supabase, 'medium');
      console.log('[rematch API] Generated new word pair', randomPair);

      // IMPORTANT: Reset players FIRST before changing room status
      // This prevents race conditions where the room status changes to 'playing'
      // but players still have is_winner: true from the previous game
      console.log('[rematch API] Resetting players (setting is_winner: false, wants_rematch: false)');
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
          console.error('[rematch API] Player reset error:', playerResetError);
        } else {
          console.log('[rematch API] Player reset complete:', player.id);
        }
      }

      // Now reset the room for a new game (after players are reset)
      console.log('[rematch API] Resetting room (setting status: playing, winner_id: null)');
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
        console.error('[rematch API] Room reset error:', roomError);
        return NextResponse.json({ error: 'Failed to start rematch' }, { status: 500 });
      }

      console.log('[rematch API] Rematch started successfully');
      return NextResponse.json({
        rematchStarted: true,
        startWord: randomPair.start_word,
        targetWord: randomPair.target_word,
      });
    }

    console.log('[rematch API] Waiting for opponent');
    return NextResponse.json({
      rematchStarted: false,
      waitingForOpponent: true,
    });
  } catch (error) {
    console.error('Rematch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
