import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ROOM_STATUS } from '@/lib/constants';
import { generateWordPair } from '@/lib/wordPairs';
import { debug } from '@/lib/debug';

// POST /api/cron/cleanup-rooms - Daily cron: clean up abandoned rooms & pre-generate daily puzzle
// Called by Vercel Cron on a schedule
export async function POST(request: NextRequest) {
  // Verify the request is from Vercel Cron (in production)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // --- Room cleanup ---
  const now = new Date();
  const waitingCutoff = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const finishedCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: staleWaiting } = await supabase
    .from('rooms')
    .select('id')
    .eq('status', ROOM_STATUS.WAITING)
    .lt('created_at', waitingCutoff);

  const { data: staleFinished } = await supabase
    .from('rooms')
    .select('id')
    .eq('status', ROOM_STATUS.FINISHED)
    .lt('finished_at', finishedCutoff);

  const roomIds = [
    ...(staleWaiting || []).map((r: { id: string }) => r.id),
    ...(staleFinished || []).map((r: { id: string }) => r.id),
  ];

  let cleanedCount = 0;
  const waitingCount = staleWaiting?.length ?? 0;
  const finishedCount = staleFinished?.length ?? 0;

  if (roomIds.length > 0) {
    const { error: playersError } = await supabase
      .from('room_players')
      .delete()
      .in('room_id', roomIds);

    if (playersError) {
      debug.api.error('[cleanup] Failed to delete players:', playersError);
    } else {
      const { error: roomsError } = await supabase
        .from('rooms')
        .delete()
        .in('id', roomIds);

      if (roomsError) {
        debug.api.error('[cleanup] Failed to delete rooms:', roomsError);
      } else {
        cleanedCount = roomIds.length;
        debug.api.log(`[cleanup] Cleaned ${cleanedCount} rooms (${waitingCount} waiting, ${finishedCount} finished)`);
      }
    }
  } else {
    debug.api.log('[cleanup] No stale rooms found');
  }

  // --- Daily puzzle pre-generation ---
  const today = new Date().toISOString().split('T')[0];
  let puzzleStatus = 'skipped';

  const { data: existingPuzzle } = await supabase
    .from('daily_puzzles')
    .select('id')
    .eq('puzzle_date', today)
    .single();

  if (!existingPuzzle) {
    try {
      const wordPair = await generateWordPair(supabase, 'medium');
      const { error: insertError } = await supabase
        .from('daily_puzzles')
        .insert({
          puzzle_date: today,
          start_word: wordPair.start_word,
          target_word: wordPair.target_word,
          difficulty: 'medium',
        });

      if (insertError && insertError.code !== '23505') {
        debug.api.error('[cron] Failed to create daily puzzle:', insertError);
        puzzleStatus = 'error';
      } else {
        debug.api.log(`[cron] Daily puzzle created: ${wordPair.start_word} → ${wordPair.target_word}`);
        puzzleStatus = 'created';
      }
    } catch (error) {
      debug.api.error('[cron] Daily puzzle generation error:', error);
      puzzleStatus = 'error';
    }
  } else {
    puzzleStatus = 'already_exists';
  }

  return NextResponse.json({
    cleanup: { cleaned: cleanedCount, waiting: waitingCount, finished: finishedCount },
    dailyPuzzle: { status: puzzleStatus, date: today },
  });
}
