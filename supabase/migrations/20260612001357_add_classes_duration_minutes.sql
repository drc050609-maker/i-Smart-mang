-- Class length in minutes (nullable).
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.classes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%duration_minutes%'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT classes_duration_minutes_positive
      CHECK (duration_minutes IS NULL OR duration_minutes > 0);
  END IF;
END $$;

COMMENT ON COLUMN public.classes.duration_minutes IS 'Class length in minutes.';
