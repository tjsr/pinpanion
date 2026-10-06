CREATE TABLE players_next (
  registration_id TEXT NOT NULL,
  board_id TEXT NOT NULL,
  game_code TEXT NOT NULL,
  player_name TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  ip_address TEXT NOT NULL,
  PRIMARY KEY (game_code, registration_id)
);

INSERT INTO players_next (registration_id, board_id, game_code, player_name, updated_at_ms, ip_address)
SELECT lower(hex(randomblob(16))), board_id, game_code, player_name, updated_at_ms, ip_address FROM players;

DROP TABLE players;
ALTER TABLE players_next RENAME TO players;
CREATE INDEX players_updated_at ON players(updated_at_ms DESC);
