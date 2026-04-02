import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// POST /api/rooms/join - Join an existing room
export async function POST(request: NextRequest) {
  try {
    const { code, playerName } = await request.json();

    if (!code?.trim()) {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
    }

    if (!playerName?.trim()) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    // Allow up to 8 players per room
    if (room.room_players?.length >= 8) {
      return NextResponse.json({ error: 'Room is full' }, { status: 400 });
    }

    // Check if player name already taken in room
    const nameTaken = room.room_players?.some(
      (p: { player_name: string }) => p.player_name.toLowerCase() === playerName.trim().toLowerCase()
    );
    if (nameTaken) {
      return NextResponse.json({ error: 'Name already taken in this room' }, { status: 400 });
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
      console.error('Join room error:', playerError);
      return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
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
      room: updatedRoom || { ...room, status: 'playing', room_players: [...(room.room_players || []), player] },
      player,
    });
  } catch (error) {
    console.error('Join room error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
