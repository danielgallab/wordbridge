import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// POST /api/rooms/end - End a game (called when time runs out)
export async function POST(request: NextRequest) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Only update if the room is still in 'playing' status (prevent race conditions)
    const { error } = await supabase
      .from('rooms')
      .update({
        status: 'finished',
        finished_at: new Date().toISOString(),
        winner_id: null, // Draw - no winner
      })
      .eq('id', roomId)
      .eq('status', 'playing'); // Only update if still playing

    if (error) {
      console.error('[end API] Error:', error);
      return NextResponse.json({ error: 'Failed to end game' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('End game error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
