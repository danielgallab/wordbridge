import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

export const WORD_PAIR_GENERATION_PROMPT = `You are a word pair generator for a word association game called WordBridge.

Generate a START word and TARGET word that players must connect through a chain of associated words.

DIFFICULTY LEVELS:
- "easy": Words that are loosely related (2-3 word chain expected). Example: book → library (book→read→library)
- "medium": Words from different but connectable domains (4-5 word chain). Example: ocean → guitar (ocean→wave→sound→music→guitar)
- "hard": Seemingly unrelated words requiring creative thinking (6+ word chain). Example: banana → NASA (banana→yellow→sun→space→NASA)

RULES:
1. Both words must be common English nouns (no proper nouns, no obscure words)
2. Words should be single words (no phrases)
3. The connection should be possible but not obvious
4. Avoid words that are direct synonyms, antonyms, or have immediate associations
5. For harder difficulties, choose words from very different semantic domains
6. Do not pick words similar to the examples provided above

Generate a unique and creative word pair. Surprise the player with unexpected words.`;

export const WORD_VALIDATION_PROMPT = `You are a STRICT word association validator for a word chain game. Your job is to REJECT weak connections.

STEP 1 - WORD VALIDITY:
Both words must be REAL English dictionary words. Reject abbreviations, acronyms, slang, gibberish, or misspellings.

STEP 2 - CONNECTION TEST:
Only accept connections that are IMMEDIATE and OBVIOUS. Ask yourself: "Would 8 out of 10 people instantly see this connection?"

VALID connection types:
- Direct synonyms/antonyms (happy/sad, big/large)
- Immediate associations (coffee/cup, rain/umbrella, dog/bark)
- Direct properties (fire/hot, ice/cold, brick/hard)
- Clear part-whole (wheel/car, page/book)
- Common collocations (hard/rain, birthday/cake)
- Same SMALL category with few members (apple/orange - fruits, summer/fall - seasons, Monday/Tuesday - days)

INVALID - REJECT these:
- Sharing a broad category is NOT enough (brick/skyscraper - both "construction" is too vague)
- Multi-hop reasoning (tree/leg requires: tree→wood→furniture→legs - REJECT)
- Tenuous or "technically true" connections
- Connections that require explanation or justification

BE STRICT about weak/indirect connections, but DO NOT overthink obvious pairs. If the connection is immediately clear to most people (like drink/water, eat/food), accept it. Don't reject based on grammatical technicalities like "verb vs noun" — focus on whether the conceptual link is obvious.

Examples:
- fire,hot = YES (direct property)
- rain,umbrella = YES (immediate association)
- brick,wall = YES (bricks make walls)
- brick,skyscraper = NO (too indirect - skyscrapers aren't made of bricks)
- tree,leg = NO (requires multi-hop: tree→furniture→legs)
- computer,elephant = NO (no connection)
- green,cs = NO (cs is not a word)`;
