import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getOpenAI, WORD_PAIR_GENERATION_PROMPT } from '@/lib/openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';

const WordPairResult = z.object({
  start_word: z.string(),
  target_word: z.string(),
  reasoning: z.string(),
});

type Difficulty = 'easy' | 'medium' | 'hard';

// Characters that are visually distinct (no 0/O, 1/I/L confusion)
const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
  }
  return code;
}

async function getRecentlyUsedWords(supabase: SupabaseClient): Promise<string[]> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: recentRooms } = await supabase
    .from('rooms')
    .select('start_word, target_word')
    .gte('created_at', threeDaysAgo.toISOString())
    .limit(50);

  if (!recentRooms) return [];

  const words = new Set<string>();
  for (const room of recentRooms) {
    words.add(room.start_word);
    words.add(room.target_word);
  }
  return Array.from(words);
}

async function generateWordPair(supabase: SupabaseClient, difficulty: Difficulty = 'medium') {
  const openai = getOpenAI();
  const recentWords = await getRecentlyUsedWords(supabase);

  let avoidClause = '';
  if (recentWords.length > 0) {
    avoidClause = ` Do NOT use any of these recently used words: ${recentWords.join(', ')}.`;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-mini',
    temperature: 1.2,
    seed: Math.floor(Math.random() * 1000000),
    messages: [
      { role: 'system', content: WORD_PAIR_GENERATION_PROMPT },
      { role: 'user', content: `Generate a ${difficulty} difficulty word pair.${avoidClause}` },
    ],
    response_format: zodResponseFormat(WordPairResult, 'word_pair'),
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate word pair');
  }

  const parsed = JSON.parse(content);
  const startWord = parsed.start_word.toLowerCase().trim();
  const targetWord = parsed.target_word.toLowerCase().trim();

  console.log(`[Word Pair Generated] ${startWord} → ${targetWord} (${difficulty}) | Reasoning: ${parsed.reasoning}`);

  return { start_word: startWord, target_word: targetWord };
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
