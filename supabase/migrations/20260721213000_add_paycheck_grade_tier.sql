-- Pay rates and paycheck lines keyed by subject grade tier (G0-2, G3-4, …)
-- so merged private classes with mixed enrollment grades can have separate rates.

ALTER TABLE teacher_class_pay_rates
  ADD COLUMN IF NOT EXISTS grade_tier text NOT NULL DEFAULT 'G0-2';

ALTER TABLE teacher_class_pay_rates
  DROP CONSTRAINT IF EXISTS teacher_class_pay_rates_pkey;

ALTER TABLE teacher_class_pay_rates
  ADD PRIMARY KEY (teacher_id, class_id, grade_tier);

COMMENT ON COLUMN teacher_class_pay_rates.grade_tier IS
  'Enrollment grade tier (G0-2, G3-4, G5-6, G7-8, Performance).';

ALTER TABLE teacher_paycheck_lines
  ADD COLUMN IF NOT EXISTS grade_tier text NOT NULL DEFAULT 'G0-2';

ALTER TABLE teacher_paycheck_lines
  DROP CONSTRAINT IF EXISTS teacher_paycheck_lines_unique;

ALTER TABLE teacher_paycheck_lines
  ADD CONSTRAINT teacher_paycheck_lines_unique
    UNIQUE (paycheck_id, class_id, grade_tier);

COMMENT ON COLUMN teacher_paycheck_lines.grade_tier IS
  'Grade tier this paycheck line covers for the class subject.';

DROP FUNCTION IF EXISTS public.get_teacher_class_pay_rates(bigint);
DROP FUNCTION IF EXISTS public.upsert_teacher_class_pay_rate(bigint, bigint, integer, uuid);

CREATE OR REPLACE FUNCTION public.get_teacher_class_pay_rates(p_teacher_id bigint)
RETURNS TABLE (class_id bigint, grade_tier text, rate_cents integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tcpr.class_id, tcpr.grade_tier, tcpr.rate_cents
  FROM teacher_class_pay_rates AS tcpr
  WHERE tcpr.teacher_id = p_teacher_id;
$$;

CREATE OR REPLACE FUNCTION public.upsert_teacher_class_pay_rate(
  p_teacher_id bigint,
  p_class_id bigint,
  p_rate_cents integer,
  p_updated_by uuid DEFAULT NULL,
  p_grade_tier text DEFAULT 'G0-2'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grade_tier text := COALESCE(NULLIF(trim(p_grade_tier), ''), 'G0-2');
BEGIN
  IF p_rate_cents < 0 THEN
    RAISE EXCEPTION 'Rate must be zero or greater';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM classes AS c
    WHERE c.id = p_class_id
      AND c.teacher_id = p_teacher_id
  ) THEN
    RAISE EXCEPTION 'Class is not assigned to this teacher';
  END IF;

  INSERT INTO teacher_class_pay_rates (
    teacher_id,
    class_id,
    grade_tier,
    rate_cents,
    updated_by,
    updated_at
  )
  VALUES (
    p_teacher_id,
    p_class_id,
    v_grade_tier,
    p_rate_cents,
    p_updated_by,
    now()
  )
  ON CONFLICT (teacher_id, class_id, grade_tier) DO UPDATE
  SET
    rate_cents = EXCLUDED.rate_cents,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_class_pay_rates TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_teacher_class_pay_rate TO authenticated;

CREATE OR REPLACE FUNCTION public.record_teacher_paycheck(
  p_teacher_id bigint,
  p_year integer,
  p_month integer,
  p_lines jsonb,
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
  v_month_name text;
  v_total_sessions integer := 0;
  v_total_amount_cents integer := 0;
  v_line jsonb;
  v_session_count integer;
  v_rate_cents integer;
  v_line_total_cents integer;
  v_class_id bigint;
  v_grade_tier text;
  v_statement_entry_id bigint;
  v_entry_date date;
BEGIN
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Invalid month';
  END IF;

  IF jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'At least one paycheck line is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM teacher_paychecks AS tp
    WHERE tp.teacher_id = p_teacher_id
      AND tp.year = p_year
      AND tp.month = p_month
  ) THEN
    RAISE EXCEPTION 'Paycheck already recorded for this period';
  END IF;

  SELECT
  CASE
    WHEN t.last_name IS NULL THEN t.first_name
    ELSE t.first_name || ' ' || t.last_name
  END
  INTO v_teacher_name
  FROM teachers AS t
  WHERE t.id = p_teacher_id;

  IF v_teacher_name IS NULL THEN
    RAISE EXCEPTION 'Teacher not found';
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_class_id := (v_line ->> 'class_id')::bigint;
    v_session_count := COALESCE((v_line ->> 'session_count')::integer, 0);
    v_rate_cents := COALESCE((v_line ->> 'rate_cents')::integer, 0);
    v_grade_tier := COALESCE(NULLIF(trim(v_line ->> 'grade_tier'), ''), 'G0-2');

    IF v_class_id IS NULL OR v_session_count < 0 OR v_rate_cents < 0 THEN
      RAISE EXCEPTION 'Invalid paycheck line';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM classes AS c
      WHERE c.id = v_class_id
        AND c.teacher_id = p_teacher_id
    ) THEN
      RAISE EXCEPTION 'Class % is not assigned to this teacher', v_class_id;
    END IF;

    v_line_total_cents := v_session_count * v_rate_cents;
    v_total_sessions := v_total_sessions + v_session_count;
    v_total_amount_cents := v_total_amount_cents + v_line_total_cents;
  END LOOP;

  IF v_total_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Paycheck total must be greater than zero';
  END IF;

  v_month_name := to_char(make_date(p_year, p_month, 1), 'FMMonth YYYY');
  v_entry_date := (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date;

  INSERT INTO teacher_paychecks (
    teacher_id,
    year,
    month,
    total_sessions,
    total_amount_cents,
    created_by
  )
  VALUES (
    p_teacher_id,
    p_year,
    p_month,
    v_total_sessions,
    v_total_amount_cents,
    p_created_by
  )
  RETURNING id INTO v_paycheck_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_class_id := (v_line ->> 'class_id')::bigint;
    v_session_count := COALESCE((v_line ->> 'session_count')::integer, 0);
    v_rate_cents := COALESCE((v_line ->> 'rate_cents')::integer, 0);
    v_grade_tier := COALESCE(NULLIF(trim(v_line ->> 'grade_tier'), ''), 'G0-2');
    v_line_total_cents := v_session_count * v_rate_cents;

    INSERT INTO teacher_paycheck_lines (
      paycheck_id,
      class_id,
      grade_tier,
      session_count,
      rate_cents,
      line_total_cents
    )
    VALUES (
      v_paycheck_id,
      v_class_id,
      v_grade_tier,
      v_session_count,
      v_rate_cents,
      v_line_total_cents
    );
  END LOOP;

  INSERT INTO statement_entries (
    entry_type,
    amount_cents,
    description,
    entry_date,
    teacher_paycheck_id,
    created_by
  )
  VALUES (
    'expense',
    v_total_amount_cents,
    'Paycheck for ' || v_teacher_name || ' — ' || v_month_name
      || ' (' || v_total_sessions || ' classes)',
    v_entry_date,
    v_paycheck_id,
    p_created_by
  )
  RETURNING id INTO v_statement_entry_id;

  UPDATE teacher_paychecks
  SET statement_entry_id = v_statement_entry_id
  WHERE id = v_paycheck_id;

  RETURN v_paycheck_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
