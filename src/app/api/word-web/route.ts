import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServiceClient();

  // Fetch all valid word associations
  const { data: associations, error } = await supabase
    .from('word_associations')
    .select('word1, word2')
    .eq('is_valid', true)
    .order('validated_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Error fetching word associations:', error);
    return NextResponse.json({ error: 'Failed to fetch associations' }, { status: 500 });
  }

  // Build nodes and edges for the graph
  const nodesSet = new Set<string>();
  const edges: { source: string; target: string }[] = [];

  for (const assoc of associations || []) {
    const word1 = assoc.word1.toLowerCase();
    const word2 = assoc.word2.toLowerCase();
    nodesSet.add(word1);
    nodesSet.add(word2);
    edges.push({ source: word1, target: word2 });
  }

  // Convert nodes to array with connection counts
  const connectionCounts = new Map<string, number>();
  for (const edge of edges) {
    connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
    connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
  }

  const nodes = Array.from(nodesSet).map((word) => ({
    id: word,
    label: word,
    connections: connectionCounts.get(word) || 0,
  }));

  return NextResponse.json({ nodes, edges });
}
