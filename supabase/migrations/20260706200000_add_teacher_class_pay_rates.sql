-- Default per-class pay rates for tutors, reused across paycheck months.

CREATE TABLE teacher_class_pay_rates (
  teacher_id bigint NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  class_id bigint NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  rate_cents integer NOT NULL CHECK (rate_cents >= 0),
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_id, class_id)
);

CREATE INDEX teacher_class_pay_rates_teacher_id_idx
  ON teacher_class_pay_rates (teacher_id);

COMMENT ON TABLE teacher_class_pay_rates IS
  'Default pay rate per class for a tutor, applied to future paycheck months.';

ALTER TABLE teacher_class_pay_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view teacher class pay rates"
  ON teacher_class_pay_rates
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

CREATE POLICY "Active staff can insert teacher class pay rates"
  ON teacher_class_pay_rates
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

CREATE POLICY "Active staff can update teacher class pay rates"
  ON teacher_class_pay_rates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS viewer
      WHERE viewer.id = auth.uid()
        AND viewer.is_active = true
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

GRANT SELECT, INSERT, UPDATE ON teacher_class_pay_rates TO authenticated;
