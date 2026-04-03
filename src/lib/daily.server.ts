import { createServiceClient } from '@/lib/supabase/server';
import type { DailyPuzzle, DailyCompletion, PlayerStats } from '@/types';
import { generateWordPair } from '@/lib/wordPairs';

export interface DailyData {
  puzzle: DailyPuzzle;
  sessionId: string;
  hasCompletedToday: boolean;
  completion: DailyCompletion | null;
  stats: PlayerStats | null;
}

export async function getDailyData(sessionId: string): Promise<DailyData | null> {
  try {
    const supabase = createServiceClient();
    const today = new Date().toISOString().split('T')[0];

    // Fetch puzzle (create if doesn't exist)
    let puzzle: DailyPuzzle | null = null;

    const { data: existingPuzzle, error: fetchError } = await supabase
      .from('daily_puzzles')
      .select('*')
      .eq('puzzle_date', today)
      .single();

    if (existingPuzzle) {
      puzzle = existingPuzzle;
    } else if (!fetchError || fetchError.code === 'PGRST116') {
      // No puzzle for today - generate one
      const wordPair = await generateWordPair(supabase, 'medium');

      const { data: newPuzzle, error: insertError } = await supabase
        .from('daily_puzzles')
        .insert({
          puzzle_date: today,
          start_word: wordPair.start_word,
          target_word: wordPair.target_word,
          difficulty: 'medium',
        })
        .select()
        .single();

      if (insertError?.code === '23505') {
        // Race condition - fetch the one that was created
        const { data: racePuzzle } = await supabase
          .from('daily_puzzles')
          .select('*')
          .eq('puzzle_date', today)
          .single();
        puzzle = racePuzzle;
      } else if (newPuzzle) {
        puzzle = newPuzzle;
      }
    }

    if (!puzzle) {
      return null;
    }

    // If no session, return puzzle only
    if (!sessionId) {
      return {
        puzzle,
        sessionId: '',
        hasCompletedToday: false,
        completion: null,
        stats: null,
      };
    }

    // Fetch completion and stats in parallel
    const [completionResult, statsResult] = await Promise.all([
      supabase
        .from('daily_completions')
        .select('*')
        .eq('puzzle_id', puzzle.id)
        .eq('session_id', sessionId)
        .single(),
      supabase
        .from('player_stats')
        .select('*')
        .eq('session_id', sessionId)
        .single(),
    ]);

    const dbCompletion = completionResult.data;
    const dbStats = statsResult.data;

    // Calculate average word count if we have stats
    let averageWordCount: number | null = null;
    if (dbStats && dbStats.total_completions > 0) {
      const { data: completions } = await supabase
        .from('daily_completions')
        .select('word_count')
        .eq('session_id', sessionId);

      if (completions && completions.length > 0) {
        const total = completions.reduce((sum: number, c: { word_count: number }) => sum + c.word_count, 0);
        averageWordCount = Math.round((total / completions.length) * 10) / 10;
      }
    }

    return {
      puzzle,
      sessionId,
      hasCompletedToday: !!dbCompletion,
      completion: dbCompletion
        ? {
            chain: dbCompletion.chain,
            wordCount: dbCompletion.word_count,
            completedAt: dbCompletion.completed_at,
          }
        : null,
      stats: dbStats
        ? {
            currentStreak: dbStats.current_streak,
            maxStreak: dbStats.max_streak,
            totalCompletions: dbStats.total_completions,
            bestWordCount: dbStats.best_word_count,
            averageWordCount,
          }
        : null,
    };
  } catch (error) {
    console.error('Failed to get daily data:', error);
    return null;
  }
}
