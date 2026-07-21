-- Student and tutor portal logins linked to school records by ID.

CREATE TYPE member_type AS ENUM ('student', 'teacher');

CREATE TABLE member_accounts (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  member_type member_type NOT NULL,
  student_id bigint REFERENCES public.students (id) ON DELETE CASCADE,
  teacher_id bigint REFERENCES public.teachers (id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT member_accounts_profile_check CHECK (
    (member_type = 'student' AND student_id IS NOT NULL AND teacher_id IS NULL)
    OR (member_type = 'teacher' AND teacher_id IS NOT NULL AND student_id IS NULL)
  )
);

CREATE UNIQUE INDEX member_accounts_email_idx ON member_accounts (lower(email));
CREATE UNIQUE INDEX member_accounts_student_id_idx ON member_accounts (student_id) WHERE student_id IS NOT NULL;
CREATE UNIQUE INDEX member_accounts_teacher_id_idx ON member_accounts (teacher_id) WHERE teacher_id IS NOT NULL;

COMMENT ON TABLE member_accounts IS 'Student and tutor portal logins linked to school records by ID.';

ALTER TABLE member_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view member accounts"
  ON member_accounts
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

CREATE POLICY "Members can view their own account"
  ON member_accounts
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Active staff can insert member accounts"
  ON member_accounts
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

CREATE POLICY "Active staff can update member accounts"
  ON member_accounts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE ON member_accounts TO authenticated;
