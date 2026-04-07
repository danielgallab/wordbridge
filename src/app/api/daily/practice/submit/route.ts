import { NextRequest, NextResponse } from 'next/server';
import { singularize } from '@/lib/singularize';

// POST /api/daily/practice/submit - Submit a word in practice mode
export async function POST(request: NextRequest) {
  try {
    const { word, currentChain, targetWord } = await request.json();

    if (!word?.trim() || !Array.isArray(currentChain) || !targetWord?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the last word in the chain
    const lastWord = currentChain[currentChain.length - 1];
    const newWord = singularize(word.trim().toLowerCase());

    // Don't allow duplicates
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

    // Build the new chain
    const newChain = [...currentChain, newWord];
    const isComplete = newWord === targetWord.toLowerCase();

    return NextResponse.json({
      success: true,
      chain: newChain,
      isComplete,
      wordCount: newChain.length,
      isPractice: true,
    });
  } catch (error) {
    console.error('Practice submit error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
