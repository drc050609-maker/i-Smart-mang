-- Consolidate notes into family_history, then rename to description.
UPDATE leads
SET family_history = notes
WHERE (family_history IS NULL OR btrim(family_history) = '')
  AND notes IS NOT NULL
  AND btrim(notes) <> '';

UPDATE leads
SET family_history = family_history || E'\n\n' || notes
WHERE family_history IS NOT NULL
  AND btrim(family_history) <> ''
  AND notes IS NOT NULL
  AND btrim(notes) <> ''
  AND position(notes IN family_history) = 0;

ALTER TABLE leads RENAME COLUMN family_history TO description;
ALTER TABLE leads DROP COLUMN notes;
