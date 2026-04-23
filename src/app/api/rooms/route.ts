import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateWordPair } from '@/lib/wordPairs';
import { ROOM_STATUS, DIFFICULTIES, type Difficulty } from '@/lib/constants';
import { ApiError, withErrorHandler } from '@/lib/api-error';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

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
export const POST = withErrorHandler('rooms/create', async (request: Request) => {
  checkRateLimit(request as NextRequest, 'rooms/create', RATE_LIMITS.room);

  const { playerName, difficulty = 'medium' } = await request.json() as { playerName?: string; difficulty?: Difficulty };

  if (!playerName?.trim()) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Player name is required' });
  }

  if (!(DIFFICULTIES as readonly string[]).includes(difficulty)) {
    throw new ApiError({ code: 'BAD_REQUEST', message: 'Invalid difficulty' });
  }

  const supabase = createServiceClient();

  // Generate a fresh random word pair using AI
  let wordPair;
  try {
    wordPair = await generateWordPair(supabase, difficulty);
  } catch (err) {
    throw new ApiError({
      code: 'UPSTREAM_ERROR',
      message: 'Failed to generate word pair — please try again',
      detail: 'Word pair generation failed',
      cause: err,
    });
  }

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

  // Create the room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      code,
      status: ROOM_STATUS.WAITING,
      start_word: wordPair.start_word,
      target_word: wordPair.target_word,
      difficulty,
    })
    .select()
    .single();

  if (roomError) {
    throw new ApiError({
      code: 'DATABASE_ERROR',
      message: 'Failed to create room',
      detail: 'rooms insert failed',
      cause: roomError,
    });
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
    throw new ApiError({
      code: 'DATABASE_ERROR',
      message: 'Failed to join room',
      detail: 'room_players insert failed',
      cause: playerError,
    });
  }

  return NextResponse.json({
    room,
    player,
    code: room.code,
  });
});

// GET /api/rooms?code=XXXX - Get room by code
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');

    if (!code) {
      return new ApiError({ code: 'BAD_REQUEST', message: 'Room code is required' }).toResponse();
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
      return new ApiError({ code: 'NOT_FOUND', message: 'Room not found' }).toResponse();
    }

    return NextResponse.json({ room });
  } catch {
    return new ApiError({ code: 'SERVER_ERROR' }).toResponse();
  }
}
