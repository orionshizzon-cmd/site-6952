-- Additive migration: never recreate personalizations or other site tables.
ALTER TABLE personalizations ADD COLUMN order_number INTEGER;
ALTER TABLE personalizations ADD COLUMN margin_mm REAL NOT NULL DEFAULT 0;
ALTER TABLE personalizations ADD COLUMN scale_pct INTEGER NOT NULL DEFAULT 100;
ALTER TABLE personalizations ADD COLUMN profile TEXT NOT NULL DEFAULT 'Personalizado';
ALTER TABLE personalizations ADD COLUMN updated_at TEXT;
CREATE TABLE IF NOT EXISTS personalization_numbers (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE);
INSERT OR IGNORE INTO personalization_numbers(code) SELECT code FROM personalizations ORDER BY created_at, code;
UPDATE personalizations SET order_number = (SELECT id FROM personalization_numbers WHERE personalization_numbers.code = personalizations.code) WHERE order_number IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS personalizations_order_number_unique ON personalizations(order_number);
CREATE TABLE IF NOT EXISTS personalization_presets (id TEXT PRIMARY KEY, name TEXT NOT NULL, max_width_mm REAL NOT NULL, margin_mm REAL NOT NULL, scale_pct INTEGER NOT NULL);
INSERT OR IGNORE INTO personalization_presets VALUES ('garrafas','Garrafas',70,2,100),('copos','Copos',80,2,100),('chaveiros','Chaveiros',30,1,100),('outros','Outros produtos',60,2,100);