-- Books and other student purchases, linked to monthly statement income.

CREATE TABLE student_purchases (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE RESTRICT,
  description text NOT NULL CHECK (char_length(trim(description)) > 0),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX student_purchases_student_id_idx ON student_purchases (student_id);
CREATE INDEX student_purchases_purchased_at_idx ON student_purchases (purchased_at DESC);

COMMENT ON TABLE student_purchases IS
  'Books and other non-class purchases paid by students.';

ALTER TABLE student_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view student purchases"
  ON student_purchases
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

CREATE POLICY "Active staff can insert student purchases"
  ON student_purchases
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

GRANT SELECT, INSERT ON student_purchases TO authenticated;

ALTER TABLE statement_entries
  ADD COLUMN student_purchase_id bigint REFERENCES public.student_purchases (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX statement_entries_student_purchase_id_idx
  ON statement_entries (student_purchase_id)
  WHERE student_purchase_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_student_purchase(
  p_student_id bigint,
  p_description text,
  p_amount_cents integer,
  p_created_by uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_id bigint;
  v_student_name text;
  v_description text;
BEGIN
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Purchase amount must be positive';
  END IF;

  v_description := trim(p_description);

  IF char_length(v_description) = 0 THEN
    RAISE EXCEPTION 'Purchase description is required';
  END IF;

  SELECT trim(s."first name" || coalesce(' ' || s."last name", ''))
  INTO v_student_name
  FROM students AS s
  WHERE s.id = p_student_id;

  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  INSERT INTO student_purchases (
    student_id,
    description,
    amount_cents,
    created_by
  )
  VALUES (
    p_student_id,
    v_description,
    p_amount_cents,
    p_created_by
  )
  RETURNING id INTO v_purchase_id;

  INSERT INTO statement_entries (
    entry_type,
    amount_cents,
    description,
    entry_date,
    student_purchase_id,
    created_by
  )
  VALUES (
    'income',
    p_amount_cents,
    'Purchase from ' || v_student_name || ': ' || v_description,
    current_date,
    v_purchase_id,
    p_created_by
  );

  RETURN v_purchase_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_student_purchase TO authenticated;
