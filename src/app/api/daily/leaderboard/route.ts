import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET /api/daily/leaderboard - Get the daily leaderboard
export async function GET(request: NextRequest) {
  try {
    const puzzleIdParam = request.nextUrl.searchParams.get('puzzleId');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    const supabase = createServiceClient();

    let puzzleId = puzzleIdParam ? parseInt(puzzleIdParam, 10) : null;

    // If no puzzleId provided, get today's puzzle
    if (!puzzleId) {
      const today = new Date().toISOString().split('T')[0];
      const { data: todayPuzzle } = await supabase
        .from('daily_puzzles')
        .select('id')
        .eq('puzzle_date', today)
        .single();

      if (!todayPuzzle) {
        return NextResponse.json({ leaderboard: [], totalCompletions: 0 });
      }
      puzzleId = todayPuzzle.id;
    }

    // Get completions ordered by word count (fewest words = best)
    const { data: completions, error } = await supabase
      .from('daily_completions')
      .select('session_id, player_name, word_count, completed_at')
      .eq('puzzle_id', puzzleId)
      .order('word_count', { ascending: true })
      .order('completed_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Leaderboard query error:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Get total count
    const { count } = await supabase
      .from('daily_completions')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_id', puzzleId);

    // Format leaderboard with ranks
    const leaderboard = (completions || []).map((entry: { session_id: string; player_name: string | null; word_count: number; completed_at: string }, index: number) => ({
      rank: index + 1,
      playerName: entry.player_name || 'Anonymous',
      wordCount: entry.word_count,
      completedAt: entry.completed_at,
    }));

    return NextResponse.json({
      leaderboard,
      totalCompletions: count || 0,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
