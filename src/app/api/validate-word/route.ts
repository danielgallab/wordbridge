import { NextRequest, NextResponse } from 'next/server';
import { validateWordPair } from '@/lib/validate-word';

export async function POST(request: NextRequest) {
  const { word1, word2 } = await request.json();

  if (!word1 || !word2) {
    return NextResponse.json(
      { error: 'Both words are required' },
      { status: 400 }
    );
  }

  const result = await validateWordPair(word1, word2);
  return NextResponse.json(result);
}
