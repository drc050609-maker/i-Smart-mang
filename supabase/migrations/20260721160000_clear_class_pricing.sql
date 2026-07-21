-- Allow staff to clear custom class pricing (falls back to calculated rates).

CREATE OR REPLACE FUNCTION public.clear_class_pricing(
  p_class_id bigint,
  p_reason text DEFAULT 'Cleared class pricing'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid := public.require_active_staff();
  v_reason text := trim(COALESCE(p_reason, 'Cleared class pricing'));
  v_old_single integer;
  v_old_20 integer;
  v_old_50 integer;
BEGIN
  SELECT single_price_cents, package_20_price_cents, package_50_price_cents
  INTO v_old_single, v_old_20, v_old_50
  FROM classes
  WHERE id = p_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found.';
  END IF;

  IF v_old_single IS NULL AND v_old_20 IS NULL AND v_old_50 IS NULL THEN
    RETURN;
  END IF;

  UPDATE classes
  SET
    single_price_cents = NULL,
    package_20_price_cents = NULL,
    package_50_price_cents = NULL
  WHERE id = p_class_id;

  IF v_old_single IS NOT NULL THEN
    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'class_pricing', p_class_id, 'single_price_cents',
      v_old_single, -v_old_single, 0,
      v_reason, v_staff_id
    );
  END IF;

  IF v_old_20 IS NOT NULL THEN
    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'class_pricing', p_class_id, 'package_20_price_cents',
      v_old_20, -v_old_20, 0,
      v_reason, v_staff_id
    );
  END IF;

  IF v_old_50 IS NOT NULL THEN
    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'class_pricing', p_class_id, 'package_50_price_cents',
      v_old_50, -v_old_50, 0,
      v_reason, v_staff_id
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_class_pricing(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_class_pricing(bigint, text) TO authenticated;
