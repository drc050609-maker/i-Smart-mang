-- Staff accounts for admin console authentication (admin vs manager roles).

CREATE TYPE staff_role AS ENUM ('admin', 'manager');

CREATE TABLE staff_accounts (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role staff_role NOT NULL DEFAULT 'manager',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX staff_accounts_role_idx ON staff_accounts (role);
CREATE UNIQUE INDEX staff_accounts_email_idx ON staff_accounts (lower(email));

COMMENT ON TABLE staff_accounts IS 'Admin console users linked to Supabase Auth. Role is also stored in auth.users app_metadata.';

ALTER TABLE staff_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view staff accounts"
  ON staff_accounts
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

CREATE POLICY "Admins can insert staff accounts"
  ON staff_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS admin_user
      WHERE admin_user.id = auth.uid()
        AND admin_user.role = 'admin'
        AND admin_user.is_active = true
    )
  );

CREATE POLICY "Admins can update staff accounts"
  ON staff_accounts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS admin_user
      WHERE admin_user.id = auth.uid()
        AND admin_user.role = 'admin'
        AND admin_user.is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE ON staff_accounts TO authenticated;
