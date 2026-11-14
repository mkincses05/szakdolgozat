-- Initial schema, described in docs/03-data-model-and-intelligent-player.md section 2.
-- `users` holds registered users only; their XP and counters are the single source of truth.
-- `matches` and `match_players` are a prunable statistics log; nothing is computed from them.

CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username        text NOT NULL CHECK (char_length(username) BETWEEN 1 AND 32),
  email           text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  display_name    text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 24),

  xp              bigint  NOT NULL DEFAULT 0 CHECK (xp >= 0),
  matches_played  integer NOT NULL DEFAULT 0 CHECK (matches_played >= 0),
  wins            integer NOT NULL DEFAULT 0 CHECK (wins >= 0),
  forfeits        integer NOT NULL DEFAULT 0 CHECK (forfeits >= 0),

  created_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),

  CHECK (wins + forfeits <= matches_played)
);
CREATE UNIQUE INDEX users_username_key ON users (lower(username));
CREATE UNIQUE INDEX users_email_key ON users (lower(email));
CREATE INDEX users_xp_idx ON users (xp DESC);

CREATE TABLE user_credentials (
  user_id        uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  -- argon2id in PHC string format
  password_hash  text NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_sessions (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- SHA-256 of the random login token; the token itself is never stored
  token_hash    bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL
);
CREATE INDEX auth_sessions_user_idx ON auth_sessions (user_id);
CREATE INDEX auth_sessions_expires_idx ON auth_sessions (expires_at);

CREATE TABLE matches (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seed             text NOT NULL,
  player_count     smallint NOT NULL CHECK (player_count BETWEEN 2 AND 8),
  turn_timeout_ms  integer NOT NULL CHECK (turn_timeout_ms > 0),
  started_at       timestamptz NOT NULL,
  ended_at         timestamptz NOT NULL,
  end_reason       text NOT NULL CHECK (end_reason IN ('last_player', 'blocked', 'forfeits', 'aborted')),
  -- empty when there is no winner, for example after an aborted match
  winner_seat      smallint CHECK (winner_seat BETWEEN 0 AND 7),
  CHECK (ended_at >= started_at),
  CHECK (winner_seat < player_count)
);
CREATE INDEX matches_ended_at_idx ON matches (ended_at);

CREATE TABLE match_players (
  match_id         bigint NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  seat             smallint NOT NULL CHECK (seat BETWEEN 0 AND 7),
  player_kind      text NOT NULL CHECK (player_kind IN ('guest', 'registered', 'bot')),
  -- registered players only; emptied when the user is deleted
  user_id          uuid REFERENCES users (id) ON DELETE SET NULL,
  bot_level        text CHECK (bot_level IN ('random', 'rule_based', 'heuristic', 'sampling')),
  display_name     text NOT NULL,
  final_status     text NOT NULL CHECK (final_status IN ('active', 'finished', 'forfeited')),
  -- shared by several players after a blocked game (R21)
  finish_position  smallint NOT NULL CHECK (finish_position BETWEEN 1 AND 8),
  xp_earned        integer NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  PRIMARY KEY (match_id, seat),
  UNIQUE (match_id, user_id),
  CHECK ((player_kind = 'bot') = (bot_level IS NOT NULL)),
  CHECK (player_kind = 'registered' OR (user_id IS NULL AND xp_earned = 0))
);
CREATE INDEX match_players_user_idx ON match_players (user_id);

-- The backend connects as wildhand_app. The development setup creates it as a login role; elsewhere
-- (CI, a fresh server) it is created here without login, so the grants below always apply.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wildhand_app') THEN
    CREATE ROLE wildhand_app NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO wildhand_app;
GRANT SELECT, INSERT, UPDATE ON users TO wildhand_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_credentials, auth_sessions TO wildhand_app;
-- The match log can only grow through the backend; pruning is done by the administrator role.
GRANT SELECT, INSERT ON matches, match_players TO wildhand_app;
GRANT USAGE ON SEQUENCE auth_sessions_id_seq, matches_id_seq TO wildhand_app;
