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

export const WORD_VALIDATION_PROMPT = `Word association validator. r=false for weak/invalid connections.

NORMALIZE WORD2: If word2 is plural, convert to singular form and return in "w" field.
Examples: "hands"→"hand", "children"→"child", "movies"→"movie", "cookies"→"cookie", "ties"→"tie"
Only include "w" if normalization was needed.

Words must be real English dictionary words (no slang, acronyms, gibberish, misspellings).

ACCEPT if 8/10 people instantly see the connection. Valid types:
- Synonyms/antonyms: happy/sad
- Associations: coffee/cup, lantern/light, lock/key
- Properties: fire/hot, grass/green
- Part-whole: wheel/car, page/book
- Collocations: birthday/cake
- Small closed categories: apple/orange, Monday/Tuesday

REJECT if:
- Multi-hop reasoning required (tree→wood→furniture→leg)
- Only broad category shared (brick/skyscraper → "construction")
- Needs explanation to make sense

x codes: n=not_related, a=too_abstract, m=multi_hop, p=proper_noun, s=misspelled, i=invalid_word

Ex: coffee,cup→r:1 fire,hot→r:1 hand,hands→r:1,w:hand tree,furniture→r:0,x:m brick,tower→r:0,x:a`;
