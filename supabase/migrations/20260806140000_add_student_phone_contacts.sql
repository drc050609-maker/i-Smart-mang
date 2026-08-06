-- Phone numbers for students, labeled by whose phone it is.

CREATE TYPE public.phone_owner_role AS ENUM (
  'self',
  'mother',
  'father',
  'grandmother',
  'grandfather',
  'guardian',
  'aunt',
  'uncle',
  'sibling',
  'other'
);

CREATE TABLE public.student_phone_contacts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  phone_number text NOT NULL CHECK (char_length(trim(phone_number)) > 0),
  owner_role public.phone_owner_role NOT NULL DEFAULT 'other',
  owner_name text,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX student_phone_contacts_student_id_idx
  ON public.student_phone_contacts (student_id);

COMMENT ON TABLE public.student_phone_contacts IS
  'Student contact phone numbers labeled by owner (self, mother, father, etc.).';

ALTER TABLE public.student_phone_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view student phone contacts"
  ON public.student_phone_contacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can insert student phone contacts"
  ON public.student_phone_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can update student phone contacts"
  ON public.student_phone_contacts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can delete student phone contacts"
  ON public.student_phone_contacts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_phone_contacts TO authenticated;
GRANT ALL ON public.student_phone_contacts TO service_role;
GRANT USAGE ON TYPE public.phone_owner_role TO authenticated, service_role;
