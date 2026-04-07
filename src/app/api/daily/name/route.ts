import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// POST /api/daily/name - Submit player name for leaderboard
export async function POST(request: NextRequest) {
  try {
    const { sessionId, puzzleId, playerName } = await request.json();

    if (!sessionId || !puzzleId || !playerName?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const trimmedName = playerName.trim().slice(0, 20); // Max 20 chars
    const supabase = createServiceClient();

    // Update the completion record with the player name
    const { error: completionError } = await supabase
      .from('daily_completions')
      .update({ player_name: trimmedName })
      .eq('puzzle_id', puzzleId)
      .eq('session_id', sessionId);

    if (completionError) {
      console.error('Error updating completion name:', completionError);
      return NextResponse.json({ error: 'Failed to save name' }, { status: 500 });
    }

    // Also update player_stats with the name for future use
    const { error: statsError } = await supabase
      .from('player_stats')
      .update({ player_name: trimmedName })
      .eq('session_id', sessionId);

    if (statsError) {
      console.error('Error updating stats name:', statsError);
      // Don't fail the request, completion name is already saved
    }

    return NextResponse.json({ success: true, playerName: trimmedName });
  } catch (error) {
    console.error('Name submit error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
