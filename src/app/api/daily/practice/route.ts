import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateWordPair } from '@/lib/wordPairs';

// GET /api/daily/practice - Generate a new practice word pair
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Generate a fresh random word pair using AI (medium difficulty for practice)
    const wordPair = await generateWordPair(supabase, 'medium');

    return NextResponse.json({
      puzzle: {
        start_word: wordPair.start_word,
        target_word: wordPair.target_word,
      },
    });
  } catch (error) {
    console.error('Generate practice word pair error:', error);
    return NextResponse.json({ error: 'Failed to generate practice word pair' }, { status: 500 });
  }
}
