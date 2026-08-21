-- Restore missing recurring-amount RPC and enable RLS on core public tables.

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
REVOKE ALL ON FUNCTION public.update_recurring_statement_entry_amount(bigint, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_recurring_statement_entry_amount(bigint, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_recurring_statement_entry_amount(bigint, integer, text) TO service_role;

DROP POLICY IF EXISTS anon_read ON public.addresses;
DROP POLICY IF EXISTS anon_read ON public.enrollments;
DROP POLICY IF EXISTS anon_read ON public.rooms;

REVOKE ALL ON TABLE public.students FROM anon;
REVOKE ALL ON TABLE public.addresses FROM anon;
REVOKE ALL ON TABLE public.classes FROM anon;
REVOKE ALL ON TABLE public.enrollments FROM anon;
REVOKE ALL ON TABLE public.teachers FROM anon;
REVOKE ALL ON TABLE public.rooms FROM anon;
REVOKE ALL ON TABLE public.class_schedules FROM anon;
REVOKE ALL ON TABLE public.events FROM anon;
REVOKE ALL ON TABLE public.event_media FROM anon;
REVOKE ALL ON TABLE public.class_schedule_exceptions FROM anon;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'students',
    'addresses',
    'classes',
    'enrollments',
    'teachers',
    'rooms',
    'class_schedules',
    'events',
    'event_media',
    'class_schedule_exceptions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Active staff can manage ' || t,
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_active_staff()) WITH CHECK (public.is_active_staff())',
      'Active staff can manage ' || t,
      t
    );
  END LOOP;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef
      AND l.lanname IN ('plpgsql', 'sql')
      AND p.proname NOT IN (
        'set_leads_updated_at',
        'sync_teacher_status_and_is_active',
        'touch_chat_conversation_updated_at',
        'on_statement_entry_inserted',
        'on_statement_period_created'
      )
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC',
      r.nspname, r.proname, r.args
    );
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM anon',
      r.nspname, r.proname, r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
      r.nspname, r.proname, r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END $$;
