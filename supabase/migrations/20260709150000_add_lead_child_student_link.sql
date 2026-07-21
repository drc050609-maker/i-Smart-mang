-- Link converted lead children to official student records.

ALTER TABLE lead_children
  ADD COLUMN student_id bigint REFERENCES public.students (id) ON DELETE SET NULL,
  ADD COLUMN converted_at timestamptz;

CREATE UNIQUE INDEX lead_children_student_id_idx
  ON lead_children (student_id)
  WHERE student_id IS NOT NULL;

COMMENT ON COLUMN lead_children.student_id IS
  'Official student record created when this lead child is converted.';

COMMENT ON COLUMN lead_children.converted_at IS
  'When this lead child was converted to an official student.';
