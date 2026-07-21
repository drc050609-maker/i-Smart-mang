-- Atomic payment recording and reconcile payments whose credits were never applied.

ALTER TABLE class_payments
  ADD COLUMN IF NOT EXISTS credits_applied_at timestamptz;

COMMENT ON COLUMN class_payments.credits_applied_at IS
  'When prepaid session credits from this payment were added to the student balance.';

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
BEGIN
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;

  IF p_session_count <= 0 THEN
    RAISE EXCEPTION 'Session count must be positive';
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

  RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_class_payment TO authenticated;

-- Mark payments that already increased the balance (total >= session count for that payment).
UPDATE class_payments AS cp
SET credits_applied_at = cp.paid_at
WHERE cp.status = 'completed'
  AND cp.credits_applied_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM student_class_balances AS scb
    WHERE scb.student_id = cp.student_id
      AND scb.class_id = cp.class_id
      AND scb.sessions_total >= cp.session_count
  );

-- Apply credits for completed payments that were recorded but never credited.
DO $$
DECLARE
  payment_row RECORD;
BEGIN
  FOR payment_row IN
    SELECT id, student_id, class_id, session_count
    FROM class_payments
    WHERE status = 'completed'
      AND credits_applied_at IS NULL
    ORDER BY paid_at
  LOOP
    PERFORM add_student_class_credits(
      payment_row.student_id,
      payment_row.class_id,
      payment_row.session_count
    );

    UPDATE class_payments
    SET credits_applied_at = now()
    WHERE id = payment_row.id;
  END LOOP;
END;
$$;
