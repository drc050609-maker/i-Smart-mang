ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.students.is_active IS 'When false, student is deactivated and hidden from enrollment pickers.';
COMMENT ON COLUMN public.teachers.is_active IS 'When false, tutor is deactivated and hidden from class assignment pickers.';
COMMENT ON COLUMN public.classes.is_active IS 'When false, class is deactivated and hidden from enrollment pickers.';
