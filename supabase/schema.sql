-- WordBridge Database Schema
-- Run this in your Supabase SQL Editor

-- Word pairs table is no longer needed for game logic
-- Word pairs are now generated on-demand using AI (OpenAI)
-- This table can be kept for logging/analytics purposes if desired

-- DROP TABLE IF EXISTS word_pairs;

-- Game rooms for multiplayer
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'waiting', -- waiting, playing, finished
  start_word TEXT NOT NULL,
  target_word TEXT NOT NULL,
  time_limit INT DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  winner_id UUID
);

-- Players in rooms
CREATE TABLE IF NOT EXISTS room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  chain JSONB DEFAULT '[]',
  is_ready BOOLEAN DEFAULT FALSE,
  finished_at TIMESTAMPTZ,
  is_winner BOOLEAN DEFAULT FALSE,
  wants_rematch BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, player_name)
);

-- Word associations cache (AI validated)
CREATE TABLE IF NOT EXISTS word_associations (
  id SERIAL PRIMARY KEY,
  word1 TEXT NOT NULL,
  word2 TEXT NOT NULL,
  is_valid BOOLEAN NOT NULL,
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(word1, word2)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_players_room ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_word_associations_words ON word_associations(word1, word2);

-- Enable realtime for multiplayer
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;

-- Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE word_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_associations ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for game tables (no auth required for MVP)
CREATE POLICY "Allow all for rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for room_players" ON room_players FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all for word_pairs" ON word_pairs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for word_associations" ON word_associations FOR ALL USING (true) WITH CHECK (true);
