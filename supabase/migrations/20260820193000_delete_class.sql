-- Atomically delete one class and that class's related records only.
-- Students, teachers, and other classes (including the same subject) are kept.

CREATE OR REPLACE FUNCTION public.delete_class(p_class_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_class_id bigint;
  v_payment_ids bigint[];
BEGIN
  IF p_class_id IS NULL OR p_class_id <= 0 THEN
    RAISE EXCEPTION 'Invalid class.';
  END IF;

  SELECT c.id
  INTO v_class_id
  FROM public.classes AS c
  WHERE c.id = p_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found.';
  END IF;

  SELECT coalesce(array_agg(p.id), '{}'::bigint[])
  INTO v_payment_ids
  FROM public.class_payments AS p
  WHERE p.class_id = p_class_id;

  IF cardinality(v_payment_ids) > 0 THEN
    DELETE FROM public.statement_entries AS se
    WHERE se.class_payment_id = ANY (v_payment_ids);

    DELETE FROM public.class_payments AS p
    WHERE p.class_id = p_class_id;
  END IF;

  DELETE FROM public.enrollments AS e
  WHERE e."class id" = p_class_id;

  -- class_schedules, class_teachers, credits, attendance, and other
  -- class_id children cascade from this row. Students and other classes stay.
  DELETE FROM public.classes AS c
  WHERE c.id = v_class_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_class(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_class(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_class(bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_trial_class(p_class_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_lesson_type text;
BEGIN
  IF p_class_id IS NULL OR p_class_id <= 0 THEN
    RAISE EXCEPTION 'Invalid class.';
  END IF;

  SELECT lower(trim(coalesce(c.lesson_type, '')))
  INTO v_lesson_type
  FROM public.classes AS c
  WHERE c.id = p_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found.';
  END IF;

  IF v_lesson_type IS DISTINCT FROM 'trial' THEN
    RAISE EXCEPTION
      'Only trial classes can be deleted this way. Regular courses with payment history are protected.';
  END IF;

  PERFORM public.delete_class(p_class_id);
END;
$$;
