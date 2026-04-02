import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateWordPair, Difficulty } from '@/lib/wordPairs';

// Characters that are visually distinct (no 0/O, 1/I/L confusion)
const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
  }
  return code;
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const { playerName, difficulty = 'medium' } = await request.json() as { playerName?: string; difficulty?: Difficulty };

    if (!playerName?.trim()) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Generate a fresh random word pair using AI
    const wordPair = await generateWordPair(supabase, difficulty);

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
        start_word: wordPair.start_word,
        target_word: wordPair.target_word,
        difficulty,
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
        chain: [wordPair.start_word],
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
