CREATE TABLE IF NOT EXISTS scavenger_devices (
  game_code TEXT NOT NULL,
  device_id TEXT NOT NULL,
  time_zone TEXT NOT NULL,
  PRIMARY KEY (game_code, device_id)
);

CREATE TABLE IF NOT EXISTS scavenger_assignments (
  game_code TEXT NOT NULL,
  device_id TEXT NOT NULL,
  local_day TEXT NOT NULL,
  board_id TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (game_code, device_id, local_day)
);

CREATE INDEX IF NOT EXISTS scavenger_assignments_game_day
  ON scavenger_assignments(game_code, local_day);
