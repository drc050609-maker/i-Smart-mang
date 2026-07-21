-- Teacher paychecks: per-class session counts, rates, and linked statement expenses.

CREATE TABLE teacher_paychecks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  teacher_id bigint NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  total_sessions integer NOT NULL CHECK (total_sessions >= 0),
  total_amount_cents integer NOT NULL CHECK (total_amount_cents > 0),
  statement_entry_id bigint REFERENCES public.statement_entries (id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_paychecks_teacher_period_unique UNIQUE (teacher_id, year, month)
);

CREATE INDEX teacher_paychecks_teacher_id_idx ON teacher_paychecks (teacher_id);
CREATE INDEX teacher_paychecks_period_idx ON teacher_paychecks (year DESC, month DESC);

CREATE TABLE teacher_paycheck_lines (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paycheck_id bigint NOT NULL REFERENCES public.teacher_paychecks (id) ON DELETE CASCADE,
  class_id bigint NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  session_count integer NOT NULL CHECK (session_count >= 0),
  rate_cents integer NOT NULL CHECK (rate_cents >= 0),
  line_total_cents integer NOT NULL CHECK (line_total_cents >= 0),
  CONSTRAINT teacher_paycheck_lines_unique UNIQUE (paycheck_id, class_id)
);

CREATE INDEX teacher_paycheck_lines_paycheck_id_idx
  ON teacher_paycheck_lines (paycheck_id);

COMMENT ON TABLE teacher_paychecks IS
  'Monthly tutor paycheck totals linked to statement expenses.';
COMMENT ON TABLE teacher_paycheck_lines IS
  'Per-class session counts and pay rates for a teacher paycheck.';

ALTER TABLE teacher_paychecks ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_paycheck_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view teacher paychecks"
  ON teacher_paychecks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS viewer
      WHERE viewer.id = auth.uid()
        AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can insert teacher paychecks"
  ON teacher_paychecks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

CREATE POLICY "Active staff can view teacher paycheck lines"
  ON teacher_paycheck_lines
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS viewer
      WHERE viewer.id = auth.uid()
        AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can insert teacher paycheck lines"
  ON teacher_paycheck_lines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

GRANT SELECT, INSERT ON teacher_paychecks TO authenticated;
GRANT SELECT, INSERT ON teacher_paycheck_lines TO authenticated;

ALTER TABLE statement_entries
  ADD COLUMN teacher_paycheck_id bigint REFERENCES public.teacher_paychecks (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX statement_entries_teacher_paycheck_id_idx
  ON statement_entries (teacher_paycheck_id)
  WHERE teacher_paycheck_id IS NOT NULL;

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
    v_line_total_cents := v_session_count * v_rate_cents;

    INSERT INTO teacher_paycheck_lines (
      paycheck_id,
      class_id,
      session_count,
      rate_cents,
      line_total_cents
    )
    VALUES (
      v_paycheck_id,
      v_class_id,
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

GRANT EXECUTE ON FUNCTION public.record_teacher_paycheck TO authenticated;
