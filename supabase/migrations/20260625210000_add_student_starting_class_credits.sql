-- Default prepaid sessions to grant when a student is enrolled in a class.

ALTER TABLE students
  ADD COLUMN starting_class_credits integer NOT NULL DEFAULT 10
  CHECK (starting_class_credits >= 0 AND starting_class_credits <= 500);

COMMENT ON COLUMN students.starting_class_credits IS
  'Prepaid sessions to add per class when this student is enrolled.';
