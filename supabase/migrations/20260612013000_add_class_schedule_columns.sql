-- Weekly or one-time meeting schedule for a class.
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS schedule_day_of_week smallint,
  ADD COLUMN IF NOT EXISTS schedule_date date,
  ADD COLUMN IF NOT EXISTS schedule_start_time time,
  ADD COLUMN IF NOT EXISTS schedule_end_time time;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.classes'::regclass
      AND conname = 'classes_schedule_day_of_week_check'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT classes_schedule_day_of_week_check
      CHECK (schedule_day_of_week IS NULL OR (schedule_day_of_week >= 0 AND schedule_day_of_week <= 6));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.classes'::regclass
      AND conname = 'classes_schedule_times_check'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT classes_schedule_times_check
      CHECK (
        (schedule_start_time IS NULL AND schedule_end_time IS NULL)
        OR (schedule_start_time IS NOT NULL AND schedule_end_time IS NOT NULL AND schedule_end_time > schedule_start_time)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.classes'::regclass
      AND conname = 'classes_schedule_recurrence_check'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT classes_schedule_recurrence_check
      CHECK (
        (schedule_start_time IS NULL AND schedule_day_of_week IS NULL AND schedule_date IS NULL)
        OR (
          is_recurring = true
          AND schedule_day_of_week IS NOT NULL
          AND schedule_date IS NULL
        )
        OR (
          is_recurring = false
          AND schedule_date IS NOT NULL
          AND schedule_day_of_week IS NULL
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.classes.is_recurring IS 'True for weekly repeating classes; false for a one-time meeting.';
COMMENT ON COLUMN public.classes.schedule_day_of_week IS '0=Sunday through 6=Saturday; used when is_recurring is true.';
COMMENT ON COLUMN public.classes.schedule_date IS 'Specific meeting date; used when is_recurring is false.';
COMMENT ON COLUMN public.classes.schedule_start_time IS 'Local start time for the class meeting.';
COMMENT ON COLUMN public.classes.schedule_end_time IS 'Local end time for the class meeting.';
