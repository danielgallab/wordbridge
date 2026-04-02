import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// POST /api/rooms/start - Start a game (host only)
export async function POST(request: NextRequest) {
  try {
    const { roomId, playerId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    // Check if at least 2 players are in the room
    if (!room.room_players || room.room_players.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 players to start' }, { status: 400 });
    }

    // Check if requester is the host (first player to join based on created_at)
    const sortedPlayers = [...room.room_players].sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const hostId = sortedPlayers[0]?.id;

    if (playerId !== hostId) {
      return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 });
    }

    // Start the game with server timestamp
    const startedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        status: 'playing',
        started_at: startedAt,
      })
      .eq('id', roomId);

    if (updateError) {
      console.error('Start game error:', updateError);
      return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      started_at: startedAt,
    });
  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
