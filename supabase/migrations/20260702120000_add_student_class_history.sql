-- Unified history of every class session a student took (regular + makeup).

CREATE TYPE student_class_history_type AS ENUM ('regular', 'makeup');

CREATE TABLE student_class_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  class_id bigint NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  class_schedule_id bigint REFERENCES public.class_schedules (id) ON DELETE SET NULL,
  session_date date NOT NULL,
  history_type student_class_history_type NOT NULL DEFAULT 'regular',
  attendance_status attendance_status,
  credits_used integer NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
  source session_record_source NOT NULL DEFAULT 'manual',
  notes text,
  class_attendance_id bigint REFERENCES public.class_attendance (id) ON DELETE SET NULL,
  session_record_id bigint REFERENCES public.class_session_records (id) ON DELETE SET NULL,
  makeup_session_id bigint REFERENCES public.class_makeup_sessions (id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX student_class_history_regular_unique
  ON student_class_history (student_id, class_id, class_schedule_id, session_date)
  WHERE history_type = 'regular';

CREATE INDEX student_class_history_student_date_idx
  ON student_class_history (student_id, session_date DESC);

CREATE INDEX student_class_history_student_class_idx
  ON student_class_history (student_id, class_id);

COMMENT ON TABLE student_class_history IS
  'Complete history of classes each student took, including attendance, credits, and make-ups.';

ALTER TABLE student_class_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view student class history"
  ON student_class_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can manage student class history"
  ON student_class_history FOR ALL TO authenticated
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

GRANT SELECT, INSERT, UPDATE ON student_class_history TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_student_class_history(
  p_student_id bigint,
  p_class_id bigint,
  p_class_schedule_id bigint,
  p_session_date date,
  p_history_type student_class_history_type DEFAULT 'regular',
  p_attendance_status attendance_status DEFAULT NULL,
  p_credits_used integer DEFAULT NULL,
  p_source session_record_source DEFAULT 'manual',
  p_notes text DEFAULT NULL,
  p_class_attendance_id bigint DEFAULT NULL,
  p_session_record_id bigint DEFAULT NULL,
  p_makeup_session_id bigint DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_history_id bigint;
  v_credits integer := COALESCE(p_credits_used, 0);
BEGIN
  IF p_history_type = 'makeup' THEN
    INSERT INTO student_class_history (
      student_id,
      class_id,
      class_schedule_id,
      session_date,
      history_type,
      attendance_status,
      credits_used,
      source,
      notes,
      class_attendance_id,
      session_record_id,
      makeup_session_id,
      created_by
    )
    VALUES (
      p_student_id,
      p_class_id,
      p_class_schedule_id,
      p_session_date,
      'makeup',
      p_attendance_status,
      v_credits,
      p_source,
      p_notes,
      p_class_attendance_id,
      p_session_record_id,
      p_makeup_session_id,
      p_created_by
    )
    RETURNING id INTO v_history_id;

    RETURN v_history_id;
  END IF;

  INSERT INTO student_class_history (
    student_id,
    class_id,
    class_schedule_id,
    session_date,
    history_type,
    attendance_status,
    credits_used,
    source,
    notes,
    class_attendance_id,
    session_record_id,
    makeup_session_id,
    created_by
  )
  VALUES (
    p_student_id,
    p_class_id,
    p_class_schedule_id,
    p_session_date,
    'regular',
    p_attendance_status,
    v_credits,
    p_source,
    p_notes,
    p_class_attendance_id,
    p_session_record_id,
    p_makeup_session_id,
    p_created_by
  )
  ON CONFLICT (student_id, class_id, class_schedule_id, session_date)
    WHERE history_type = 'regular'
  DO UPDATE SET
    attendance_status = COALESCE(EXCLUDED.attendance_status, student_class_history.attendance_status),
    credits_used = CASE
      WHEN EXCLUDED.credits_used > 0 THEN EXCLUDED.credits_used
      ELSE student_class_history.credits_used
    END,
    source = EXCLUDED.source,
    notes = COALESCE(EXCLUDED.notes, student_class_history.notes),
    class_attendance_id = COALESCE(EXCLUDED.class_attendance_id, student_class_history.class_attendance_id),
    session_record_id = COALESCE(EXCLUDED.session_record_id, student_class_history.session_record_id),
    updated_at = now()
  RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_class_session(
  p_student_id bigint,
  p_class_id bigint,
  p_class_schedule_id bigint,
  p_session_date date,
  p_status session_record_status,
  p_source session_record_source,
  p_created_by uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id bigint;
  v_credits integer := CASE WHEN p_status = 'used' THEN 1 ELSE 0 END;
BEGIN
  INSERT INTO class_session_records (
    student_id,
    class_id,
    class_schedule_id,
    session_date,
    status,
    source,
    created_by
  )
  VALUES (
    p_student_id,
    p_class_id,
    p_class_schedule_id,
    p_session_date,
    p_status,
    p_source,
    p_created_by
  )
  ON CONFLICT (student_id, class_id, class_schedule_id, session_date) DO NOTHING
  RETURNING id INTO v_record_id;

  IF v_record_id IS NULL THEN
    SELECT id INTO v_record_id
    FROM class_session_records
    WHERE student_id = p_student_id
      AND class_id = p_class_id
      AND class_schedule_id IS NOT DISTINCT FROM p_class_schedule_id
      AND session_date = p_session_date;
  ELSE
    INSERT INTO student_class_balances (
      student_id,
      class_id,
      sessions_total,
      sessions_remaining,
      sessions_used,
      absence_count
    )
    VALUES (p_student_id, p_class_id, 0, 0, 0, 0)
    ON CONFLICT (student_id, class_id) DO NOTHING;

    IF p_status = 'used' THEN
      UPDATE student_class_balances
      SET
        sessions_used = sessions_used + 1,
        sessions_remaining = GREATEST(sessions_remaining - 1, 0),
        updated_at = now()
      WHERE student_id = p_student_id
        AND class_id = p_class_id;
    ELSE
      UPDATE student_class_balances
      SET
        absence_count = absence_count + 1,
        updated_at = now()
      WHERE student_id = p_student_id
        AND class_id = p_class_id;
    END IF;
  END IF;

  PERFORM upsert_student_class_history(
    p_student_id,
    p_class_id,
    p_class_schedule_id,
    p_session_date,
    'regular',
    CASE
      WHEN p_status = 'used' THEN NULL
      WHEN p_status = 'absent' THEN 'absent'::attendance_status
      ELSE NULL
    END,
    v_credits,
    p_source,
    NULL,
    NULL,
    v_record_id,
    NULL,
    p_created_by
  );

  RETURN v_record_id;
END;
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
BEGIN
  SELECT status INTO v_previous_status
  FROM class_attendance
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

  IF v_previous_status IS NULL THEN
    IF p_status IN ('present', 'late') THEN
      v_credits := 1;
      PERFORM deduct_class_credits(p_student_id, p_class_id, 1);
      v_session_record_id := record_class_session(
        p_student_id, p_class_id, p_class_schedule_id, p_session_date,
        'used', 'manual', p_created_by
      );
    ELSIF p_status = 'absent' THEN
      UPDATE student_class_balances
      SET absence_count = absence_count + 1, updated_at = now()
      WHERE student_id = p_student_id AND class_id = p_class_id;
      v_session_record_id := record_class_session(
        p_student_id, p_class_id, p_class_schedule_id, p_session_date,
        'absent', 'manual', p_created_by
      );
    END IF;
  ELSE
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
    NULL,
    p_created_by
  );

  RETURN v_attendance_id;
END;
$$;

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
    credit_cost, related_attendance_id, notes, created_by
  )
  VALUES (
    p_student_id, p_class_id, p_class_schedule_id, p_session_date,
    p_credit_cost, p_related_attendance_id, p_notes, p_created_by
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

-- Backfill from existing attendance records.
INSERT INTO student_class_history (
  student_id,
  class_id,
  class_schedule_id,
  session_date,
  history_type,
  attendance_status,
  credits_used,
  source,
  notes,
  class_attendance_id,
  session_record_id,
  created_by,
  created_at,
  updated_at
)
SELECT
  ca.student_id,
  ca.class_id,
  ca.class_schedule_id,
  ca.session_date,
  'regular',
  ca.status,
  CASE WHEN ca.status IN ('present', 'late') THEN 1 ELSE 0 END,
  COALESCE(csr.source, 'manual'),
  ca.notes,
  ca.id,
  csr.id,
  ca.created_by,
  ca.created_at,
  ca.updated_at
FROM class_attendance AS ca
LEFT JOIN class_session_records AS csr
  ON csr.student_id = ca.student_id
  AND csr.class_id = ca.class_id
  AND csr.class_schedule_id IS NOT DISTINCT FROM ca.class_schedule_id
  AND csr.session_date = ca.session_date
ON CONFLICT (student_id, class_id, class_schedule_id, session_date)
  WHERE history_type = 'regular'
DO NOTHING;

-- Backfill automatic/manual session records without attendance rows.
INSERT INTO student_class_history (
  student_id,
  class_id,
  class_schedule_id,
  session_date,
  history_type,
  attendance_status,
  credits_used,
  source,
  session_record_id,
  created_by,
  created_at
)
SELECT
  csr.student_id,
  csr.class_id,
  csr.class_schedule_id,
  csr.session_date,
  'regular',
  CASE
    WHEN csr.status = 'absent' THEN 'absent'::attendance_status
    ELSE NULL
  END,
  CASE WHEN csr.status = 'used' THEN 1 ELSE 0 END,
  csr.source,
  csr.id,
  csr.created_by,
  csr.created_at
FROM class_session_records AS csr
WHERE NOT EXISTS (
  SELECT 1
  FROM student_class_history AS sch
  WHERE sch.student_id = csr.student_id
    AND sch.class_id = csr.class_id
    AND sch.class_schedule_id IS NOT DISTINCT FROM csr.class_schedule_id
    AND sch.session_date = csr.session_date
    AND sch.history_type = 'regular'
);

-- Backfill make-up sessions.
INSERT INTO student_class_history (
  student_id,
  class_id,
  class_schedule_id,
  session_date,
  history_type,
  attendance_status,
  credits_used,
  source,
  notes,
  class_attendance_id,
  makeup_session_id,
  created_by,
  created_at
)
SELECT
  cms.student_id,
  cms.class_id,
  cms.class_schedule_id,
  cms.session_date,
  'makeup',
  'present',
  cms.credit_cost,
  'manual',
  cms.notes,
  cms.related_attendance_id,
  cms.id,
  cms.created_by,
  cms.created_at
FROM class_makeup_sessions AS cms
WHERE NOT EXISTS (
  SELECT 1
  FROM student_class_history AS sch
  WHERE sch.makeup_session_id = cms.id
);

GRANT EXECUTE ON FUNCTION public.upsert_student_class_history TO authenticated;
