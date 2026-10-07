CREATE TABLE IF NOT EXISTS players (
  registration_id TEXT NOT NULL,
  board_id TEXT NOT NULL,
  game_code TEXT NOT NULL,
  player_name TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  ip_address TEXT NOT NULL,
  PRIMARY KEY (game_code, registration_id)
);

CREATE INDEX IF NOT EXISTS players_updated_at ON players(updated_at_ms DESC);
