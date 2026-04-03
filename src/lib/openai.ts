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

// Optimized short prompt for faster LLM response
export const WORD_VALIDATION_PROMPT = `Word association validator. r=true ONLY if there's a direct, immediate connection.
ACCEPT: direct synonyms, immediate associations (bird/nest, dog/bark), inherent properties (fire/hot), compound words (bird/house=birdhouse), same category (apple/orange).
REJECT:
- Weak/tenuous connections
- Multi-hop reasoning (A→B→C is NOT valid, only A→B)
- Abstract thematic links
- Connections requiring explanation
- Proper nouns, misspellings
Be STRICT - reject if the connection isn't obvious and immediate. When in doubt, reject.
x codes: n=not_related, a=too_abstract, m=multi_hop, p=proper_noun, s=misspelled, i=invalid_word`;
