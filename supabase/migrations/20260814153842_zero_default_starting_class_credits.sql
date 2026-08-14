-- New students start with 0 prepaid class sessions. Existing rows are unchanged.

ALTER TABLE students
  ALTER COLUMN starting_class_credits SET DEFAULT 0;
