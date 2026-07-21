-- Transfer or refund prepaid class credits between students.

CREATE TYPE credit_transfer_type AS ENUM ('exchange', 'refund');

CREATE TABLE class_credit_transfers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  to_student_id bigint REFERENCES public.students (id) ON DELETE SET NULL,
  class_id bigint NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  credits integer NOT NULL CHECK (credits > 0),
  transfer_type credit_transfer_type NOT NULL,
  reason text,
  related_payment_id bigint REFERENCES public.class_payments (id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX class_credit_transfers_from_student_idx
  ON class_credit_transfers (from_student_id, created_at DESC);

CREATE INDEX class_credit_transfers_to_student_idx
  ON class_credit_transfers (to_student_id, created_at DESC);

COMMENT ON TABLE class_credit_transfers IS
  'Audit log when credits are exchanged to another student or refunded.';

ALTER TABLE class_credit_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view class credit transfers"
  ON class_credit_transfers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can insert class credit transfers"
  ON class_credit_transfers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid() AND staff_user.is_active = true
    )
  );

GRANT SELECT, INSERT ON class_credit_transfers TO authenticated;

CREATE OR REPLACE FUNCTION public.transfer_student_class_credits(
  p_from_student_id bigint,
  p_to_student_id bigint,
  p_class_id bigint,
  p_credits integer,
  p_transfer_type credit_transfer_type,
  p_reason text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_related_payment_id bigint DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer_id bigint;
  v_remaining integer;
BEGIN
  IF p_credits <= 0 THEN
    RAISE EXCEPTION 'Transfer credits must be positive';
  END IF;

  IF p_transfer_type = 'exchange' THEN
    IF p_to_student_id IS NULL THEN
      RAISE EXCEPTION 'Select a student to exchange credits with';
    END IF;

    IF p_to_student_id = p_from_student_id THEN
      RAISE EXCEPTION 'Cannot exchange credits to the same student';
    END IF;
  END IF;

  PERFORM ensure_student_class_balance(p_from_student_id, p_class_id);

  SELECT sessions_remaining INTO v_remaining
  FROM student_class_balances
  WHERE student_id = p_from_student_id AND class_id = p_class_id;

  IF COALESCE(v_remaining, 0) < p_credits THEN
    RAISE EXCEPTION 'Not enough remaining credits (has %, requested %)',
      COALESCE(v_remaining, 0), p_credits;
  END IF;

  IF p_transfer_type = 'refund' THEN
    INSERT INTO class_credit_writeoffs (
      student_id, class_id, credits, reason, created_by
    )
    VALUES (
      p_from_student_id,
      p_class_id,
      p_credits,
      COALESCE(p_reason, 'Refunded'),
      p_created_by
    );

    UPDATE student_class_balances
    SET
      sessions_total = GREATEST(sessions_total - p_credits, 0),
      sessions_remaining = GREATEST(sessions_remaining - p_credits, 0),
      updated_at = now()
    WHERE student_id = p_from_student_id AND class_id = p_class_id;
  ELSE
    PERFORM record_credit_writeoff(
      p_from_student_id,
      p_class_id,
      p_credits,
      COALESCE(p_reason, 'Exchanged to another student'),
      p_created_by
    );

    PERFORM grant_student_class_credits(
      p_to_student_id,
      p_class_id,
      p_credits,
      COALESCE(p_reason, 'Exchanged from another student'),
      p_created_by
    );
  END IF;

  INSERT INTO class_credit_transfers (
    from_student_id,
    to_student_id,
    class_id,
    credits,
    transfer_type,
    reason,
    related_payment_id,
    created_by
  )
  VALUES (
    p_from_student_id,
    CASE WHEN p_transfer_type = 'exchange' THEN p_to_student_id ELSE NULL END,
    p_class_id,
    p_credits,
    p_transfer_type,
    p_reason,
    p_related_payment_id,
    p_created_by
  )
  RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_payment_status(
  p_payment_id bigint,
  p_status payment_status,
  p_exchanged_for_payment_id bigint DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_changed_by uuid DEFAULT NULL,
  p_credits integer DEFAULT NULL,
  p_to_student_id bigint DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment class_payments%ROWTYPE;
  v_credits integer;
BEGIN
  SELECT * INTO v_payment FROM class_payments WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.status <> 'completed' THEN
    RAISE EXCEPTION 'Only completed payments can be updated';
  END IF;

  v_credits := COALESCE(p_credits, v_payment.session_count);

  IF v_credits <= 0 OR v_credits > v_payment.session_count THEN
    RAISE EXCEPTION 'Credit amount must be between 1 and %', v_payment.session_count;
  END IF;

  IF p_status = 'refunded' THEN
    PERFORM transfer_student_class_credits(
      v_payment.student_id,
      NULL,
      v_payment.class_id,
      v_credits,
      'refund',
      p_notes,
      p_changed_by,
      p_payment_id
    );
  ELSIF p_status = 'exchanged' THEN
    IF p_to_student_id IS NULL THEN
      RAISE EXCEPTION 'Select a student to exchange credits with';
    END IF;

    PERFORM transfer_student_class_credits(
      v_payment.student_id,
      p_to_student_id,
      v_payment.class_id,
      v_credits,
      'exchange',
      p_notes,
      p_changed_by,
      p_payment_id
    );
  END IF;

  UPDATE class_payments
  SET
    status = p_status,
    exchanged_for_payment_id = p_exchanged_for_payment_id,
    status_notes = p_notes,
    status_changed_at = now(),
    status_changed_by = p_changed_by
  WHERE id = p_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_student_class_credits TO authenticated;
