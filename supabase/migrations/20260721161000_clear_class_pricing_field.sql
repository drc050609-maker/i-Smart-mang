-- Clear a single class pricing field (single / package20 / package50).

CREATE OR REPLACE FUNCTION public.clear_class_pricing_field(
  p_class_id bigint,
  p_field text,
  p_reason text DEFAULT 'Cleared class pricing field'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid := public.require_active_staff();
  v_reason text := trim(COALESCE(p_reason, 'Cleared class pricing field'));
  v_old integer;
  v_column text;
BEGIN
  IF p_field NOT IN ('single', 'package20', 'package50') THEN
    RAISE EXCEPTION 'Invalid pricing field.';
  END IF;

  v_column := CASE p_field
    WHEN 'single' THEN 'single_price_cents'
    WHEN 'package20' THEN 'package_20_price_cents'
    ELSE 'package_50_price_cents'
  END;

  IF NOT EXISTS (SELECT 1 FROM classes WHERE id = p_class_id) THEN
    RAISE EXCEPTION 'Class not found.';
  END IF;

  EXECUTE format(
    'SELECT %I FROM classes WHERE id = $1 FOR UPDATE',
    v_column
  ) INTO v_old USING p_class_id;

  IF v_old IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format(
    'UPDATE classes SET %I = NULL WHERE id = $1',
    v_column
  ) USING p_class_id;

  INSERT INTO financial_adjustments (
    source_kind, source_id, field_name,
    original_amount_cents, adjustment_cents, corrected_amount_cents,
    reason, created_by
  )
  VALUES (
    'class_pricing', p_class_id, v_column,
    v_old, -v_old, 0,
    v_reason, v_staff_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.clear_class_pricing_field(bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_class_pricing_field(bigint, text, text) TO authenticated;
