-- Prospective family leads with parent contact info, address, family history, and children.

CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'enrolled', 'closed');

CREATE TABLE leads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parent_first_name text NOT NULL CHECK (char_length(trim(parent_first_name)) > 0),
  parent_last_name text,
  phone_number text NOT NULL CHECK (char_length(trim(phone_number)) > 0),
  email text,
  street_1 text,
  street_2 text,
  city text,
  state text,
  zip_code text,
  family_history text,
  notes text,
  status lead_status NOT NULL DEFAULT 'new',
  location staff_location,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX leads_status_idx ON leads (status);
CREATE INDEX leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX leads_is_active_idx ON leads (is_active);

COMMENT ON TABLE leads IS
  'Prospective families — parent contact, address, family history, and notes.';

CREATE TABLE lead_children (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id bigint NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  first_name text NOT NULL CHECK (char_length(trim(first_name)) > 0),
  last_name text,
  dob date,
  background text,
  experience text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lead_children_lead_id_idx ON lead_children (lead_id);

COMMENT ON TABLE lead_children IS
  'Children associated with a lead, including background and prior experience.';

CREATE OR REPLACE FUNCTION public.set_leads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_leads_updated_at();

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view leads"
  ON leads
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

CREATE POLICY "Active staff can insert leads"
  ON leads
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

CREATE POLICY "Active staff can update leads"
  ON leads
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

CREATE POLICY "Active staff can delete leads"
  ON leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

CREATE POLICY "Active staff can view lead children"
  ON lead_children
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

CREATE POLICY "Active staff can insert lead children"
  ON lead_children
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

CREATE POLICY "Active staff can update lead children"
  ON lead_children
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

CREATE POLICY "Active staff can delete lead children"
  ON lead_children
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lead_children TO authenticated;
