import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateShareCode } from '@/lib/shareCode';

// POST /api/daily/submit - Submit a word to the daily challenge or practice mode
export async function POST(request: NextRequest) {
  try {
    const { sessionId, puzzleId, word, currentChain, targetWord, isPractice } = await request.json();

    // Practice mode: only needs word, currentChain, and targetWord
    // Daily mode: needs sessionId, puzzleId, word, and currentChain
    if (!word?.trim() || !Array.isArray(currentChain)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For practice mode, we just need the targetWord
    if (isPractice) {
      if (!targetWord?.trim()) {
        return NextResponse.json({ error: 'Missing targetWord for practice mode' }, { status: 400 });
      }
      return handleWordSubmission(request, currentChain, word, targetWord.toLowerCase());
    }

    // For daily mode, we need sessionId and puzzleId
    if (!sessionId || !puzzleId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch the puzzle
    const { data: puzzle, error: puzzleError } = await supabase
      .from('daily_puzzles')
      .select('*')
      .eq('id', puzzleId)
      .single();

    if (puzzleError || !puzzle) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
    }

    // Check if already completed
    const { data: existingCompletion } = await supabase
      .from('daily_completions')
      .select('id')
      .eq('puzzle_id', puzzleId)
      .eq('session_id', sessionId)
      .single();

    // Validate and get the new chain
    const result = await handleWordSubmission(request, currentChain, word, puzzle.target_word.toLowerCase());
    const resultData = await result.json();

    if (!result.ok) {
      return NextResponse.json(resultData, { status: result.status });
    }

    const { chain: newChain, isComplete } = resultData;

    // If completed and not already completed, save the completion
    if (isComplete && !existingCompletion) {
      const wordCount = newChain.length;

      // Insert completion with ON CONFLICT to handle race conditions
      // If another request completed first, this will be a no-op
      const shareCode = generateShareCode();
      const { data: insertedCompletion, error: insertError } = await supabase
        .from('daily_completions')
        .upsert(
          {
            puzzle_id: puzzleId,
            session_id: sessionId,
            chain: newChain,
            word_count: wordCount,
            share_code: shareCode,
          },
          {
            onConflict: 'puzzle_id,session_id',
            ignoreDuplicates: true,
          }
        )
        .select('id, share_code')
        .maybeSingle();

      // Only update stats if we actually inserted (not a duplicate)
      if (!insertError && insertedCompletion) {
        await updatePlayerStats(supabase, sessionId, wordCount, puzzle.puzzle_date);
      }

      return NextResponse.json({
        success: true,
        chain: newChain,
        isComplete: true,
        wordCount,
        isPractice: false,
        shareCode: insertedCompletion.share_code,
      });
    }

    // If complete but was already completed (replaying)
    if (isComplete && existingCompletion) {
      return NextResponse.json({
        success: true,
        chain: newChain,
        isComplete: true,
        wordCount: newChain.length,
        isPractice: true,
      });
    }

    return NextResponse.json({
      success: true,
      chain: newChain,
      isComplete: false,
    });
  } catch (error) {
    console.error('Daily submit error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Shared word submission logic for both daily and practice modes
async function handleWordSubmission(
  request: NextRequest,
  currentChain: string[],
  word: string,
  targetWord: string
): Promise<NextResponse> {
  // Get the last word in the chain
  const lastWord = currentChain[currentChain.length - 1];
  // Basic cleanup only - AI will handle singularization
  const newWord = word.trim().toLowerCase();

  // Don't allow duplicates (check will be refined after AI normalization)
  if (currentChain.includes(newWord)) {
    return NextResponse.json({ error: 'Already used', reason: 'already_used' }, { status: 400 });
  }

  // Validate word association via our API
  const validateRes = await fetch(new URL('/api/validate-word', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word1: lastWord, word2: newWord }),
  });

  const validateData = await validateRes.json();

  if (!validateData.isValid) {
    return NextResponse.json(
      { error: `"${newWord}" is not associated with "${lastWord}"`, reason: validateData.reason },
      { status: 400 }
    );
  }

  // Use the normalized word if AI provided one (e.g., "hands" -> "hand")
  const finalWord = validateData.normalizedWord || newWord;

  // Check if the normalized word is already in the chain
  if (currentChain.includes(finalWord)) {
    return NextResponse.json({ error: 'Already used', reason: 'already_used' }, { status: 400 });
  }

  // Build the new chain
  const newChain = [...currentChain, finalWord];
  const isComplete = finalWord === targetWord;

  return NextResponse.json({
    success: true,
    chain: newChain,
    isComplete,
    wordCount: newChain.length,
    isPractice: true,
  });
}

async function updatePlayerStats(
  supabase: ReturnType<typeof createServiceClient>,
  sessionId: string,
  wordCount: number,
  puzzleDate: string
) {
  // Get existing stats
  const { data: existingStats } = await supabase
    .from('player_stats')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  const today = new Date(puzzleDate);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (existingStats) {
    // Update existing stats
    const wasYesterday = existingStats.last_completed_date === yesterdayStr;
    const newStreak = wasYesterday ? existingStats.current_streak + 1 : 1;
    const newMaxStreak = Math.max(existingStats.max_streak, newStreak);
    const newBest = existingStats.best_word_count
      ? Math.min(existingStats.best_word_count, wordCount)
      : wordCount;

    await supabase
      .from('player_stats')
      .update({
        total_completions: existingStats.total_completions + 1,
        current_streak: newStreak,
        max_streak: newMaxStreak,
        best_word_count: newBest,
        last_completed_date: puzzleDate,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId);
  } else {
    // Create new stats
    await supabase.from('player_stats').insert({
      session_id: sessionId,
      total_completions: 1,
      current_streak: 1,
      max_streak: 1,
      best_word_count: wordCount,
      last_completed_date: puzzleDate,
    });
  }
}
