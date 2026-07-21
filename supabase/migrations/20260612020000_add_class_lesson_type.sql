ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS lesson_type text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.classes'::regclass
      AND conname = 'classes_lesson_type_check'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT classes_lesson_type_check
      CHECK (lesson_type IS NULL OR lesson_type IN ('private', 'group', 'trial'));
  END IF;
END $$;

COMMENT ON COLUMN public.classes.lesson_type IS 'Class format: private, group, or trial lesson.';
