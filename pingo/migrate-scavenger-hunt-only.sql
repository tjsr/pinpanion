-- Apply once to existing Pingo D1 databases before deploying hunt-only games.
ALTER TABLE games ADD COLUMN scavenger_hunt_only INTEGER NOT NULL DEFAULT 0 CHECK (scavenger_hunt_only IN (0, 1));
