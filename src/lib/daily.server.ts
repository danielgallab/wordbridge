import { createServiceClient } from '@/lib/supabase/server';
import type { DailyPuzzle, DailyCompletion, PlayerStats } from '@/types';
import { generateWordPair } from '@/lib/wordPairs';

export interface PracticeData {
  puzzle: {
    start_word: string;
    target_word: string;
  };
}

export async function getPracticeData(): Promise<PracticeData | null> {
  try {
    const supabase = createServiceClient();
    const wordPair = await generateWordPair(supabase, 'medium');

    return {
      puzzle: {
        start_word: wordPair.start_word,
        target_word: wordPair.target_word,
      },
    };
  } catch (error) {
    console.error('Failed to get practice data:', error);
    return null;
  }
}

export interface DailyData {
  puzzle: DailyPuzzle;
  sessionId: string;
  hasCompletedToday: boolean;
  completion: DailyCompletion | null;
  stats: PlayerStats | null;
}

async function fetchOrCreatePuzzle(supabase: ReturnType<typeof createServiceClient>, today: string): Promise<DailyPuzzle | null> {
  const { data: existingPuzzle, error: fetchError } = await supabase
    .from('daily_puzzles')
    .select('*')
    .eq('puzzle_date', today)
    .single();

  if (existingPuzzle) {
    return existingPuzzle;
  }

  if (fetchError && fetchError.code !== 'PGRST116') {
    return null;
  }

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
    return racePuzzle;
  }

  return newPuzzle;
}

export async function getDailyData(sessionId: string): Promise<DailyData | null> {
  try {
    const supabase = createServiceClient();
    const today = new Date().toISOString().split('T')[0];

    // If no session, just fetch puzzle
    if (!sessionId) {
      const puzzle = await fetchOrCreatePuzzle(supabase, today);
      if (!puzzle) return null;
      return {
        puzzle,
        sessionId: '',
        hasCompletedToday: false,
        completion: null,
        stats: null,
      };
    }

    // Fetch puzzle and session-independent data in parallel
    const [puzzle, statsResult, avgResult] = await Promise.all([
      fetchOrCreatePuzzle(supabase, today),
      supabase
        .from('player_stats')
        .select('*')
        .eq('session_id', sessionId)
        .single(),
      supabase
        .from('daily_completions')
        .select('word_count')
        .eq('session_id', sessionId),
    ]);

    if (!puzzle) return null;

    // Now fetch completion (needs puzzle.id)
    const { data: dbCompletion } = await supabase
      .from('daily_completions')
      .select('*')
      .eq('puzzle_id', puzzle.id)
      .eq('session_id', sessionId)
      .single();

    const dbStats = statsResult.data;

    // Calculate average word count
    let averageWordCount: number | null = null;
    const completions = avgResult.data;
    if (completions && completions.length > 0) {
      const total = completions.reduce((sum: number, c: { word_count: number }) => sum + c.word_count, 0);
      averageWordCount = Math.round((total / completions.length) * 10) / 10;
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
