-- Additive migration only: no existing catalog or order tables modified.
CREATE TABLE IF NOT EXISTS personalizations (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  request_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  font_id TEXT NOT NULL,
  font_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  max_width_mm INTEGER NOT NULL DEFAULT 80,
  created_at TEXT NOT NULL
);