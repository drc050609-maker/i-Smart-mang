-- Add editable class/campus pricing columns and RPCs.
-- Safe to run when financial_adjustments / financial_source_kind already exist.

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

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS trial_price_cents integer NOT NULL DEFAULT 2500
    CHECK (trial_price_cents > 0),
  ADD COLUMN IF NOT EXISTS trial_teacher_pay_cents integer NOT NULL DEFAULT 1500
    CHECK (trial_teacher_pay_cents >= 0);

COMMENT ON COLUMN public.locations.trial_price_cents IS
  'Campus-specific trial class fee in cents.';
COMMENT ON COLUMN public.locations.trial_teacher_pay_cents IS
  'Campus-specific trial teacher pay rate in cents.';

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
