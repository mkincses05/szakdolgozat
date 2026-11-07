-- An aborted match (for example on server shutdown) has players without a position: those still
-- playing, and those who forfeited, because forfeits are ranked only when a match ends (R23). A
-- finished player always has a position; players who share one after a blocked game (R18) have the
-- same value.

ALTER TABLE match_players ALTER COLUMN finish_position DROP NOT NULL;

ALTER TABLE match_players
  ADD CONSTRAINT match_players_finished_has_position
  CHECK (finish_position IS NOT NULL OR final_status <> 'finished');
