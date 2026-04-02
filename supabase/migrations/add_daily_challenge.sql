-- Migration: Add Daily Challenge Tables
-- Run this in your Supabase SQL Editor

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

-- Drop existing policies if they exist (to avoid conflicts on re-run)
DROP POLICY IF EXISTS "Allow all for daily_puzzles" ON daily_puzzles;
DROP POLICY IF EXISTS "Allow all for daily_completions" ON daily_completions;
DROP POLICY IF EXISTS "Allow all for player_stats" ON player_stats;

-- Create policies
CREATE POLICY "Allow all for daily_puzzles" ON daily_puzzles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for daily_completions" ON daily_completions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for player_stats" ON player_stats FOR ALL USING (true) WITH CHECK (true);
