-- Assign a recurring weekly schedule to every class that does not have one yet.
-- Times are staggered by class id so the calendar is spread across the week.
UPDATE public.classes
SET
  is_recurring = true,
  schedule_day_of_week = id % 7,
  schedule_date = NULL,
  schedule_start_time = (
    TIME '09:00:00' + ((id % 8) * INTERVAL '1 hour')
  )::time,
  schedule_end_time = (
    TIME '09:00:00' + ((id % 8) * INTERVAL '1 hour') +
    (COALESCE(duration_minutes, 60) * INTERVAL '1 minute')
  )::time
WHERE schedule_start_time IS NULL
   OR schedule_end_time IS NULL;
