-- Front desk staff: position + hourly rate on teachers, daily hour logs.

CREATE TYPE public.staff_position AS ENUM ('teacher', 'front_desk');

ALTER TABLE public.teachers
  ADD COLUMN position public.staff_position NOT NULL DEFAULT 'teacher',
  ADD COLUMN hourly_rate_cents integer
    CHECK (hourly_rate_cents IS NULL OR hourly_rate_cents >= 0);

COMMENT ON COLUMN public.teachers.position IS
  'Role at the school: teaching tutor or front desk (no classes).';
COMMENT ON COLUMN public.teachers.hourly_rate_cents IS
  'Hourly pay rate in cents for front desk staff.';

CREATE TABLE public.front_desk_hour_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  teacher_id bigint NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  work_date date NOT NULL,
  hours numeric(5, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  rate_cents integer NOT NULL CHECK (rate_cents >= 0),
  notes text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, work_date)
);

CREATE INDEX front_desk_hour_logs_teacher_id_idx
  ON public.front_desk_hour_logs (teacher_id);
CREATE INDEX front_desk_hour_logs_work_date_idx
  ON public.front_desk_hour_logs (work_date DESC);

COMMENT ON TABLE public.front_desk_hour_logs IS
  'Daily hours worked by front desk staff, with rate snapshot for pay.';

ALTER TABLE public.front_desk_hour_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view front desk hour logs"
  ON public.front_desk_hour_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff_accounts v WHERE v.id = auth.uid() AND v.is_active));

CREATE POLICY "Active staff can insert front desk hour logs"
  ON public.front_desk_hour_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.staff_accounts v WHERE v.id = auth.uid() AND v.is_active));

CREATE POLICY "Active staff can update front desk hour logs"
  ON public.front_desk_hour_logs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff_accounts v WHERE v.id = auth.uid() AND v.is_active))
  WITH CHECK (EXISTS (SELECT 1 FROM public.staff_accounts v WHERE v.id = auth.uid() AND v.is_active));

CREATE POLICY "Active staff can delete front desk hour logs"
  ON public.front_desk_hour_logs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff_accounts v WHERE v.id = auth.uid() AND v.is_active));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.front_desk_hour_logs TO authenticated;
GRANT ALL ON public.front_desk_hour_logs TO service_role;
GRANT USAGE ON TYPE public.staff_position TO authenticated, service_role;
