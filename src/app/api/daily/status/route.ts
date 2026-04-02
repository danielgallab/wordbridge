import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET /api/daily/status - Get player's status for today's puzzle
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const puzzleId = request.nextUrl.searchParams.get('puzzleId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get completion for this puzzle (if puzzleId provided) or today's puzzle
    let completion = null;
    if (puzzleId) {
      const { data } = await supabase
        .from('daily_completions')
        .select('*')
        .eq('puzzle_id', puzzleId)
        .eq('session_id', sessionId)
        .single();
      completion = data;
    }

    // Get player stats
    const { data: stats } = await supabase
      .from('player_stats')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    // Calculate average word count from completions
    let averageWordCount = null;
    if (stats && stats.total_completions > 0) {
      const { data: completions } = await supabase
        .from('daily_completions')
        .select('word_count')
        .eq('session_id', sessionId);

      if (completions && completions.length > 0) {
        const total = completions.reduce((sum: number, c: { word_count: number }) => sum + c.word_count, 0);
        averageWordCount = Math.round((total / completions.length) * 10) / 10;
      }
    }

    return NextResponse.json({
      hasCompleted: !!completion,
      completion: completion
        ? {
            chain: completion.chain,
            wordCount: completion.word_count,
            completedAt: completion.completed_at,
          }
        : null,
      stats: stats
        ? {
            currentStreak: stats.current_streak,
            maxStreak: stats.max_streak,
            totalCompletions: stats.total_completions,
            bestWordCount: stats.best_word_count,
            averageWordCount,
          }
        : null,
    });
  } catch (error) {
    console.error('Daily status error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
