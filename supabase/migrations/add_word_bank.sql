-- Word bank table for storing AI-generated words
-- Static words are stored in code, AI-added words are stored here

CREATE TABLE IF NOT EXISTS word_bank (
  id SERIAL PRIMARY KEY,
  word TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'ai' CHECK (source IN ('ai', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_word_bank_word ON word_bank(word);
CREATE INDEX IF NOT EXISTS idx_word_bank_source ON word_bank(source);

-- RLS
ALTER TABLE word_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for word_bank" ON word_bank FOR ALL USING (true) WITH CHECK (true);
