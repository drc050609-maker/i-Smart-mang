-- Explicit monthly statement periods staff create from the statements page.

CREATE TABLE statement_periods (
  year smallint NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month smallint NOT NULL CHECK (month >= 1 AND month <= 12),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (year, month)
);

COMMENT ON TABLE statement_periods IS
  'Monthly statement periods opened by staff, including empty months.';

ALTER TABLE statement_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view statement periods"
  ON statement_periods
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

CREATE POLICY "Active staff can insert statement periods"
  ON statement_periods
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

GRANT SELECT, INSERT ON statement_periods TO authenticated;
