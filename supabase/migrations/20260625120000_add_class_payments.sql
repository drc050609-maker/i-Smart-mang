-- Class tuition payments recorded by staff.

CREATE TYPE payment_plan AS ENUM ('single', 'package_20', 'package_50');

CREATE TABLE class_payments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE RESTRICT,
  class_id bigint NOT NULL REFERENCES public.classes (id) ON DELETE RESTRICT,
  payment_plan payment_plan NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  session_count integer NOT NULL CHECK (session_count > 0),
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  notes text
);

CREATE INDEX class_payments_student_id_idx ON class_payments (student_id);
CREATE INDEX class_payments_class_id_idx ON class_payments (class_id);
CREATE INDEX class_payments_paid_at_idx ON class_payments (paid_at DESC);

COMMENT ON TABLE class_payments IS 'Tuition payments for classes — single sessions or prepaid packages.';

ALTER TABLE class_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view class payments"
  ON class_payments
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

CREATE POLICY "Active staff can insert class payments"
  ON class_payments
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

GRANT SELECT, INSERT ON class_payments TO authenticated;
