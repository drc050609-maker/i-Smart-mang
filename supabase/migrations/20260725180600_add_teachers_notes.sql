-- Free-form notes for teachers (availability, email, tuner role, etc.)

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.teachers.notes IS
  'Free-form staff notes: availability, email, role (e.g. tuner), etc.';
