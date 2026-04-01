import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const { playerName } = await request.json();

    if (!playerName?.trim()) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get a random word pair from the database
    const { data: wordPairs, error: pairError } = await supabase
      .from('word_pairs')
      .select('*')
      .limit(10);

    if (pairError || !wordPairs?.length) {
      return NextResponse.json({ error: 'No word pairs available' }, { status: 500 });
    }

    const randomPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];

    // Generate unique room code
    let code = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', code)
        .single();

      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    // Create the room (no word_pair_id - just store the words directly)
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        code,
        status: 'waiting',
        start_word: randomPair.start_word,
        target_word: randomPair.target_word,
      })
      .select()
      .single();

    if (roomError) {
      console.error('Room creation error:', roomError);
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }

    // Add the creator as first player
    const { data: player, error: playerError } = await supabase
      .from('room_players')
      .insert({
        room_id: room.id,
        player_name: playerName.trim(),
        chain: [randomPair.start_word],
      })
      .select()
      .single();

    if (playerError) {
      console.error('Player creation error:', playerError);
      return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
    }

    return NextResponse.json({
      room,
      player,
      code: room.code,
    });
  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET /api/rooms?code=XXXX - Get room by code
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: room, error } = await supabase
      .from('rooms')
      .select(`
        *,
        room_players (*)
      `)
      .eq('code', code.toUpperCase())
      .single();

    if (error || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
