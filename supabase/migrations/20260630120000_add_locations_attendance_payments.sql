-- Locations, attendance, make-up sessions, credit write-offs, and payment status.

CREATE TABLE locations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

INSERT INTO locations (slug, name) VALUES
  ('brooklyn', 'Brooklyn'),
  ('staten_island', 'Staten Island');

ALTER TABLE rooms
  ADD COLUMN location_id bigint REFERENCES public.locations (id) ON DELETE SET NULL;

ALTER TABLE classes
  ADD COLUMN location_id bigint REFERENCES public.locations (id) ON DELETE SET NULL;

UPDATE rooms
SET location_id = (SELECT id FROM locations WHERE slug = 'brooklyn')
WHERE location_id IS NULL;

CREATE INDEX rooms_location_id_idx ON rooms (location_id);
CREATE INDEX classes_location_id_idx ON classes (location_id);

CREATE TYPE payment_status AS ENUM ('completed', 'refunded', 'exchanged');

ALTER TABLE class_payments
  ADD COLUMN status payment_status NOT NULL DEFAULT 'completed',
  ADD COLUMN exchanged_for_payment_id bigint REFERENCES public.class_payments (id) ON DELETE SET NULL,
  ADD COLUMN status_changed_at timestamptz,
  ADD COLUMN status_changed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN status_notes text;

CREATE INDEX class_payments_status_idx ON class_payments (status);

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

CREATE TABLE class_attendance (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  class_id bigint NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  class_schedule_id bigint REFERENCES public.class_schedules (id) ON DELETE SET NULL,
  session_date date NOT NULL,
  status attendance_status NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_attendance_occurrence_unique UNIQUE (
    student_id,
    class_id,
    class_schedule_id,
    session_date
  )
);

CREATE INDEX class_attendance_session_date_idx ON class_attendance (session_date DESC);
CREATE INDEX class_attendance_class_id_idx ON class_attendance (class_id);

CREATE TABLE class_makeup_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  class_id bigint NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  class_schedule_id bigint REFERENCES public.class_schedules (id) ON DELETE SET NULL,
  session_date date NOT NULL,
  credit_cost integer NOT NULL CHECK (credit_cost IN (1, 2)),
  related_attendance_id bigint REFERENCES public.class_attendance (id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX class_makeup_sessions_student_class_idx
  ON class_makeup_sessions (student_id, class_id);

CREATE TABLE class_credit_writeoffs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  class_id bigint NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  credits integer NOT NULL CHECK (credits > 0),
  reason text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX class_credit_writeoffs_student_class_idx
  ON class_credit_writeoffs (student_id, class_id);

CREATE TABLE class_credit_grants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  class_id bigint NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  credits integer NOT NULL CHECK (credits > 0),
  reason text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX class_credit_grants_student_class_idx
  ON class_credit_grants (student_id, class_id);

COMMENT ON TABLE locations IS 'Physical campus locations (Brooklyn, Staten Island, etc.).';
COMMENT ON TABLE class_attendance IS 'Per-session attendance: present, absent, late, or excused.';
COMMENT ON TABLE class_makeup_sessions IS 'Make-up lessons — regular = 1 credit, make-up = 1 or 2 credits.';
COMMENT ON TABLE class_credit_writeoffs IS 'Credits written off (forfeited or adjusted down).';
COMMENT ON TABLE class_credit_grants IS 'Manual class credit grants to students.';

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_makeup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_credit_writeoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_credit_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view locations"
  ON locations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can view class attendance"
  ON class_attendance FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can manage class attendance"
  ON class_attendance FOR ALL TO authenticated
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

CREATE POLICY "Active staff can view makeup sessions"
  ON class_makeup_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can insert makeup sessions"
  ON class_makeup_sessions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid() AND staff_user.is_active = true
    )
  );

CREATE POLICY "Active staff can view credit writeoffs"
  ON class_credit_writeoffs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can insert credit writeoffs"
  ON class_credit_writeoffs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid() AND staff_user.is_active = true
    )
  );

CREATE POLICY "Active staff can view credit grants"
  ON class_credit_grants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can insert credit grants"
  ON class_credit_grants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid() AND staff_user.is_active = true
    )
  );

GRANT SELECT ON locations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON class_attendance TO authenticated;
GRANT SELECT, INSERT ON class_makeup_sessions TO authenticated;
GRANT SELECT, INSERT ON class_credit_writeoffs TO authenticated;
GRANT SELECT, INSERT ON class_credit_grants TO authenticated;

CREATE POLICY "Active staff can update class payments"
  ON class_payments FOR UPDATE TO authenticated
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

GRANT UPDATE ON class_payments TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_student_class_balance(
  p_student_id bigint,
  p_class_id bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO student_class_balances (
    student_id, class_id, sessions_total, sessions_remaining, sessions_used, absence_count
  )
  VALUES (p_student_id, p_class_id, 0, 0, 0, 0)
  ON CONFLICT (student_id, class_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_class_credits(
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
    sessions_used = sessions_used + p_count,
    sessions_remaining = GREATEST(sessions_remaining - p_count, 0),
    updated_at = now()
  WHERE student_id = p_student_id AND class_id = p_class_id;
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
      PERFORM deduct_class_credits(p_student_id, p_class_id, 1);
      PERFORM record_class_session(
        p_student_id, p_class_id, p_class_schedule_id, p_session_date,
        'used', 'manual', p_created_by
      );
    ELSIF p_status = 'absent' THEN
      UPDATE student_class_balances
      SET absence_count = absence_count + 1, updated_at = now()
      WHERE student_id = p_student_id AND class_id = p_class_id;
      PERFORM record_class_session(
        p_student_id, p_class_id, p_class_schedule_id, p_session_date,
        'absent', 'manual', p_created_by
      );
    END IF;
  END IF;

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

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_credit_writeoff(
  p_student_id bigint,
  p_class_id bigint,
  p_credits integer,
  p_reason text DEFAULT NULL,
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
  IF p_credits <= 0 THEN
    RAISE EXCEPTION 'Write-off credits must be positive';
  END IF;

  INSERT INTO class_credit_writeoffs (student_id, class_id, credits, reason, created_by)
  VALUES (p_student_id, p_class_id, p_credits, p_reason, p_created_by)
  RETURNING id INTO v_id;

  PERFORM ensure_student_class_balance(p_student_id, p_class_id);

  UPDATE student_class_balances
  SET
    sessions_remaining = GREATEST(sessions_remaining - p_credits, 0),
    updated_at = now()
  WHERE student_id = p_student_id AND class_id = p_class_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_student_class_credits(
  p_student_id bigint,
  p_class_id bigint,
  p_credits integer,
  p_reason text DEFAULT NULL,
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
  IF p_credits <= 0 THEN
    RAISE EXCEPTION 'Grant credits must be positive';
  END IF;

  INSERT INTO class_credit_grants (student_id, class_id, credits, reason, created_by)
  VALUES (p_student_id, p_class_id, p_credits, p_reason, p_created_by)
  RETURNING id INTO v_id;

  PERFORM add_student_class_credits(p_student_id, p_class_id, p_credits);

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_payment_status(
  p_payment_id bigint,
  p_status payment_status,
  p_exchanged_for_payment_id bigint DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_changed_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment class_payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM class_payments WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.status <> 'completed' THEN
    RAISE EXCEPTION 'Only completed payments can be updated';
  END IF;

  IF p_status = 'refunded' THEN
    PERFORM ensure_student_class_balance(v_payment.student_id, v_payment.class_id);

    UPDATE student_class_balances
    SET
      sessions_total = GREATEST(sessions_total - v_payment.session_count, 0),
      sessions_remaining = GREATEST(sessions_remaining - v_payment.session_count, 0),
      updated_at = now()
    WHERE student_id = v_payment.student_id AND class_id = v_payment.class_id;
  END IF;

  UPDATE class_payments
  SET
    status = p_status,
    exchanged_for_payment_id = p_exchanged_for_payment_id,
    status_notes = p_notes,
    status_changed_at = now(),
    status_changed_by = p_changed_by
  WHERE id = p_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_student_class_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_class_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_class_attendance TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_makeup_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_credit_writeoff TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_student_class_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_payment_status TO authenticated;
