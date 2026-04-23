import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { debug } from '@/lib/debug';

// GET /api/daily/leaderboard - Get the daily leaderboard
export async function GET(request: NextRequest) {
  try {
    const puzzleIdParam = request.nextUrl.searchParams.get('puzzleId');
    const limitParam = request.nextUrl.searchParams.get('limit');
    // Validate and clamp limit to reasonable bounds (1-100)
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 10;
    const limit = Math.min(Math.max(isNaN(parsedLimit) ? 10 : parsedLimit, 1), 100);

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
    // Include chain for top entries to display on leaderboard
    // Use count: 'exact' to get total count in the same query
    const { data: completions, error, count } = await supabase
      .from('daily_completions')
      .select('session_id, player_name, word_count, completed_at, chain', { count: 'exact' })
      .eq('puzzle_id', puzzleId)
      .order('word_count', { ascending: true })
      .order('completed_at', { ascending: true })
      .limit(limit);

    if (error) {
      debug.api.error('Leaderboard query error:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Format leaderboard with ranks
    // Include chain only for top 5 entries
    const leaderboard = (completions || []).map((entry: { session_id: string; player_name: string | null; word_count: number; completed_at: string; chain: string[] }, index: number) => ({
      rank: index + 1,
      sessionId: entry.session_id,
      playerName: entry.player_name || 'Anonymous',
      wordCount: entry.word_count,
      completedAt: entry.completed_at,
      // Only include chain for top 5 to reduce payload size
      chain: index < 5 ? entry.chain : undefined,
    }));

    // Cache leaderboard for 60 seconds to reduce database load
    // stale-while-revalidate allows serving stale data while fetching fresh
    const response = NextResponse.json({
      leaderboard,
      totalCompletions: count || 0,
    });
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    return response;
  } catch (error) {
    debug.api.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
