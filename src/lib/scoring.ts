export type PathQuality = 'perfect' | 'great' | 'good' | 'okay';

interface PathQualityResult {
  rating: PathQuality;
  emoji: string;
  description: string;
}

/**
 * Calculate the quality of a word chain path based on its length
 * relative to expected optimal paths for different difficulties.
 */
export function calculatePathQuality(
  chainLength: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): PathQualityResult {
  // Steps = chainLength - 1 (excluding start word)
  const steps = chainLength - 1;

  // Expected optimal steps for each difficulty
  const expectedSteps: Record<string, number> = {
    easy: 3,
    medium: 5,
    hard: 7,
  };

  const optimal = expectedSteps[difficulty];
  const ratio = steps / optimal;

  if (ratio <= 1) {
    return {
      rating: 'perfect',
      emoji: '🌟',
      description: 'Optimal path!',
    };
  } else if (ratio <= 1.4) {
    return {
      rating: 'great',
      emoji: '⭐',
      description: 'Very efficient!',
    };
  } else if (ratio <= 1.8) {
    return {
      rating: 'good',
      emoji: '👍',
      description: 'Nice work!',
    };
  } else {
    return {
      rating: 'okay',
      emoji: '🎯',
      description: 'You made it!',
    };
  }
}
