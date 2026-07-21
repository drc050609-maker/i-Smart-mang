-- Link private-lesson schedule slots to a student (nullable for shared/group times).
ALTER TABLE public.class_schedules
  ADD COLUMN student_id bigint REFERENCES public.students (id) ON DELETE SET NULL;

CREATE INDEX class_schedules_student_id_idx ON public.class_schedules (student_id);
CREATE INDEX class_schedules_class_student_idx ON public.class_schedules (class_id, student_id);

COMMENT ON COLUMN public.class_schedules.student_id IS
  'Optional student for this meeting slot (private lessons). Null for shared/group or unassigned slots.';
