CREATE TABLE IF NOT EXISTS games (
  game_code TEXT PRIMARY KEY,
  start_ms INTEGER NOT NULL,
  interval_ms INTEGER NOT NULL,
  pool_size INTEGER NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS games_created_at ON games(created_at_ms DESC);

CREATE TABLE IF NOT EXISTS game_successors (
  game_code TEXT PRIMARY KEY,
  successor_game_code TEXT NOT NULL UNIQUE,
  FOREIGN KEY (game_code) REFERENCES games(game_code)
);

CREATE TABLE IF NOT EXISTS game_boards (
  game_code TEXT NOT NULL,
  board_code TEXT NOT NULL UNIQUE,
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (game_code, board_code),
  FOREIGN KEY (game_code) REFERENCES games(game_code)
);
