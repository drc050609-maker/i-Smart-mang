-- Monthly income and expense ledger for statements.

CREATE TYPE statement_entry_type AS ENUM ('income', 'expense');

CREATE TABLE statement_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_type statement_entry_type NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  description text NOT NULL CHECK (char_length(trim(description)) > 0),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  class_payment_id bigint REFERENCES public.class_payments (id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX statement_entries_class_payment_id_idx
  ON statement_entries (class_payment_id)
  WHERE class_payment_id IS NOT NULL;

CREATE INDEX statement_entries_entry_date_idx ON statement_entries (entry_date DESC);
CREATE INDEX statement_entries_entry_type_idx ON statement_entries (entry_type);

COMMENT ON TABLE statement_entries IS
  'Income and expense line items grouped by month on the statements pages.';

ALTER TABLE statement_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view statement entries"
  ON statement_entries
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

CREATE POLICY "Active staff can insert statement entries"
  ON statement_entries
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

GRANT SELECT, INSERT ON statement_entries TO authenticated;

CREATE OR REPLACE FUNCTION public.record_class_payment(
  p_student_id bigint,
  p_class_id bigint,
  p_payment_plan payment_plan,
  p_amount_cents integer,
  p_session_count integer,
  p_created_by uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id bigint;
  v_student_name text;
  v_class_subject text;
BEGIN
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;

  IF p_session_count <= 0 THEN
    RAISE EXCEPTION 'Session count must be positive';
  END IF;

  SELECT
    trim(s."first name" || coalesce(' ' || s."last name", '')),
    c.subject
  INTO v_student_name, v_class_subject
  FROM students AS s
  CROSS JOIN classes AS c
  WHERE s.id = p_student_id
    AND c.id = p_class_id;

  IF v_student_name IS NULL OR v_class_subject IS NULL THEN
    RAISE EXCEPTION 'Student or class not found';
  END IF;

  INSERT INTO class_payments (
    student_id,
    class_id,
    payment_plan,
    amount_cents,
    session_count,
    created_by,
    notes,
    credits_applied_at
  )
  VALUES (
    p_student_id,
    p_class_id,
    p_payment_plan,
    p_amount_cents,
    p_session_count,
    p_created_by,
    p_notes,
    now()
  )
  RETURNING id INTO v_payment_id;

  PERFORM add_student_class_credits(p_student_id, p_class_id, p_session_count);

  INSERT INTO statement_entries (
    entry_type,
    amount_cents,
    description,
    entry_date,
    class_payment_id,
    created_by
  )
  VALUES (
    'income',
    p_amount_cents,
    'Payment from ' || v_student_name || ' for ' || v_class_subject,
    current_date,
    v_payment_id,
    p_created_by
  );

  RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_class_payment TO authenticated;

INSERT INTO statement_entries (
  entry_type,
  amount_cents,
  description,
  entry_date,
  class_payment_id,
  created_by
)
SELECT
  'income',
  cp.amount_cents,
  'Payment from '
    || trim(s."first name" || coalesce(' ' || s."last name", ''))
    || ' for '
    || c.subject,
  (cp.paid_at AT TIME ZONE 'UTC')::date,
  cp.id,
  cp.created_by
FROM class_payments AS cp
JOIN students AS s ON s.id = cp.student_id
JOIN classes AS c ON c.id = cp.class_id
WHERE cp.status = 'completed'
ON CONFLICT (class_payment_id) WHERE class_payment_id IS NOT NULL DO NOTHING;
