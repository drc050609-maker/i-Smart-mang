CREATE TYPE staff_language AS ENUM ('en', 'zh');

ALTER TABLE staff_accounts
  ADD COLUMN preferred_language staff_language NOT NULL DEFAULT 'en';

COMMENT ON COLUMN staff_accounts.preferred_language IS
  'UI language preference for the admin console.';

CREATE OR REPLACE FUNCTION public.set_staff_preferred_language(
  p_language staff_language
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM staff_accounts
    WHERE id = auth.uid()
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE staff_accounts
  SET preferred_language = p_language
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_staff_preferred_language TO authenticated;
