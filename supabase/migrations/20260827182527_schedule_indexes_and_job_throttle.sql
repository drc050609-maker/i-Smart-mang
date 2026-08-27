-- Hot-path indexes for schedule/dashboard queries, plus a shared job
-- throttle so serverless instances do not all run due-session catch-up.

CREATE INDEX IF NOT EXISTS enrollments_class_id_idx
  ON public.enrollments ("class id");

CREATE INDEX IF NOT EXISTS enrollments_student_id_idx
  ON public.enrollments ("student id");

CREATE INDEX IF NOT EXISTS classes_teacher_id_idx
  ON public.classes (teacher_id);

CREATE INDEX IF NOT EXISTS class_schedules_recurring_dow_idx
  ON public.class_schedules (schedule_day_of_week)
  WHERE is_recurring;

CREATE INDEX IF NOT EXISTS class_schedules_oneoff_date_idx
  ON public.class_schedules (schedule_date)
  WHERE (NOT is_recurring) AND schedule_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.job_heartbeats (
  job_name text PRIMARY KEY,
  last_run_at timestamptz NOT NULL DEFAULT '-infinity'::timestamptz
);

COMMENT ON TABLE public.job_heartbeats IS
  'Shared throttle timestamps for background jobs. Serverless instances have no shared memory.';

ALTER TABLE public.job_heartbeats ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.job_heartbeats FROM PUBLIC;
REVOKE ALL ON TABLE public.job_heartbeats FROM anon;
REVOKE ALL ON TABLE public.job_heartbeats FROM authenticated;

CREATE OR REPLACE FUNCTION public.try_claim_job(
  p_job_name text,
  p_throttle_seconds integer DEFAULT 900
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed boolean := false;
BEGIN
  IF p_job_name IS NULL OR length(trim(p_job_name)) = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.job_heartbeats (job_name, last_run_at)
  VALUES (trim(p_job_name), '-infinity'::timestamptz)
  ON CONFLICT (job_name) DO NOTHING;

  UPDATE public.job_heartbeats
  SET last_run_at = now()
  WHERE job_name = trim(p_job_name)
    AND last_run_at < now() - make_interval(secs => GREATEST(COALESCE(p_throttle_seconds, 0), 0))
  RETURNING true INTO claimed;

  RETURN COALESCE(claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.try_claim_job(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.try_claim_job(text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.try_claim_job(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.try_claim_job(text, integer) TO service_role;
