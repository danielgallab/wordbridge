import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getOpenAI, WORD_PAIR_GENERATION_PROMPT } from '@/lib/openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { RoomPlayer } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

const WordPairResult = z.object({
  start_word: z.string(),
  target_word: z.string(),
  reasoning: z.string(),
});

type Difficulty = 'easy' | 'medium' | 'hard';

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
  const randomId = Math.random().toString(36).substring(2, 10);
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
      { role: 'user', content: `Generate a ${difficulty} difficulty word pair.${avoidClause} Session: ${randomId}` },
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
