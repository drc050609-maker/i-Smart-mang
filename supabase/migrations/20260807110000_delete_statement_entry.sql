-- Delete a statement entry. Teacher paychecks also unwind the paycheck
-- record and clear matching per-class pay rates so rates can be re-entered.

CREATE OR REPLACE FUNCTION public.delete_statement_entry(p_entry_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid := public.require_active_staff();
  v_entry public.statement_entries%ROWTYPE;
  v_paycheck public.teacher_paychecks%ROWTYPE;
  v_front_desk public.front_desk_paychecks%ROWTYPE;
  v_paycheck_id bigint;
  v_front_desk_id bigint;
  v_adj_ids bigint[];
  v_entry_ids bigint[];
BEGIN
  IF p_entry_id IS NULL OR p_entry_id <= 0 THEN
    RAISE EXCEPTION 'Invalid statement entry.';
  END IF;

  SELECT *
  INTO v_entry
  FROM public.statement_entries AS se
  WHERE se.id = p_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Statement entry not found.';
  END IF;

  IF v_entry.class_payment_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Payment-linked statement entries cannot be deleted here. Edit or reverse the payment instead.';
  END IF;

  IF v_entry.student_purchase_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Purchase-linked statement entries cannot be deleted here. Edit or reverse the purchase instead.';
  END IF;

  -- Correction of a non-paycheck source: refuse (would leave effective amounts wrong).
  IF v_entry.financial_adjustment_id IS NOT NULL
     AND v_entry.teacher_paycheck_id IS NULL
     AND v_entry.front_desk_paycheck_id IS NULL THEN
    RAISE EXCEPTION
      'Correction entries cannot be deleted directly. Edit the original amount instead.';
  END IF;

  v_paycheck_id := v_entry.teacher_paycheck_id;
  v_front_desk_id := v_entry.front_desk_paycheck_id;

  IF v_paycheck_id IS NOT NULL THEN
    SELECT *
    INTO v_paycheck
    FROM public.teacher_paychecks AS tp
    WHERE tp.id = v_paycheck_id
    FOR UPDATE;

    IF FOUND THEN
      -- Reset saved per-class rates for every line on this paycheck.
      DELETE FROM public.teacher_class_pay_rates AS tcpr
      USING public.teacher_paycheck_lines AS tpl
      WHERE tpl.paycheck_id = v_paycheck.id
        AND tcpr.teacher_id = v_paycheck.teacher_id
        AND tcpr.class_id = tpl.class_id
        AND tcpr.grade_tier IS NOT DISTINCT FROM tpl.grade_tier;

      SELECT COALESCE(array_agg(fa.id), '{}'::bigint[])
      INTO v_adj_ids
      FROM public.financial_adjustments AS fa
      WHERE fa.source_kind = 'teacher_paycheck'
        AND fa.source_id = v_paycheck.id;

      SELECT COALESCE(array_agg(se.id), '{}'::bigint[])
      INTO v_entry_ids
      FROM public.statement_entries AS se
      WHERE se.teacher_paycheck_id = v_paycheck.id
         OR (
           cardinality(v_adj_ids) > 0
           AND se.financial_adjustment_id = ANY (v_adj_ids)
         );

      -- Break circular FKs before deleting.
      UPDATE public.teacher_paychecks
      SET statement_entry_id = NULL
      WHERE id = v_paycheck.id;

      UPDATE public.financial_adjustments
      SET statement_entry_id = NULL
      WHERE cardinality(v_adj_ids) > 0
        AND id = ANY (v_adj_ids);

      IF cardinality(v_entry_ids) > 0 THEN
        UPDATE public.statement_entries
        SET
          teacher_paycheck_id = NULL,
          financial_adjustment_id = NULL,
          corrects_entry_id = NULL
        WHERE id = ANY (v_entry_ids);

        DELETE FROM public.statement_entries
        WHERE id = ANY (v_entry_ids);
      END IF;

      IF cardinality(v_adj_ids) > 0 THEN
        DELETE FROM public.financial_adjustments
        WHERE id = ANY (v_adj_ids);
      END IF;

      -- Cascades to teacher_paycheck_lines.
      DELETE FROM public.teacher_paychecks
      WHERE id = v_paycheck.id;
    ELSE
      DELETE FROM public.statement_entries
      WHERE id = p_entry_id;
    END IF;

    RETURN;
  END IF;

  IF v_front_desk_id IS NOT NULL THEN
    SELECT *
    INTO v_front_desk
    FROM public.front_desk_paychecks AS fp
    WHERE fp.id = v_front_desk_id
    FOR UPDATE;

    IF FOUND THEN
      SELECT COALESCE(array_agg(se.id), '{}'::bigint[])
      INTO v_entry_ids
      FROM public.statement_entries AS se
      WHERE se.front_desk_paycheck_id = v_front_desk.id;

      UPDATE public.front_desk_paychecks
      SET statement_entry_id = NULL
      WHERE id = v_front_desk.id;

      IF cardinality(v_entry_ids) > 0 THEN
        UPDATE public.statement_entries
        SET front_desk_paycheck_id = NULL
        WHERE id = ANY (v_entry_ids);

        DELETE FROM public.statement_entries
        WHERE id = ANY (v_entry_ids);
      END IF;

      DELETE FROM public.front_desk_paychecks
      WHERE id = v_front_desk.id;
    ELSE
      DELETE FROM public.statement_entries
      WHERE id = p_entry_id;
    END IF;

    RETURN;
  END IF;

  -- Manual or recurring instance entry.
  DELETE FROM public.statement_entries
  WHERE id = p_entry_id;
END;
$$;

COMMENT ON FUNCTION public.delete_statement_entry(bigint) IS
  'Deletes a statement entry. Teacher paychecks are fully unwound and matching teacher_class_pay_rates are cleared.';

REVOKE ALL ON FUNCTION public.delete_statement_entry(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_statement_entry(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_statement_entry(bigint) TO service_role;
