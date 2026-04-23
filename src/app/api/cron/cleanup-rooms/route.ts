import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ROOM_STATUS } from '@/lib/constants';
import { debug } from '@/lib/debug';

// POST /api/cron/cleanup-rooms - Clean up abandoned rooms
// Called by Vercel Cron on a schedule
export async function POST(request: NextRequest) {
  // Verify the request is from Vercel Cron (in production)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  // Delete rooms that have been in 'waiting' status for more than 1 hour
  const waitingCutoff = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  // Delete rooms that have been 'finished' for more than 24 hours
  const finishedCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Step 1: Find rooms to clean up
  const { data: staleWaiting } = await supabase
    .from('rooms')
    .select('id')
    .eq('status', ROOM_STATUS.WAITING)
    .lt('created_at', waitingCutoff);

  const { data: staleFinished } = await supabase
    .from('rooms')
    .select('id')
    .eq('status', ROOM_STATUS.FINISHED)
    .lt('finished_at', finishedCutoff);

  const roomIds = [
    ...(staleWaiting || []).map((r: { id: string }) => r.id),
    ...(staleFinished || []).map((r: { id: string }) => r.id),
  ];

  if (roomIds.length === 0) {
    debug.api.log('[cleanup] No stale rooms found');
    return NextResponse.json({ cleaned: 0 });
  }

  // Step 2: Delete players from those rooms first (foreign key constraint)
  const { error: playersError } = await supabase
    .from('room_players')
    .delete()
    .in('room_id', roomIds);

  if (playersError) {
    debug.api.error('[cleanup] Failed to delete players:', playersError);
    return NextResponse.json({ error: 'Failed to clean up players' }, { status: 500 });
  }

  // Step 3: Delete the rooms
  const { error: roomsError } = await supabase
    .from('rooms')
    .delete()
    .in('id', roomIds);

  if (roomsError) {
    debug.api.error('[cleanup] Failed to delete rooms:', roomsError);
    return NextResponse.json({ error: 'Failed to clean up rooms' }, { status: 500 });
  }

  const waitingCount = staleWaiting?.length ?? 0;
  const finishedCount = staleFinished?.length ?? 0;

  debug.api.log(`[cleanup] Cleaned ${roomIds.length} rooms (${waitingCount} waiting, ${finishedCount} finished)`);

  return NextResponse.json({
    cleaned: roomIds.length,
    waiting: waitingCount,
    finished: finishedCount,
  });
}
