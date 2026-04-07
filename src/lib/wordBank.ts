/**
 * Static word bank for WordBridge game.
 * These words are curated to be:
 * - Common English nouns
 * - Good for word association chains
 * - Diverse across semantic domains
 *
 * AI can add new words to this bank over time.
 */

export const WORD_BANK: string[] = [
  // Nature & Environment
  "ocean", "mountain", "forest", "desert", "river", "lake", "island", "volcano",
  "jungle", "meadow", "valley", "canyon", "waterfall", "glacier", "reef", "swamp",
  "tree", "flower", "grass", "leaf", "root", "branch", "seed", "petal",
  "rock", "sand", "soil", "clay", "stone", "crystal", "diamond", "gold",
  "sun", "moon", "star", "cloud", "rain", "snow", "thunder", "lightning",
  "wind", "storm", "rainbow", "fog", "frost", "dew", "ice", "fire",

  // Animals
  "dog", "cat", "bird", "fish", "horse", "cow", "pig", "sheep",
  "lion", "tiger", "bear", "wolf", "fox", "deer", "rabbit", "mouse",
  "elephant", "giraffe", "zebra", "monkey", "gorilla", "snake", "lizard", "frog",
  "eagle", "owl", "penguin", "parrot", "swan", "duck", "chicken", "turkey",
  "whale", "dolphin", "shark", "octopus", "crab", "lobster", "jellyfish", "turtle",
  "butterfly", "bee", "ant", "spider", "beetle", "dragonfly", "moth", "worm",

  // Food & Drink
  "apple", "banana", "orange", "grape", "lemon", "cherry", "peach", "mango",
  "bread", "cheese", "butter", "milk", "egg", "meat", "chicken", "beef",
  "rice", "pasta", "noodle", "soup", "salad", "sandwich", "pizza", "burger",
  "cake", "cookie", "chocolate", "candy", "sugar", "honey", "salt", "pepper",
  "coffee", "tea", "juice", "water", "wine", "beer", "soda", "smoothie",
  "carrot", "potato", "tomato", "onion", "garlic", "lettuce", "cucumber", "corn",

  // Body Parts
  "head", "face", "eye", "ear", "nose", "mouth", "tongue", "tooth",
  "hair", "neck", "shoulder", "arm", "elbow", "hand", "finger", "thumb",
  "chest", "heart", "lung", "stomach", "back", "spine", "bone", "muscle",
  "leg", "knee", "foot", "toe", "ankle", "heel", "skin", "blood",
  "brain", "nerve", "vein", "liver", "kidney", "rib", "skull", "jaw",

  // Household Items
  "chair", "table", "bed", "sofa", "desk", "lamp", "mirror", "clock",
  "door", "window", "wall", "floor", "ceiling", "roof", "stairs", "fence",
  "cup", "plate", "bowl", "spoon", "fork", "knife", "pot", "pan",
  "towel", "soap", "brush", "comb", "pillow", "blanket", "curtain", "carpet",
  "phone", "computer", "television", "radio", "camera", "speaker", "keyboard", "screen",
  "book", "pen", "paper", "pencil", "notebook", "envelope", "stamp", "letter",

  // Clothing & Accessories
  "shirt", "pants", "dress", "skirt", "jacket", "coat", "sweater", "vest",
  "shoe", "boot", "sandal", "sock", "hat", "cap", "scarf", "glove",
  "belt", "tie", "button", "zipper", "pocket", "collar", "sleeve", "hem",
  "ring", "necklace", "bracelet", "earring", "watch", "glasses", "wallet", "purse",

  // Transportation
  "car", "truck", "bus", "train", "plane", "boat", "ship", "bicycle",
  "motorcycle", "helicopter", "rocket", "submarine", "taxi", "ambulance", "tractor", "van",
  "wheel", "engine", "tire", "brake", "steering", "seat", "mirror", "trunk",
  "road", "highway", "bridge", "tunnel", "airport", "station", "harbor", "garage",

  // Buildings & Places
  "house", "apartment", "castle", "palace", "tower", "cabin", "tent", "hut",
  "school", "church", "hospital", "library", "museum", "theater", "stadium", "gym",
  "store", "market", "mall", "restaurant", "cafe", "bar", "hotel", "motel",
  "office", "factory", "warehouse", "bank", "prison", "courthouse", "temple", "mosque",
  "park", "garden", "farm", "zoo", "beach", "pool", "playground", "cemetery",

  // Work & Tools
  "hammer", "nail", "screw", "drill", "saw", "wrench", "pliers", "screwdriver",
  "ladder", "rope", "chain", "wire", "tape", "glue", "paint", "brush",
  "needle", "thread", "scissors", "ruler", "scale", "compass", "level", "shovel",
  "bucket", "basket", "box", "bag", "container", "barrel", "crate", "bin",

  // Music & Art
  "guitar", "piano", "drum", "violin", "flute", "trumpet", "saxophone", "harp",
  "song", "melody", "rhythm", "beat", "note", "chord", "harmony", "tune",
  "paint", "canvas", "brush", "sculpture", "statue", "portrait", "sketch", "drawing",
  "dance", "ballet", "jazz", "opera", "concert", "stage", "microphone", "speaker",

  // Sports & Games
  "ball", "bat", "racket", "net", "goal", "hoop", "club", "stick",
  "soccer", "basketball", "tennis", "golf", "baseball", "hockey", "volleyball", "rugby",
  "swimming", "running", "jumping", "climbing", "skiing", "surfing", "skating", "boxing",
  "chess", "cards", "dice", "puzzle", "board", "token", "score", "trophy",

  // Science & Technology
  "atom", "molecule", "cell", "gene", "virus", "bacteria", "protein", "acid",
  "magnet", "battery", "circuit", "wire", "signal", "wave", "laser", "radar",
  "robot", "machine", "motor", "gear", "lever", "pulley", "spring", "valve",
  "telescope", "microscope", "thermometer", "compass", "calculator", "satellite", "antenna", "sensor",

  // Space & Astronomy
  "planet", "comet", "asteroid", "meteor", "galaxy", "nebula", "orbit", "gravity",
  "astronaut", "rocket", "spacecraft", "shuttle", "telescope", "observatory", "crater", "eclipse",

  // Weather & Seasons
  "spring", "summer", "autumn", "winter", "season", "temperature", "humidity", "pressure",
  "breeze", "gust", "tornado", "hurricane", "blizzard", "drought", "flood", "hail",

  // Time & Measurement
  "second", "minute", "hour", "day", "week", "month", "year", "decade",
  "inch", "foot", "yard", "mile", "meter", "pound", "ounce", "gallon",

  // Emotions & Concepts
  "love", "hate", "fear", "joy", "anger", "sadness", "hope", "peace",
  "dream", "memory", "thought", "idea", "secret", "mystery", "magic", "luck",
  "truth", "lie", "promise", "wish", "belief", "doubt", "faith", "trust",

  // Occupations
  "doctor", "nurse", "teacher", "student", "lawyer", "judge", "police", "soldier",
  "chef", "waiter", "farmer", "pilot", "driver", "captain", "engineer", "scientist",
  "artist", "writer", "actor", "singer", "dancer", "athlete", "coach", "referee",
  "builder", "plumber", "electrician", "mechanic", "carpenter", "painter", "gardener", "cleaner",

  // Family & Relationships
  "mother", "father", "sister", "brother", "daughter", "son", "grandmother", "grandfather",
  "aunt", "uncle", "cousin", "nephew", "niece", "husband", "wife", "friend",
  "neighbor", "stranger", "guest", "host", "partner", "colleague", "boss", "employee",

  // Materials & Substances
  "wood", "metal", "plastic", "glass", "rubber", "leather", "cotton", "silk",
  "wool", "paper", "cardboard", "concrete", "brick", "steel", "iron", "copper",
  "silver", "bronze", "marble", "granite", "ceramic", "porcelain", "velvet", "denim",

  // Events & Occasions
  "birthday", "wedding", "funeral", "graduation", "holiday", "festival", "party", "ceremony",
  "meeting", "interview", "exam", "trial", "election", "parade", "concert", "game",

  // Communication
  "word", "sentence", "paragraph", "story", "poem", "speech", "message", "signal",
  "language", "alphabet", "letter", "number", "symbol", "code", "password", "name",

  // War & Conflict
  "sword", "shield", "arrow", "bow", "spear", "cannon", "bullet", "bomb",
  "army", "navy", "battle", "war", "peace", "treaty", "victory", "defeat",

  // Miscellaneous Common Objects
  "key", "lock", "door", "gate", "fence", "wall", "bridge", "path",
  "flag", "sign", "map", "compass", "ticket", "coin", "bill", "receipt",
  "gift", "toy", "doll", "balloon", "candle", "match", "lighter", "flashlight",
  "umbrella", "fan", "heater", "cooler", "filter", "pump", "tank", "pipe",

  // Additional Nature
  "wave", "tide", "current", "shore", "coast", "cliff", "cave", "hill",
  "pond", "stream", "creek", "spring", "well", "fountain", "dam", "marsh",

  // Additional Technology
  "laptop", "tablet", "printer", "scanner", "monitor", "mouse", "cable", "charger",
  "software", "website", "email", "internet", "network", "server", "database", "cloud",

  // Additional Food
  "bacon", "sausage", "ham", "steak", "shrimp", "salmon", "tuna", "lobster",
  "mushroom", "spinach", "broccoli", "cauliflower", "celery", "pepper", "bean", "pea",
  "strawberry", "blueberry", "raspberry", "watermelon", "pineapple", "coconut", "avocado", "olive",
];

/**
 * Get a random word from the bank
 */
export function getRandomWord(): string {
  return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
}

/**
 * Get two different random words from the bank
 */
export function getRandomWordPair(): { startWord: string; targetWord: string } {
  const startIndex = Math.floor(Math.random() * WORD_BANK.length);
  let targetIndex = Math.floor(Math.random() * WORD_BANK.length);

  // Ensure we don't pick the same word
  while (targetIndex === startIndex) {
    targetIndex = Math.floor(Math.random() * WORD_BANK.length);
  }

  return {
    startWord: WORD_BANK[startIndex],
    targetWord: WORD_BANK[targetIndex],
  };
}

/**
 * Check if a word exists in the bank
 */
export function wordExistsInBank(word: string): boolean {
  return WORD_BANK.includes(word.toLowerCase());
}

/**
 * Get the total number of words in the bank
 */
export function getWordBankSize(): number {
  return WORD_BANK.length;
}
