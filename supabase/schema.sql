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
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  game_mode TEXT DEFAULT 'speed' CHECK (game_mode IN ('speed', 'shortest')),
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
  rejection_reason TEXT,
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(word1, word2)
);

-- Cached word pairs for game generation
CREATE TABLE IF NOT EXISTS word_pairs (
  id SERIAL PRIMARY KEY,
  start_word TEXT NOT NULL,
  target_word TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  reasoning TEXT,
  used_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(start_word, target_word)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_players_room ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_word_associations_words ON word_associations(word1, word2);
CREATE INDEX IF NOT EXISTS idx_word_pairs_difficulty ON word_pairs(difficulty);
CREATE INDEX IF NOT EXISTS idx_word_pairs_used ON word_pairs(used_count, last_used_at);

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
CREATE POLICY "Allow all for word_pairs" ON word_pairs FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- DAILY CHALLENGE TABLES
-- =============================================

-- Daily puzzles (one per day for all players)
CREATE TABLE IF NOT EXISTS daily_puzzles (
  id SERIAL PRIMARY KEY,
  puzzle_date DATE UNIQUE NOT NULL,
  start_word TEXT NOT NULL,
  target_word TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player completions for daily puzzles
CREATE TABLE IF NOT EXISTS daily_completions (
  id SERIAL PRIMARY KEY,
  puzzle_id INT REFERENCES daily_puzzles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  player_name TEXT,
  chain JSONB NOT NULL,
  word_count INT NOT NULL,
  share_code TEXT UNIQUE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(puzzle_id, session_id)
);

-- Player stats (streaks, averages)
CREATE TABLE IF NOT EXISTS player_stats (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  player_name TEXT,
  total_completions INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  max_streak INT DEFAULT 0,
  best_word_count INT,
  last_completed_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for daily challenge tables
CREATE INDEX IF NOT EXISTS idx_daily_puzzles_date ON daily_puzzles(puzzle_date);
CREATE INDEX IF NOT EXISTS idx_daily_completions_puzzle ON daily_completions(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_daily_completions_session ON daily_completions(session_id);
CREATE INDEX IF NOT EXISTS idx_daily_completions_word_count ON daily_completions(word_count);
CREATE INDEX IF NOT EXISTS idx_player_stats_session ON player_stats(session_id);

-- RLS for daily challenge tables
ALTER TABLE daily_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for daily_puzzles" ON daily_puzzles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for daily_completions" ON daily_completions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for player_stats" ON player_stats FOR ALL USING (true) WITH CHECK (true);
