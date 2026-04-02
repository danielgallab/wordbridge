// Convert plural words to singular form
export function singularize(word: string): string {
  const lowerWord = word.toLowerCase();

  // Irregular plurals
  const irregulars: Record<string, string> = {
    'children': 'child',
    'men': 'man',
    'women': 'woman',
    'teeth': 'tooth',
    'feet': 'foot',
    'mice': 'mouse',
    'geese': 'goose',
    'people': 'person',
    'oxen': 'ox',
    'sheep': 'sheep',
    'deer': 'deer',
    'fish': 'fish',
    'species': 'species',
    'series': 'series',
    'leaves': 'leaf',
    'lives': 'life',
    'knives': 'knife',
    'wives': 'wife',
    'wolves': 'wolf',
    'halves': 'half',
    'selves': 'self',
    'shelves': 'shelf',
    'thieves': 'thief',
    'loaves': 'loaf',
    'potatoes': 'potato',
    'tomatoes': 'tomato',
    'heroes': 'hero',
    'echoes': 'echo',
    'vetoes': 'veto',
    'criteria': 'criterion',
    'phenomena': 'phenomenon',
    'analyses': 'analysis',
    'bases': 'basis',
    'crises': 'crisis',
    'theses': 'thesis',
    'hypotheses': 'hypothesis',
    'parentheses': 'parenthesis',
    'oases': 'oasis',
    'axes': 'axis',
    'cacti': 'cactus',
    'fungi': 'fungus',
    'nuclei': 'nucleus',
    'radii': 'radius',
    'alumni': 'alumnus',
    'syllabi': 'syllabus',
    'octopi': 'octopus',
    'stimuli': 'stimulus',
    'foci': 'focus',
  };

  if (irregulars[lowerWord]) {
    return irregulars[lowerWord];
  }

  // Don't singularize very short words (less than 3 chars)
  if (lowerWord.length < 3) {
    return lowerWord;
  }

  // Words ending in -ies (e.g., "babies" -> "baby", but not "series")
  if (lowerWord.endsWith('ies') && lowerWord.length > 4) {
    return lowerWord.slice(0, -3) + 'y';
  }

  // Words ending in -ves (e.g., "calves" -> "calf")
  if (lowerWord.endsWith('ves')) {
    return lowerWord.slice(0, -3) + 'f';
  }

  // Words ending in -es (e.g., "boxes" -> "box", "buses" -> "bus")
  if (lowerWord.endsWith('es')) {
    // Check for -ches, -shes, -sses, -xes, -zes
    if (lowerWord.endsWith('ches') || lowerWord.endsWith('shes') ||
        lowerWord.endsWith('sses') || lowerWord.endsWith('xes') ||
        lowerWord.endsWith('zes')) {
      return lowerWord.slice(0, -2);
    }
    // Words ending in -oes
    if (lowerWord.endsWith('oes')) {
      return lowerWord.slice(0, -2);
    }
  }

  // Words ending in -s (but not -ss, -us, -is)
  if (lowerWord.endsWith('s') && !lowerWord.endsWith('ss') &&
      !lowerWord.endsWith('us') && !lowerWord.endsWith('is')) {
    return lowerWord.slice(0, -1);
  }

  return lowerWord;
}
