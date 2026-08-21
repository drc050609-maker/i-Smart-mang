-- Attendance credit rules + scheduled makeup lessons on the calendar.
-- Present / absent / late consume 1 credit (with reverse on status change).
-- Excused does not. A scheduled makeup defers the original deduction until
-- that makeup datetime has passed.

ALTER TABLE public.class_schedules
  ADD COLUMN IF NOT EXISTS is_makeup boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.class_schedules.is_makeup IS
  'One-off makeup occurrence shown on the teacher calendar with a makeup label.';

CREATE INDEX IF NOT EXISTS class_schedules_is_makeup_idx
  ON public.class_schedules (id)
  WHERE is_makeup;

ALTER TABLE public.class_makeup_sessions
  ADD COLUMN IF NOT EXISTS session_start_time time,
  ADD COLUMN IF NOT EXISTS session_end_time time,
  ADD COLUMN IF NOT EXISTS makeup_schedule_id bigint REFERENCES public.class_schedules (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_schedule_id bigint REFERENCES public.class_schedules (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_session_date date,
  ADD COLUMN IF NOT EXISTS credits_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credits_applied_at timestamptz;

COMMENT ON COLUMN public.class_makeup_sessions.credits_applied IS
  'True once the makeup has consumed a class credit (after the makeup time passed, or when recorded as completed).';

-- Historic makeup rows already deducted credits when they were inserted.
UPDATE public.class_makeup_sessions
SET credits_applied = true,
    credits_applied_at = COALESCE(credits_applied_at, created_at)
WHERE credits_applied = false
  AND makeup_schedule_id IS NULL
  AND original_schedule_id IS NULL;

CREATE INDEX IF NOT EXISTS class_makeup_sessions_makeup_schedule_idx
  ON public.class_makeup_sessions (makeup_schedule_id)
  WHERE makeup_schedule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS class_makeup_sessions_original_occurrence_idx
  ON public.class_makeup_sessions (
    student_id,
    class_id,
    original_schedule_id,
    original_session_date
  )
  WHERE original_schedule_id IS NOT NULL
    AND original_session_date IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS class_makeup_sessions_original_unique
  ON public.class_makeup_sessions (
    student_id,
    class_id,
    original_schedule_id,
    original_session_date
  )
  WHERE original_schedule_id IS NOT NULL
    AND original_session_date IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS class_makeup_sessions_makeup_schedule_unique
  ON public.class_makeup_sessions (makeup_schedule_id)
  WHERE makeup_schedule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS class_makeup_sessions_due_idx
  ON public.class_makeup_sessions (session_date, session_end_time)
  WHERE credits_applied = false;

DROP POLICY IF EXISTS "Active staff can update makeup sessions" ON public.class_makeup_sessions;
CREATE POLICY "Active staff can update makeup sessions"
  ON public.class_makeup_sessions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid() AND staff_user.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid() AND staff_user.is_active = true
    )
  );

GRANT UPDATE ON public.class_makeup_sessions TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_class_credits(
  p_student_id bigint,
  p_class_id bigint,
  p_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_count <= 0 THEN
    RAISE EXCEPTION 'Credit count must be positive';
  END IF;

  PERFORM ensure_student_class_balance(p_student_id, p_class_id);

  UPDATE student_class_balances
  SET
    sessions_used = GREATEST(sessions_used - p_count, 0),
    sessions_remaining = sessions_remaining + p_count,
    updated_at = now()
  WHERE student_id = p_student_id AND class_id = p_class_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_class_credits TO authenticated;

CREATE OR REPLACE FUNCTION public.attendance_status_consumes_credit(
  p_status attendance_status
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('present', 'late', 'absent');
$$;

CREATE OR REPLACE FUNCTION public.record_class_attendance(
  p_student_id bigint,
  p_class_id bigint,
  p_class_schedule_id bigint,
  p_session_date date,
  p_status attendance_status,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attendance_id bigint;
  v_previous_status attendance_status;
  v_credits integer := 0;
  v_session_record_id bigint;
  v_existing_record_status session_record_status;
  v_makeup class_makeup_sessions%ROWTYPE;
  v_is_original_with_makeup boolean := false;
  v_is_makeup_slot boolean := false;
  v_currently_consumed boolean := false;
  v_desired_consumed boolean := false;
  v_prev_absent boolean := false;
  v_new_absent boolean := false;
  v_makeup_found boolean := false;
BEGIN
  SELECT status INTO v_previous_status
  FROM class_attendance
  WHERE student_id = p_student_id
    AND class_id = p_class_id
    AND class_schedule_id IS NOT DISTINCT FROM p_class_schedule_id
    AND session_date = p_session_date;

  SELECT * INTO v_makeup
  FROM class_makeup_sessions
  WHERE student_id = p_student_id
    AND class_id = p_class_id
    AND (
      (
        original_schedule_id IS NOT DISTINCT FROM p_class_schedule_id
        AND original_session_date = p_session_date
      )
      OR makeup_schedule_id IS NOT DISTINCT FROM p_class_schedule_id
    )
  ORDER BY
    CASE WHEN makeup_schedule_id IS NOT DISTINCT FROM p_class_schedule_id THEN 0 ELSE 1 END,
    id DESC
  LIMIT 1;

  v_makeup_found := FOUND;
  IF v_makeup_found THEN
    v_is_makeup_slot := v_makeup.makeup_schedule_id IS NOT DISTINCT FROM p_class_schedule_id;
    v_is_original_with_makeup :=
      (NOT v_is_makeup_slot)
      AND v_makeup.original_schedule_id IS NOT DISTINCT FROM p_class_schedule_id
      AND v_makeup.original_session_date = p_session_date;
  END IF;

  SELECT status, id INTO v_existing_record_status, v_session_record_id
  FROM class_session_records
  WHERE student_id = p_student_id
    AND class_id = p_class_id
    AND class_schedule_id IS NOT DISTINCT FROM p_class_schedule_id
    AND session_date = p_session_date;

  INSERT INTO class_attendance (
    student_id, class_id, class_schedule_id, session_date, status, notes, created_by
  )
  VALUES (
    p_student_id, p_class_id, p_class_schedule_id, p_session_date, p_status, p_notes, p_created_by
  )
  ON CONFLICT (student_id, class_id, class_schedule_id, session_date) DO UPDATE SET
    status = EXCLUDED.status,
    notes = COALESCE(EXCLUDED.notes, class_attendance.notes),
    updated_at = now()
  RETURNING id INTO v_attendance_id;

  PERFORM ensure_student_class_balance(p_student_id, p_class_id);

  IF v_is_makeup_slot THEN
    IF v_makeup.credits_applied THEN
      v_currently_consumed := true;
      v_desired_consumed := true;
    ELSE
      v_currently_consumed := false;
      v_desired_consumed := attendance_status_consumes_credit(p_status);
    END IF;
  ELSIF v_is_original_with_makeup THEN
    v_currently_consumed := false;
    v_desired_consumed := false;
  ELSE
    IF v_previous_status IS NOT NULL THEN
      v_currently_consumed := attendance_status_consumes_credit(v_previous_status);
    ELSE
      v_currently_consumed := v_existing_record_status IS NOT DISTINCT FROM 'used';
    END IF;
    v_desired_consumed := attendance_status_consumes_credit(p_status);
  END IF;

  IF v_desired_consumed AND NOT v_currently_consumed THEN
    PERFORM deduct_class_credits(p_student_id, p_class_id, 1);
    v_credits := 1;

    INSERT INTO class_session_records (
      student_id, class_id, class_schedule_id, session_date, status, source, created_by
    )
    VALUES (
      p_student_id, p_class_id, p_class_schedule_id, p_session_date, 'used', 'manual', p_created_by
    )
    ON CONFLICT (student_id, class_id, class_schedule_id, session_date) DO UPDATE SET
      status = 'used',
      source = 'manual'
    RETURNING id INTO v_session_record_id;

    IF v_is_makeup_slot AND v_makeup.id IS NOT NULL THEN
      UPDATE class_makeup_sessions
      SET credits_applied = true,
          credits_applied_at = now(),
          related_attendance_id = COALESCE(related_attendance_id, v_attendance_id)
      WHERE id = v_makeup.id;
    END IF;
  ELSIF v_currently_consumed AND NOT v_desired_consumed THEN
    PERFORM restore_class_credits(p_student_id, p_class_id, 1);
    v_credits := 0;
  ELSIF v_desired_consumed THEN
    v_credits := 1;
  END IF;

  v_prev_absent := v_previous_status IS NOT DISTINCT FROM 'absent';
  v_new_absent := p_status IS NOT DISTINCT FROM 'absent';

  IF v_new_absent AND NOT v_prev_absent THEN
    UPDATE student_class_balances
    SET absence_count = absence_count + 1, updated_at = now()
    WHERE student_id = p_student_id AND class_id = p_class_id;
  ELSIF v_prev_absent AND NOT v_new_absent THEN
    UPDATE student_class_balances
    SET absence_count = GREATEST(absence_count - 1, 0), updated_at = now()
    WHERE student_id = p_student_id AND class_id = p_class_id;
  END IF;

  IF v_session_record_id IS NULL THEN
    SELECT id INTO v_session_record_id
    FROM class_session_records
    WHERE student_id = p_student_id
      AND class_id = p_class_id
      AND class_schedule_id IS NOT DISTINCT FROM p_class_schedule_id
      AND session_date = p_session_date;
  END IF;

    PERFORM upsert_student_class_history(
    p_student_id,
    p_class_id,
    p_class_schedule_id,
    p_session_date,
    'regular',
    p_status,
    v_credits,
    'manual',
    p_notes,
    v_attendance_id,
    v_session_record_id,
    CASE WHEN v_is_makeup_slot THEN v_makeup.id ELSE NULL END,
    p_created_by
  );

  RETURN v_attendance_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_class_makeup(
  p_student_id bigint,
  p_class_id bigint,
  p_original_schedule_id bigint,
  p_original_session_date date,
  p_makeup_date date,
  p_start_time time,
  p_end_time time,
  p_created_by uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_makeup_id bigint;
  v_makeup_schedule_id bigint;
  v_attendance_id bigint;
  v_attendance_status attendance_status;
  v_record_status session_record_status;
  v_already_consumed boolean := false;
BEGIN
  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'Makeup end time must be after start time';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM class_schedules
    WHERE id = p_original_schedule_id AND class_id = p_class_id
  ) THEN
    RAISE EXCEPTION 'Original class schedule was not found';
  END IF;

  SELECT id, status INTO v_attendance_id, v_attendance_status
  FROM class_attendance
  WHERE student_id = p_student_id
    AND class_id = p_class_id
    AND class_schedule_id IS NOT DISTINCT FROM p_original_schedule_id
    AND session_date = p_original_session_date;

  SELECT status INTO v_record_status
  FROM class_session_records
  WHERE student_id = p_student_id
    AND class_id = p_class_id
    AND class_schedule_id IS NOT DISTINCT FROM p_original_schedule_id
    AND session_date = p_original_session_date;

  SELECT id, makeup_schedule_id INTO v_makeup_id, v_makeup_schedule_id
  FROM class_makeup_sessions
  WHERE student_id = p_student_id
    AND class_id = p_class_id
    AND original_schedule_id = p_original_schedule_id
    AND original_session_date = p_original_session_date
  FOR UPDATE;

  IF v_makeup_id IS NOT NULL THEN
    IF v_makeup_schedule_id IS NOT NULL THEN
      UPDATE class_schedules
      SET
        schedule_date = p_makeup_date,
        schedule_start_time = p_start_time,
        schedule_end_time = p_end_time,
        is_recurring = false,
        schedule_day_of_week = NULL,
        student_id = p_student_id,
        is_makeup = true
      WHERE id = v_makeup_schedule_id;
    ELSE
      INSERT INTO class_schedules (
        class_id, student_id, is_recurring, schedule_day_of_week, schedule_date,
        schedule_start_time, schedule_end_time, is_makeup
      )
      VALUES (
        p_class_id, p_student_id, false, NULL, p_makeup_date,
        p_start_time, p_end_time, true
      )
      RETURNING id INTO v_makeup_schedule_id;
    END IF;

    UPDATE class_makeup_sessions
    SET
      session_date = p_makeup_date,
      session_start_time = p_start_time,
      session_end_time = p_end_time,
      makeup_schedule_id = v_makeup_schedule_id,
      related_attendance_id = COALESCE(related_attendance_id, v_attendance_id),
      notes = COALESCE(notes, 'Scheduled makeup lesson')
    WHERE id = v_makeup_id;

    RETURN v_makeup_id;
  END IF;

  v_already_consumed :=
    (v_attendance_status IS NOT NULL AND attendance_status_consumes_credit(v_attendance_status))
    OR v_record_status IS NOT DISTINCT FROM 'used';

  INSERT INTO class_schedules (
    class_id, student_id, is_recurring, schedule_day_of_week, schedule_date,
    schedule_start_time, schedule_end_time, is_makeup
  )
  VALUES (
    p_class_id, p_student_id, false, NULL, p_makeup_date,
    p_start_time, p_end_time, true
  )
  RETURNING id INTO v_makeup_schedule_id;

  INSERT INTO class_makeup_sessions (
    student_id,
    class_id,
    class_schedule_id,
    session_date,
    session_start_time,
    session_end_time,
    credit_cost,
    related_attendance_id,
    notes,
    created_by,
    makeup_schedule_id,
    original_schedule_id,
    original_session_date,
    credits_applied
  )
  VALUES (
    p_student_id,
    p_class_id,
    v_makeup_schedule_id,
    p_makeup_date,
    p_start_time,
    p_end_time,
    1,
    v_attendance_id,
    'Scheduled makeup lesson',
    p_created_by,
    v_makeup_schedule_id,
    p_original_schedule_id,
    p_original_session_date,
    false
  )
  RETURNING id INTO v_makeup_id;

  IF v_already_consumed THEN
    PERFORM restore_class_credits(p_student_id, p_class_id, 1);
  END IF;

  RETURN v_makeup_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_class_makeup TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_due_makeup_credits(
  p_created_by uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row class_makeup_sessions%ROWTYPE;
  v_count integer := 0;
  v_record_id bigint;
BEGIN
  FOR v_row IN
    SELECT *
    FROM class_makeup_sessions
    WHERE credits_applied = false
      AND session_start_time IS NOT NULL
      AND session_end_time IS NOT NULL
      AND (session_date + session_end_time) AT TIME ZONE 'America/New_York' < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    v_record_id := NULL;

    SELECT id INTO v_record_id
    FROM class_session_records
    WHERE student_id = v_row.student_id
      AND class_id = v_row.class_id
      AND class_schedule_id IS NOT DISTINCT FROM COALESCE(v_row.makeup_schedule_id, v_row.class_schedule_id)
      AND session_date = v_row.session_date
      AND status = 'used';

    IF v_record_id IS NULL THEN
      PERFORM deduct_class_credits(v_row.student_id, v_row.class_id, COALESCE(v_row.credit_cost, 1));

      INSERT INTO class_session_records (
        student_id, class_id, class_schedule_id, session_date, status, source, created_by, notes
      )
      VALUES (
        v_row.student_id,
        v_row.class_id,
        COALESCE(v_row.makeup_schedule_id, v_row.class_schedule_id),
        v_row.session_date,
        'used',
        'automatic',
        p_created_by,
        'Makeup lesson credit'
      )
      ON CONFLICT (student_id, class_id, class_schedule_id, session_date) DO NOTHING
      RETURNING id INTO v_record_id;
    END IF;

    UPDATE class_makeup_sessions
    SET credits_applied = true,
        credits_applied_at = now()
    WHERE id = v_row.id;

    PERFORM upsert_student_class_history(
      v_row.student_id,
      v_row.class_id,
      COALESCE(v_row.makeup_schedule_id, v_row.class_schedule_id),
      v_row.session_date,
      'makeup',
      'present',
      COALESCE(v_row.credit_cost, 1),
      'automatic',
      COALESCE(v_row.notes, 'Makeup lesson credit'),
      v_row.related_attendance_id,
      v_record_id,
      v_row.id,
      p_created_by
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_due_makeup_credits TO authenticated;

CREATE OR REPLACE FUNCTION public.record_makeup_session(
  p_student_id bigint,
  p_class_id bigint,
  p_class_schedule_id bigint,
  p_session_date date,
  p_credit_cost integer,
  p_related_attendance_id bigint DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  IF p_credit_cost NOT IN (1, 2) THEN
    RAISE EXCEPTION 'Make-up credit cost must be 1 or 2';
  END IF;

  INSERT INTO class_makeup_sessions (
    student_id, class_id, class_schedule_id, session_date,
    credit_cost, related_attendance_id, notes, created_by,
    credits_applied, credits_applied_at
  )
  VALUES (
    p_student_id, p_class_id, p_class_schedule_id, p_session_date,
    p_credit_cost, p_related_attendance_id, p_notes, p_created_by,
    true, now()
  )
  RETURNING id INTO v_id;

  PERFORM deduct_class_credits(p_student_id, p_class_id, p_credit_cost);

  PERFORM upsert_student_class_history(
    p_student_id,
    p_class_id,
    p_class_schedule_id,
    p_session_date,
    'makeup',
    'present',
    p_credit_cost,
    'manual',
    p_notes,
    p_related_attendance_id,
    NULL,
    v_id,
    p_created_by
  );

  RETURN v_id;
END;
$$;
