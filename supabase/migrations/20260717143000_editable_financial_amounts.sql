-- Editable financial amounts: stored pricing, corrections/adjustments, secured RPCs.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.require_active_staff()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid := auth.uid();
BEGIN
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM staff_accounts AS s
    WHERE s.id = v_staff_id
      AND s.is_active = true
  ) THEN
    RAISE EXCEPTION 'Only active staff can perform this action.';
  END IF;

  RETURN v_staff_id;
END;
$$;

REVOKE ALL ON FUNCTION public.require_active_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.require_active_staff() TO authenticated;

-- ---------------------------------------------------------------------------
-- Class pricing (stored, editable; backfilled from current formula)
-- ---------------------------------------------------------------------------

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS single_price_cents integer
    CHECK (single_price_cents IS NULL OR single_price_cents > 0),
  ADD COLUMN IF NOT EXISTS package_20_price_cents integer
    CHECK (package_20_price_cents IS NULL OR package_20_price_cents > 0),
  ADD COLUMN IF NOT EXISTS package_50_price_cents integer
    CHECK (package_50_price_cents IS NULL OR package_50_price_cents > 0);

COMMENT ON COLUMN public.classes.single_price_cents IS
  'Editable per-class tuition in cents. Null falls back to calculated pricing.';
COMMENT ON COLUMN public.classes.package_20_price_cents IS
  'Editable 20-class package price in cents.';
COMMENT ON COLUMN public.classes.package_50_price_cents IS
  'Editable 50-class package price in cents.';

UPDATE public.classes AS c
SET
  single_price_cents = CASE
    WHEN c.lesson_type = 'trial' THEN 2500
    ELSE (
      ROUND(
        (
          COALESCE(NULLIF(c.duration_minutes, 0), 45)
          * 2.25
          * CASE c.lesson_type
              WHEN 'private' THEN 1.4
              WHEN 'trial' THEN 0.5
              ELSE 1.0
            END
        ) / 5.0
      ) * 5
    )::integer * 100
  END,
  package_20_price_cents = CASE
    WHEN c.lesson_type = 'trial' THEN NULL
    ELSE (
      (
        ROUND(
          (
            COALESCE(NULLIF(c.duration_minutes, 0), 45)
            * 2.25
            * CASE c.lesson_type
                WHEN 'private' THEN 1.4
                ELSE 1.0
              END
          ) / 5.0
        ) * 5
      )::integer * 20 * 95
    )
  END,
  package_50_price_cents = CASE
    WHEN c.lesson_type = 'trial' THEN NULL
    ELSE (
      (
        ROUND(
          (
            COALESCE(NULLIF(c.duration_minutes, 0), 45)
            * 2.25
            * CASE c.lesson_type
                WHEN 'private' THEN 1.4
                ELSE 1.0
              END
          ) / 5.0
        ) * 5
      )::integer * 50 * 90
    )
  END
WHERE c.single_price_cents IS NULL;

-- ---------------------------------------------------------------------------
-- Campus trial pricing (per location)
-- ---------------------------------------------------------------------------

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS trial_price_cents integer NOT NULL DEFAULT 2500
    CHECK (trial_price_cents > 0),
  ADD COLUMN IF NOT EXISTS trial_teacher_pay_cents integer NOT NULL DEFAULT 1500
    CHECK (trial_teacher_pay_cents >= 0);

COMMENT ON COLUMN public.locations.trial_price_cents IS
  'Campus-specific trial class fee in cents.';
COMMENT ON COLUMN public.locations.trial_teacher_pay_cents IS
  'Campus-specific trial teacher pay rate in cents.';

UPDATE public.locations
SET
  trial_price_cents = 2500,
  trial_teacher_pay_cents = 1500
WHERE trial_price_cents IS DISTINCT FROM 2500
   OR trial_teacher_pay_cents IS DISTINCT FROM 1500;

-- ---------------------------------------------------------------------------
-- Financial adjustments (immutable correction trail)
-- ---------------------------------------------------------------------------

CREATE TYPE public.financial_source_kind AS ENUM (
  'class_payment',
  'student_purchase',
  'teacher_paycheck',
  'statement_entry',
  'recurring_statement_entry',
  'class_pricing',
  'campus_pricing'
);

CREATE TABLE public.financial_adjustments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_kind public.financial_source_kind NOT NULL,
  source_id bigint NOT NULL,
  field_name text NOT NULL DEFAULT 'amount_cents',
  original_amount_cents integer NOT NULL,
  adjustment_cents integer NOT NULL,
  corrected_amount_cents integer NOT NULL,
  reason text NOT NULL CHECK (char_length(trim(reason)) > 0),
  statement_entry_id bigint REFERENCES public.statement_entries (id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_adjustments_math_check
    CHECK (original_amount_cents + adjustment_cents = corrected_amount_cents),
  CONSTRAINT financial_adjustments_nonzero_check
    CHECK (adjustment_cents <> 0)
);

CREATE INDEX financial_adjustments_source_idx
  ON public.financial_adjustments (source_kind, source_id, created_at DESC);

CREATE INDEX financial_adjustments_created_at_idx
  ON public.financial_adjustments (created_at DESC);

COMMENT ON TABLE public.financial_adjustments IS
  'Immutable correction history for monetary amounts. Original source rows stay intact.';

ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view financial adjustments"
  ON public.financial_adjustments
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

GRANT SELECT ON public.financial_adjustments TO authenticated;

ALTER TABLE public.statement_entries
  ADD COLUMN IF NOT EXISTS financial_adjustment_id bigint
    REFERENCES public.financial_adjustments (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS corrects_entry_id bigint
    REFERENCES public.statement_entries (id) ON DELETE SET NULL;

CREATE INDEX statement_entries_financial_adjustment_id_idx
  ON public.statement_entries (financial_adjustment_id)
  WHERE financial_adjustment_id IS NOT NULL;

-- Effective amount helpers on source rows (denormalized for easy display).
ALTER TABLE public.class_payments
  ADD COLUMN IF NOT EXISTS effective_amount_cents integer;

ALTER TABLE public.student_purchases
  ADD COLUMN IF NOT EXISTS effective_amount_cents integer;

ALTER TABLE public.teacher_paychecks
  ADD COLUMN IF NOT EXISTS effective_amount_cents integer;

UPDATE public.class_payments
SET effective_amount_cents = amount_cents
WHERE effective_amount_cents IS NULL;

UPDATE public.student_purchases
SET effective_amount_cents = amount_cents
WHERE effective_amount_cents IS NULL;

UPDATE public.teacher_paychecks
SET effective_amount_cents = total_amount_cents
WHERE effective_amount_cents IS NULL;

ALTER TABLE public.class_payments
  ALTER COLUMN effective_amount_cents SET DEFAULT 0,
  ALTER COLUMN effective_amount_cents SET NOT NULL;

ALTER TABLE public.student_purchases
  ALTER COLUMN effective_amount_cents SET DEFAULT 0,
  ALTER COLUMN effective_amount_cents SET NOT NULL;

ALTER TABLE public.teacher_paychecks
  ALTER COLUMN effective_amount_cents SET DEFAULT 0,
  ALTER COLUMN effective_amount_cents SET NOT NULL;

-- Keep effective amounts in sync on insert of new payments/purchases/paychecks.
CREATE OR REPLACE FUNCTION public.set_effective_amount_on_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'class_payments' THEN
    NEW.effective_amount_cents := NEW.amount_cents;
  ELSIF TG_TABLE_NAME = 'student_purchases' THEN
    NEW.effective_amount_cents := NEW.amount_cents;
  ELSIF TG_TABLE_NAME = 'teacher_paychecks' THEN
    NEW.effective_amount_cents := NEW.total_amount_cents;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS class_payments_set_effective_amount ON public.class_payments;
CREATE TRIGGER class_payments_set_effective_amount
  BEFORE INSERT ON public.class_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_effective_amount_on_insert();

DROP TRIGGER IF EXISTS student_purchases_set_effective_amount ON public.student_purchases;
CREATE TRIGGER student_purchases_set_effective_amount
  BEFORE INSERT ON public.student_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_effective_amount_on_insert();

DROP TRIGGER IF EXISTS teacher_paychecks_set_effective_amount ON public.teacher_paychecks;
CREATE TRIGGER teacher_paychecks_set_effective_amount
  BEFORE INSERT ON public.teacher_paychecks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_effective_amount_on_insert();

-- ---------------------------------------------------------------------------
-- Correction RPCs
-- ---------------------------------------------------------------------------

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
  v_reason text := trim(p_reason);
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

  IF char_length(v_reason) = 0 THEN
    RAISE EXCEPTION 'A correction reason is required.';
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

    v_entry_type := CASE WHEN v_adjustment > 0 THEN 'income'::statement_entry_type ELSE 'expense'::statement_entry_type END;
    v_description := 'Payment correction: ' || v_reason;

    INSERT INTO statement_entries (
      entry_type, amount_cents, description, entry_date,
      class_payment_id, financial_adjustment_id, created_by
    )
    VALUES (
      v_entry_type, ABS(v_adjustment), v_description, CURRENT_DATE,
      v_linked_payment_id, v_adjustment_id, v_staff_id
    )
    RETURNING id INTO v_statement_entry_id;

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

    v_entry_type := CASE WHEN v_adjustment > 0 THEN 'income'::statement_entry_type ELSE 'expense'::statement_entry_type END;
    v_description := 'Purchase correction: ' || v_reason;

    INSERT INTO statement_entries (
      entry_type, amount_cents, description, entry_date,
      student_purchase_id, financial_adjustment_id, created_by
    )
    VALUES (
      v_entry_type, ABS(v_adjustment), v_description, CURRENT_DATE,
      v_linked_purchase_id, v_adjustment_id, v_staff_id
    )
    RETURNING id INTO v_statement_entry_id;

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

    -- Paychecks are expenses: increasing pay => more expense; decreasing => income (reversal).
    v_entry_type := CASE WHEN v_adjustment > 0 THEN 'expense'::statement_entry_type ELSE 'income'::statement_entry_type END;
    v_description := 'Paycheck correction: ' || v_reason;

    INSERT INTO statement_entries (
      entry_type, amount_cents, description, entry_date,
      teacher_paycheck_id, financial_adjustment_id, created_by
    )
    VALUES (
      v_entry_type, ABS(v_adjustment), v_description, CURRENT_DATE,
      v_linked_paycheck_id, v_adjustment_id, v_staff_id
    )
    RETURNING id INTO v_statement_entry_id;

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

CREATE OR REPLACE FUNCTION public.update_recurring_statement_entry_amount(
  p_id bigint,
  p_amount_cents integer,
  p_reason text DEFAULT 'Updated recurring amount'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid := public.require_active_staff();
  v_original integer;
  v_reason text := trim(COALESCE(p_reason, 'Updated recurring amount'));
BEGIN
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive.';
  END IF;

  SELECT amount_cents INTO v_original
  FROM recurring_statement_entries
  WHERE id = p_id
  FOR UPDATE;

  IF v_original IS NULL THEN
    RAISE EXCEPTION 'Recurring entry not found.';
  END IF;

  IF v_original = p_amount_cents THEN
    RETURN;
  END IF;

  UPDATE recurring_statement_entries
  SET amount_cents = p_amount_cents
  WHERE id = p_id;

  INSERT INTO financial_adjustments (
    source_kind, source_id, field_name,
    original_amount_cents, adjustment_cents, corrected_amount_cents,
    reason, created_by
  )
  VALUES (
    'recurring_statement_entry', p_id, 'amount_cents',
    v_original, p_amount_cents - v_original, p_amount_cents,
    v_reason, v_staff_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_recurring_statement_entry_amount(bigint, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_recurring_statement_entry_amount(bigint, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_class_pricing(
  p_class_id bigint,
  p_single_price_cents integer,
  p_package_20_price_cents integer DEFAULT NULL,
  p_package_50_price_cents integer DEFAULT NULL,
  p_reason text DEFAULT 'Updated class pricing'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid := public.require_active_staff();
  v_reason text := trim(COALESCE(p_reason, 'Updated class pricing'));
  v_old_single integer;
  v_old_20 integer;
  v_old_50 integer;
  v_lesson_type text;
BEGIN
  IF p_single_price_cents IS NULL OR p_single_price_cents <= 0 THEN
    RAISE EXCEPTION 'Single class price must be positive.';
  END IF;

  SELECT single_price_cents, package_20_price_cents, package_50_price_cents, lesson_type
  INTO v_old_single, v_old_20, v_old_50, v_lesson_type
  FROM classes
  WHERE id = p_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found.';
  END IF;

  IF v_lesson_type = 'trial' THEN
    IF p_package_20_price_cents IS NOT NULL OR p_package_50_price_cents IS NOT NULL THEN
      RAISE EXCEPTION 'Trial classes only support a single price.';
    END IF;
  ELSE
    IF p_package_20_price_cents IS NULL OR p_package_20_price_cents <= 0
       OR p_package_50_price_cents IS NULL OR p_package_50_price_cents <= 0 THEN
      RAISE EXCEPTION 'Package prices must be positive for non-trial classes.';
    END IF;
  END IF;

  UPDATE classes
  SET
    single_price_cents = p_single_price_cents,
    package_20_price_cents = CASE WHEN v_lesson_type = 'trial' THEN NULL ELSE p_package_20_price_cents END,
    package_50_price_cents = CASE WHEN v_lesson_type = 'trial' THEN NULL ELSE p_package_50_price_cents END
  WHERE id = p_class_id;

  IF v_old_single IS DISTINCT FROM p_single_price_cents THEN
    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'class_pricing', p_class_id, 'single_price_cents',
      COALESCE(v_old_single, 0),
      p_single_price_cents - COALESCE(v_old_single, 0),
      p_single_price_cents,
      v_reason, v_staff_id
    );
  END IF;

  IF v_lesson_type <> 'trial' AND v_old_20 IS DISTINCT FROM p_package_20_price_cents THEN
    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'class_pricing', p_class_id, 'package_20_price_cents',
      COALESCE(v_old_20, 0),
      p_package_20_price_cents - COALESCE(v_old_20, 0),
      p_package_20_price_cents,
      v_reason, v_staff_id
    );
  END IF;

  IF v_lesson_type <> 'trial' AND v_old_50 IS DISTINCT FROM p_package_50_price_cents THEN
    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'class_pricing', p_class_id, 'package_50_price_cents',
      COALESCE(v_old_50, 0),
      p_package_50_price_cents - COALESCE(v_old_50, 0),
      p_package_50_price_cents,
      v_reason, v_staff_id
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_class_pricing(bigint, integer, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_class_pricing(bigint, integer, integer, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_campus_trial_pricing(
  p_location_id bigint,
  p_trial_price_cents integer,
  p_trial_teacher_pay_cents integer,
  p_reason text DEFAULT 'Updated campus trial pricing'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid := public.require_active_staff();
  v_reason text := trim(COALESCE(p_reason, 'Updated campus trial pricing'));
  v_old_price integer;
  v_old_pay integer;
BEGIN
  IF p_trial_price_cents <= 0 THEN
    RAISE EXCEPTION 'Trial price must be positive.';
  END IF;

  IF p_trial_teacher_pay_cents < 0 THEN
    RAISE EXCEPTION 'Trial teacher pay cannot be negative.';
  END IF;

  SELECT trial_price_cents, trial_teacher_pay_cents
  INTO v_old_price, v_old_pay
  FROM locations
  WHERE id = p_location_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campus not found.';
  END IF;

  UPDATE locations
  SET
    trial_price_cents = p_trial_price_cents,
    trial_teacher_pay_cents = p_trial_teacher_pay_cents
  WHERE id = p_location_id;

  IF v_old_price IS DISTINCT FROM p_trial_price_cents THEN
    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'campus_pricing', p_location_id, 'trial_price_cents',
      v_old_price, p_trial_price_cents - v_old_price, p_trial_price_cents,
      v_reason, v_staff_id
    );
  END IF;

  IF v_old_pay IS DISTINCT FROM p_trial_teacher_pay_cents THEN
    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'campus_pricing', p_location_id, 'trial_teacher_pay_cents',
      v_old_pay, p_trial_teacher_pay_cents - v_old_pay, p_trial_teacher_pay_cents,
      v_reason, v_staff_id
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_campus_trial_pricing(bigint, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_campus_trial_pricing(bigint, integer, integer, text) TO authenticated;

-- Tighten existing money RPCs: require active staff and use auth.uid().
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
  v_staff_id uuid := public.require_active_staff();
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
    v_staff_id,
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
    v_staff_id
  );

  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_class_payment(
  bigint, bigint, payment_plan, integer, integer, uuid, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_class_payment(
  bigint, bigint, payment_plan, integer, integer, uuid, text
) TO authenticated;

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
  v_staff_id uuid := public.require_active_staff();
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
    v_staff_id
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
    v_staff_id
  );

  RETURN v_purchase_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_student_purchase(bigint, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_student_purchase(bigint, text, integer, uuid) TO authenticated;
