import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateWordPair } from '@/lib/wordPairs';
import { debug } from '@/lib/debug';

// POST /api/daily/regenerate - Emergency: replace today's daily puzzle with a new pair
// Requires CRON_SECRET for authorization
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.ADMIN_SECRET || authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const today = new Date().toISOString().split('T')[0];

    // Fetch the current puzzle to report what we're replacing
    const { data: oldPuzzle } = await supabase
      .from('daily_puzzles')
      .select('*')
      .eq('puzzle_date', today)
      .single();

    // Delete completions for today's puzzle first (foreign key)
    if (oldPuzzle) {
      const { count: deletedCompletions } = await supabase
        .from('daily_completions')
        .delete({ count: 'exact' })
        .eq('puzzle_id', oldPuzzle.id);

      debug.api.log(`Regenerate: deleted ${deletedCompletions ?? 0} completions for puzzle ${oldPuzzle.id}`);
    }

    // Delete the current puzzle
    await supabase
      .from('daily_puzzles')
      .delete()
      .eq('puzzle_date', today);

    // Generate and insert a new puzzle
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

    if (insertError) {
      debug.api.error('Regenerate: failed to insert new puzzle:', insertError);
      return NextResponse.json({ error: 'Failed to create replacement puzzle' }, { status: 500 });
    }

    debug.api.log(`Regenerate: ${oldPuzzle?.start_word}→${oldPuzzle?.target_word} replaced with ${newPuzzle.start_word}→${newPuzzle.target_word}`);

    return NextResponse.json({
      replaced: oldPuzzle
        ? { start_word: oldPuzzle.start_word, target_word: oldPuzzle.target_word }
        : null,
      puzzle: newPuzzle,
    });
  } catch (error) {
    debug.api.error('Regenerate error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
