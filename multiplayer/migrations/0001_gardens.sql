CREATE TABLE gardens (
  code TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  garden_code TEXT NOT NULL REFERENCES gardens(code) ON DELETE CASCADE,
  secret_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  species INTEGER NOT NULL,
  growth INTEGER NOT NULL,
  completed INTEGER NOT NULL,
  planted INTEGER NOT NULL,
  garden_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX members_by_garden ON members(garden_code, joined_at);
