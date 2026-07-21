-- Auto-open statement periods when entries are recorded, and support recurring items (e.g. rent).

INSERT INTO statement_periods (year, month, created_by)
SELECT DISTINCT
  EXTRACT(YEAR FROM entry_date)::smallint,
  EXTRACT(MONTH FROM entry_date)::smallint,
  created_by
FROM statement_entries
ON CONFLICT (year, month) DO NOTHING;

CREATE TABLE recurring_statement_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_type statement_entry_type NOT NULL DEFAULT 'expense',
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  description text NOT NULL CHECK (char_length(trim(description)) > 0),
  day_of_month smallint NOT NULL DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 28),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE recurring_statement_entries IS
  'Monthly repeating income or expenses (e.g. rent) applied to each statement period.';

ALTER TABLE recurring_statement_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view recurring statement entries"
  ON recurring_statement_entries
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

CREATE POLICY "Active staff can insert recurring statement entries"
  ON recurring_statement_entries
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

CREATE POLICY "Active staff can update recurring statement entries"
  ON recurring_statement_entries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

CREATE POLICY "Active staff can delete recurring statement entries"
  ON recurring_statement_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON recurring_statement_entries TO authenticated;

ALTER TABLE statement_entries
  ADD COLUMN recurring_statement_entry_id bigint
    REFERENCES public.recurring_statement_entries (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX statement_entries_recurring_month_idx
  ON statement_entries (
    recurring_statement_entry_id,
    (EXTRACT(YEAR FROM entry_date)::integer),
    (EXTRACT(MONTH FROM entry_date)::integer)
  )
  WHERE recurring_statement_entry_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ensure_statement_period(
  p_year smallint,
  p_month smallint,
  p_created_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO statement_periods (year, month, created_by)
  VALUES (p_year, p_month, p_created_by)
  ON CONFLICT (year, month) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_recurring_statement_entries(
  p_year integer,
  p_month integer,
  p_created_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recurring RECORD;
  v_day integer;
  v_last_day integer;
  v_entry_date date;
BEGIN
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Invalid month';
  END IF;

  v_last_day := EXTRACT(
    DAY FROM (
      date_trunc('month', make_date(p_year, p_month, 1)) + interval '1 month - 1 day'
    )
  )::integer;

  FOR v_recurring IN
    SELECT
      id,
      entry_type,
      amount_cents,
      description,
      day_of_month
    FROM recurring_statement_entries
    WHERE is_active = true
  LOOP
    IF EXISTS (
      SELECT 1
      FROM statement_entries
      WHERE recurring_statement_entry_id = v_recurring.id
        AND EXTRACT(YEAR FROM entry_date) = p_year
        AND EXTRACT(MONTH FROM entry_date) = p_month
    ) THEN
      CONTINUE;
    END IF;

    v_day := LEAST(v_recurring.day_of_month, v_last_day);
    v_entry_date := make_date(p_year, p_month, v_day);

    INSERT INTO statement_entries (
      entry_type,
      amount_cents,
      description,
      entry_date,
      recurring_statement_entry_id,
      created_by
    )
    VALUES (
      v_recurring.entry_type,
      v_recurring.amount_cents,
      v_recurring.description,
      v_entry_date,
      v_recurring.id,
      p_created_by
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_statement_period_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM apply_recurring_statement_entries(
    NEW.year::integer,
    NEW.month::integer,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER statement_periods_apply_recurring
  AFTER INSERT ON statement_periods
  FOR EACH ROW
  EXECUTE FUNCTION on_statement_period_created();

CREATE OR REPLACE FUNCTION public.on_statement_entry_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM ensure_statement_period(
    EXTRACT(YEAR FROM NEW.entry_date)::smallint,
    EXTRACT(MONTH FROM NEW.entry_date)::smallint,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER statement_entries_ensure_period
  AFTER INSERT ON statement_entries
  FOR EACH ROW
  EXECUTE FUNCTION on_statement_entry_inserted();

GRANT EXECUTE ON FUNCTION public.ensure_statement_period TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_recurring_statement_entries TO authenticated;
