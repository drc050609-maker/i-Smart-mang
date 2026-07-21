-- RPC wrappers so pay rates work through the API even when PostgREST
-- schema cache has not yet picked up the new table.

CREATE OR REPLACE FUNCTION public.get_teacher_class_pay_rates(p_teacher_id bigint)
RETURNS TABLE (class_id bigint, rate_cents integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tcpr.class_id, tcpr.rate_cents
  FROM teacher_class_pay_rates AS tcpr
  WHERE tcpr.teacher_id = p_teacher_id;
$$;

CREATE OR REPLACE FUNCTION public.upsert_teacher_class_pay_rate(
  p_teacher_id bigint,
  p_class_id bigint,
  p_rate_cents integer,
  p_updated_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_rate_cents < 0 THEN
    RAISE EXCEPTION 'Rate must be zero or greater';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM classes AS c
    WHERE c.id = p_class_id
      AND c.teacher_id = p_teacher_id
  ) THEN
    RAISE EXCEPTION 'Class is not assigned to this teacher';
  END IF;

  INSERT INTO teacher_class_pay_rates (
    teacher_id,
    class_id,
    rate_cents,
    updated_by,
    updated_at
  )
  VALUES (
    p_teacher_id,
    p_class_id,
    p_rate_cents,
    p_updated_by,
    now()
  )
  ON CONFLICT (teacher_id, class_id) DO UPDATE
  SET
    rate_cents = EXCLUDED.rate_cents,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_class_pay_rates TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_teacher_class_pay_rate TO authenticated;

NOTIFY pgrst, 'reload schema';
