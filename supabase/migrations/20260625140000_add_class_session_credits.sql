-- Track prepaid class credits, session usage, and absences per student/class.

CREATE TYPE session_record_status AS ENUM ('used', 'absent');

CREATE TYPE session_record_source AS ENUM ('automatic', 'manual');

CREATE TABLE student_class_balances (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  class_id bigint NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  sessions_total integer NOT NULL DEFAULT 0 CHECK (sessions_total >= 0),
  sessions_remaining integer NOT NULL DEFAULT 0 CHECK (sessions_remaining >= 0),
  sessions_used integer NOT NULL DEFAULT 0 CHECK (sessions_used >= 0),
  absence_count integer NOT NULL DEFAULT 0 CHECK (absence_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_class_balances_unique UNIQUE (student_id, class_id)
);

CREATE INDEX student_class_balances_student_id_idx ON student_class_balances (student_id);
CREATE INDEX student_class_balances_class_id_idx ON student_class_balances (class_id);

CREATE TABLE class_session_records (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  class_id bigint NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  class_schedule_id bigint REFERENCES public.class_schedules (id) ON DELETE SET NULL,
  session_date date NOT NULL,
  status session_record_status NOT NULL,
  source session_record_source NOT NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  CONSTRAINT class_session_records_occurrence_unique UNIQUE (
    student_id,
    class_id,
    class_schedule_id,
    session_date
  )
);

CREATE INDEX class_session_records_student_class_idx
  ON class_session_records (student_id, class_id);

CREATE INDEX class_session_records_session_date_idx
  ON class_session_records (session_date DESC);

COMMENT ON TABLE student_class_balances IS 'Prepaid lesson credits per student and class.';
COMMENT ON TABLE class_session_records IS 'Ledger of class sessions used or marked absent.';

ALTER TABLE student_class_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_session_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view student class balances"
  ON student_class_balances
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

CREATE POLICY "Active staff can manage student class balances"
  ON student_class_balances
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

CREATE POLICY "Active staff can view class session records"
  ON class_session_records
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

CREATE POLICY "Active staff can insert class session records"
  ON class_session_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE ON student_class_balances TO authenticated;
GRANT SELECT, INSERT ON class_session_records TO authenticated;

CREATE OR REPLACE FUNCTION public.add_student_class_credits(
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

  INSERT INTO student_class_balances (
    student_id,
    class_id,
    sessions_total,
    sessions_remaining,
    sessions_used,
    absence_count
  )
  VALUES (p_student_id, p_class_id, p_count, p_count, 0, 0)
  ON CONFLICT (student_id, class_id) DO UPDATE SET
    sessions_total = student_class_balances.sessions_total + p_count,
    sessions_remaining = student_class_balances.sessions_remaining + p_count,
    updated_at = now();
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
    RETURN NULL;
  END IF;

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

  RETURN v_record_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_student_class_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_class_session TO authenticated;
