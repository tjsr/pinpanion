CREATE TABLE IF NOT EXISTS game_info (
  game_code TEXT PRIMARY KEY,
  info_url TEXT NOT NULL DEFAULT '',
  tooltip_text TEXT NOT NULL DEFAULT ''
);
