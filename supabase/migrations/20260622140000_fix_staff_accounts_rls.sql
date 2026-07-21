DROP POLICY IF EXISTS "Active staff can view staff accounts" ON staff_accounts;

CREATE POLICY "Staff can view own account"
  ON staff_accounts
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM staff_accounts
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO authenticated;

CREATE POLICY "Active staff can view all staff accounts"
  ON staff_accounts
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff());
