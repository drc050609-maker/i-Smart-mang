-- Monthly front desk pay → statement expenses (mirrors teacher_paychecks).

CREATE TABLE public.front_desk_paychecks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  teacher_id bigint NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  total_minutes integer NOT NULL CHECK (total_minutes > 0),
  total_amount_cents integer NOT NULL CHECK (total_amount_cents > 0),
  statement_entry_id bigint REFERENCES public.statement_entries (id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT front_desk_paychecks_teacher_period_unique UNIQUE (teacher_id, year, month)
);

CREATE INDEX front_desk_paychecks_teacher_id_idx
  ON public.front_desk_paychecks (teacher_id);
CREATE INDEX front_desk_paychecks_period_idx
  ON public.front_desk_paychecks (year DESC, month DESC);

COMMENT ON TABLE public.front_desk_paychecks IS
  'Monthly front desk pay totals linked to statement expenses.';

ALTER TABLE public.front_desk_paychecks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view front desk paychecks"
  ON public.front_desk_paychecks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid()
        AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can insert front desk paychecks"
  ON public.front_desk_paychecks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

GRANT SELECT, INSERT ON public.front_desk_paychecks TO authenticated;
GRANT ALL ON public.front_desk_paychecks TO service_role;

ALTER TABLE public.statement_entries
  ADD COLUMN IF NOT EXISTS front_desk_paycheck_id bigint
    REFERENCES public.front_desk_paychecks (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS statement_entries_front_desk_paycheck_id_idx
  ON public.statement_entries (front_desk_paycheck_id)
  WHERE front_desk_paycheck_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_front_desk_paycheck(
  p_teacher_id bigint,
  p_year integer,
  p_month integer,
  p_created_by uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paycheck_id bigint;
  v_teacher_name text;
  v_position public.staff_position;
  v_month_name text;
  v_total_minutes integer := 0;
  v_total_amount_cents integer := 0;
  v_statement_entry_id bigint;
  v_entry_date date;
  v_hours_label text;
BEGIN
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Invalid month';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.front_desk_paychecks AS fp
    WHERE fp.teacher_id = p_teacher_id
      AND fp.year = p_year
      AND fp.month = p_month
  ) THEN
    RAISE EXCEPTION 'Front desk pay already recorded for this period';
  END IF;

  SELECT
    CASE
      WHEN t.last_name IS NULL THEN t.first_name
      ELSE t.first_name || ' ' || t.last_name
    END,
    t.position
  INTO v_teacher_name, v_position
  FROM public.teachers AS t
  WHERE t.id = p_teacher_id;

  IF v_teacher_name IS NULL THEN
    RAISE EXCEPTION 'Staff not found';
  END IF;

  IF v_position IS DISTINCT FROM 'front_desk' THEN
    RAISE EXCEPTION 'Only front desk staff can record hourly pay';
  END IF;

  SELECT
    COALESCE(
      SUM(
        GREATEST(
          ROUND(EXTRACT(EPOCH FROM (h.clock_out - h.clock_in)) / 60.0)::integer,
          0
        )
      ),
      0
    ),
    COALESCE(
      SUM(ROUND(h.hours * h.rate_cents)::integer),
      0
    )
  INTO v_total_minutes, v_total_amount_cents
  FROM public.front_desk_hour_logs AS h
  WHERE h.teacher_id = p_teacher_id
    AND EXTRACT(YEAR FROM h.work_date)::integer = p_year
    AND EXTRACT(MONTH FROM h.work_date)::integer = p_month;

  IF v_total_amount_cents <= 0 OR v_total_minutes <= 0 THEN
    RAISE EXCEPTION 'No front desk hours to submit for this period';
  END IF;

  v_month_name := to_char(make_date(p_year, p_month, 1), 'FMMonth YYYY');
  v_entry_date := (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date;
  v_hours_label :=
    (v_total_minutes / 60)::text
    || 'h '
    || (v_total_minutes % 60)::text
    || 'm';

  INSERT INTO public.front_desk_paychecks (
    teacher_id,
    year,
    month,
    total_minutes,
    total_amount_cents,
    created_by
  )
  VALUES (
    p_teacher_id,
    p_year,
    p_month,
    v_total_minutes,
    v_total_amount_cents,
    p_created_by
  )
  RETURNING id INTO v_paycheck_id;

  INSERT INTO public.statement_entries (
    entry_type,
    amount_cents,
    description,
    entry_date,
    front_desk_paycheck_id,
    created_by
  )
  VALUES (
    'expense',
    v_total_amount_cents,
    'Front desk pay for ' || v_teacher_name || ' — ' || v_month_name
      || ' (' || v_hours_label || ')',
    v_entry_date,
    v_paycheck_id,
    p_created_by
  )
  RETURNING id INTO v_statement_entry_id;

  UPDATE public.front_desk_paychecks
  SET statement_entry_id = v_statement_entry_id
  WHERE id = v_paycheck_id;

  RETURN v_paycheck_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_front_desk_paycheck TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_front_desk_paycheck TO service_role;
