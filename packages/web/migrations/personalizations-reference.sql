-- Additive: existing orders have no reference selection.
ALTER TABLE personalizations ADD COLUMN reference_product TEXT;
ALTER TABLE personalizations ADD COLUMN reference_orientation TEXT;