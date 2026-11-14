-- A match with computer players ends when no human player is left in it (R21, docs/03 section 3).

ALTER TABLE matches DROP CONSTRAINT matches_end_reason_check;

ALTER TABLE matches
  ADD CONSTRAINT matches_end_reason_check
  CHECK (end_reason IN ('last_player', 'blocked', 'forfeits', 'no_humans', 'aborted'));
