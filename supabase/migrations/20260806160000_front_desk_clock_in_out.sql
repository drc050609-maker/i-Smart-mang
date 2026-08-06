-- Clock-in / clock-out times for front desk daily logs.

ALTER TABLE public.front_desk_hour_logs
  ADD COLUMN IF NOT EXISTS clock_in time without time zone,
  ADD COLUMN IF NOT EXISTS clock_out time without time zone;

UPDATE public.front_desk_hour_logs
SET
  clock_in = TIME '09:00',
  clock_out = (TIME '09:00' + (hours * INTERVAL '1 hour'))::time
WHERE clock_in IS NULL;

ALTER TABLE public.front_desk_hour_logs
  ALTER COLUMN clock_in SET NOT NULL,
  ALTER COLUMN clock_out SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'front_desk_hour_logs_clock_order_check'
  ) THEN
    ALTER TABLE public.front_desk_hour_logs
      ADD CONSTRAINT front_desk_hour_logs_clock_order_check
      CHECK (clock_out > clock_in);
  END IF;
END $$;

COMMENT ON COLUMN public.front_desk_hour_logs.clock_in IS 'Time staff arrived at work.';
COMMENT ON COLUMN public.front_desk_hour_logs.clock_out IS 'Time staff left work.';
