-- Amount corrections can be saved without a reason.

DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint AS con
  WHERE con.conrelid = 'public.financial_adjustments'::regclass
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%char_length%trim%reason%';
  IF cname IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.financial_adjustments DROP CONSTRAINT %I',
      cname
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.correct_money_source(
  p_source_kind public.financial_source_kind,
  p_source_id bigint,
  p_corrected_amount_cents integer,
  p_reason text,
  p_field_name text DEFAULT 'amount_cents'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid := public.require_active_staff();
  v_reason text := trim(COALESCE(p_reason, ''));
  v_original integer;
  v_adjustment integer;
  v_adjustment_id bigint;
  v_statement_entry_id bigint;
  v_entry_type statement_entry_type;
  v_description text;
  v_source_entry_type statement_entry_type;
  v_source_description text;
  v_linked_payment_id bigint;
  v_linked_purchase_id bigint;
  v_linked_paycheck_id bigint;
BEGIN
  IF p_corrected_amount_cents < 0 THEN
    RAISE EXCEPTION 'Corrected amount cannot be negative.';
  END IF;

  IF p_source_kind = 'class_payment' THEN
    SELECT cp.effective_amount_cents, cp.id
    INTO v_original, v_linked_payment_id
    FROM class_payments AS cp
    WHERE cp.id = p_source_id
    FOR UPDATE;

    IF v_original IS NULL THEN
      RAISE EXCEPTION 'Payment not found.';
    END IF;

    v_adjustment := p_corrected_amount_cents - v_original;
    IF v_adjustment = 0 THEN
      RAISE EXCEPTION 'New amount must differ from the current amount.';
    END IF;

    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'class_payment', p_source_id, 'amount_cents',
      v_original, v_adjustment, p_corrected_amount_cents,
      v_reason, v_staff_id
    )
    RETURNING id INTO v_adjustment_id;

    UPDATE class_payments
    SET effective_amount_cents = p_corrected_amount_cents
    WHERE id = p_source_id;

    -- One statement row per payment (unique on class_payment_id). Update it.
    UPDATE statement_entries
    SET
      amount_cents = p_corrected_amount_cents,
      financial_adjustment_id = v_adjustment_id
    WHERE class_payment_id = p_source_id
    RETURNING id INTO v_statement_entry_id;

    IF v_statement_entry_id IS NULL THEN
      INSERT INTO statement_entries (
        entry_type, amount_cents, description, entry_date,
        class_payment_id, financial_adjustment_id, created_by
      )
      VALUES (
        'income',
        p_corrected_amount_cents,
        'Payment' || CASE WHEN v_reason <> '' THEN ' correction: ' || v_reason ELSE '' END,
        CURRENT_DATE,
        v_linked_payment_id,
        v_adjustment_id,
        v_staff_id
      )
      RETURNING id INTO v_statement_entry_id;
    END IF;

  ELSIF p_source_kind = 'student_purchase' THEN
    SELECT sp.effective_amount_cents, sp.id
    INTO v_original, v_linked_purchase_id
    FROM student_purchases AS sp
    WHERE sp.id = p_source_id
    FOR UPDATE;

    IF v_original IS NULL THEN
      RAISE EXCEPTION 'Purchase not found.';
    END IF;

    v_adjustment := p_corrected_amount_cents - v_original;
    IF v_adjustment = 0 THEN
      RAISE EXCEPTION 'New amount must differ from the current amount.';
    END IF;

    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'student_purchase', p_source_id, 'amount_cents',
      v_original, v_adjustment, p_corrected_amount_cents,
      v_reason, v_staff_id
    )
    RETURNING id INTO v_adjustment_id;

    UPDATE student_purchases
    SET effective_amount_cents = p_corrected_amount_cents
    WHERE id = p_source_id;

    UPDATE statement_entries
    SET
      amount_cents = p_corrected_amount_cents,
      financial_adjustment_id = v_adjustment_id
    WHERE student_purchase_id = p_source_id
    RETURNING id INTO v_statement_entry_id;

    IF v_statement_entry_id IS NULL THEN
      INSERT INTO statement_entries (
        entry_type, amount_cents, description, entry_date,
        student_purchase_id, financial_adjustment_id, created_by
      )
      VALUES (
        'income',
        p_corrected_amount_cents,
        'Purchase' || CASE WHEN v_reason <> '' THEN ' correction: ' || v_reason ELSE '' END,
        CURRENT_DATE,
        v_linked_purchase_id,
        v_adjustment_id,
        v_staff_id
      )
      RETURNING id INTO v_statement_entry_id;
    END IF;

  ELSIF p_source_kind = 'teacher_paycheck' THEN
    SELECT tp.effective_amount_cents, tp.id
    INTO v_original, v_linked_paycheck_id
    FROM teacher_paychecks AS tp
    WHERE tp.id = p_source_id
    FOR UPDATE;

    IF v_original IS NULL THEN
      RAISE EXCEPTION 'Paycheck not found.';
    END IF;

    v_adjustment := p_corrected_amount_cents - v_original;
    IF v_adjustment = 0 THEN
      RAISE EXCEPTION 'New amount must differ from the current amount.';
    END IF;

    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'teacher_paycheck', p_source_id, 'total_amount_cents',
      v_original, v_adjustment, p_corrected_amount_cents,
      v_reason, v_staff_id
    )
    RETURNING id INTO v_adjustment_id;

    UPDATE teacher_paychecks
    SET effective_amount_cents = p_corrected_amount_cents
    WHERE id = p_source_id;

    UPDATE statement_entries
    SET
      amount_cents = p_corrected_amount_cents,
      financial_adjustment_id = v_adjustment_id
    WHERE teacher_paycheck_id = p_source_id
    RETURNING id INTO v_statement_entry_id;

    IF v_statement_entry_id IS NULL THEN
      INSERT INTO statement_entries (
        entry_type, amount_cents, description, entry_date,
        teacher_paycheck_id, financial_adjustment_id, created_by
      )
      VALUES (
        'expense',
        p_corrected_amount_cents,
        'Paycheck' || CASE WHEN v_reason <> '' THEN ' correction: ' || v_reason ELSE '' END,
        CURRENT_DATE,
        v_linked_paycheck_id,
        v_adjustment_id,
        v_staff_id
      )
      RETURNING id INTO v_statement_entry_id;
    END IF;

  ELSIF p_source_kind = 'statement_entry' THEN
    SELECT se.amount_cents, se.entry_type, se.description
    INTO v_original, v_source_entry_type, v_source_description
    FROM statement_entries AS se
    WHERE se.id = p_source_id
      AND se.class_payment_id IS NULL
      AND se.student_purchase_id IS NULL
      AND se.teacher_paycheck_id IS NULL
      AND se.recurring_statement_entry_id IS NULL
      AND se.financial_adjustment_id IS NULL
    FOR UPDATE;

    IF v_original IS NULL THEN
      RAISE EXCEPTION 'Only manual statement entries can be corrected here.';
    END IF;

    IF p_corrected_amount_cents <= 0 THEN
      RAISE EXCEPTION 'Corrected amount must be positive.';
    END IF;

    v_adjustment := p_corrected_amount_cents - v_original;
    IF v_adjustment = 0 THEN
      RAISE EXCEPTION 'New amount must differ from the current amount.';
    END IF;

    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'statement_entry', p_source_id, 'amount_cents',
      v_original, v_adjustment, p_corrected_amount_cents,
      v_reason, v_staff_id
    )
    RETURNING id INTO v_adjustment_id;

    -- Reverse original
    INSERT INTO statement_entries (
      entry_type, amount_cents, description, entry_date,
      financial_adjustment_id, corrects_entry_id, created_by
    )
    VALUES (
      CASE WHEN v_source_entry_type = 'income' THEN 'expense'::statement_entry_type ELSE 'income'::statement_entry_type END,
      v_original,
      'Reversal: ' || v_source_description,
      CURRENT_DATE,
      v_adjustment_id,
      p_source_id,
      v_staff_id
    );

    -- Replacement
    INSERT INTO statement_entries (
      entry_type, amount_cents, description, entry_date,
      financial_adjustment_id, corrects_entry_id, created_by
    )
    VALUES (
      v_source_entry_type,
      p_corrected_amount_cents,
      v_source_description || ' (corrected)',
      CURRENT_DATE,
      v_adjustment_id,
      p_source_id,
      v_staff_id
    )
    RETURNING id INTO v_statement_entry_id;

  ELSE
    RAISE EXCEPTION 'Unsupported source kind for money correction.';
  END IF;

  UPDATE financial_adjustments
  SET statement_entry_id = v_statement_entry_id
  WHERE id = v_adjustment_id;

  RETURN v_adjustment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.correct_money_source(
  public.financial_source_kind, bigint, integer, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.correct_money_source(
  public.financial_source_kind, bigint, integer, text, text
) TO authenticated;
