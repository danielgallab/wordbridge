import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateWordPair } from '@/lib/wordPairs';

// GET /api/daily/puzzle - Get today's puzzle (creates if missing)
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Get today's date in UTC
    const today = new Date().toISOString().split('T')[0];

    // Check if puzzle exists for today
    const { data: existingPuzzle, error: fetchError } = await supabase
      .from('daily_puzzles')
      .select('*')
      .eq('puzzle_date', today)
      .single();

    if (existingPuzzle) {
      return NextResponse.json({ puzzle: existingPuzzle });
    }

    // No puzzle for today - generate one
    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - that's expected
      console.error('Error fetching daily puzzle:', fetchError);
    }

    // Generate a new word pair (medium difficulty for daily challenges)
    const wordPair = await generateWordPair(supabase, 'medium');

    // Insert the new daily puzzle
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

    if (insertError) {
      // Handle race condition - another request might have created it
      if (insertError.code === '23505') {
        // Unique constraint violation - fetch the one that was created
        const { data: racePuzzle } = await supabase
          .from('daily_puzzles')
          .select('*')
          .eq('puzzle_date', today)
          .single();

        if (racePuzzle) {
          return NextResponse.json({ puzzle: racePuzzle });
        }
      }
      console.error('Error creating daily puzzle:', insertError);
      return NextResponse.json({ error: 'Failed to create daily puzzle' }, { status: 500 });
    }

    console.log(`[Daily Puzzle Created] ${newPuzzle.start_word} → ${newPuzzle.target_word} for ${today}`);

    return NextResponse.json({ puzzle: newPuzzle });
  } catch (error) {
    console.error('Daily puzzle error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
