-- Front desk login accounts: limited staff role linked to a teachers row.
-- Note: enum value must be added in its own transaction before policies reference it.

ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'front_desk';

ALTER TABLE public.staff_accounts
  ADD COLUMN IF NOT EXISTS teacher_id bigint
    REFERENCES public.teachers (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS staff_accounts_teacher_id_key
  ON public.staff_accounts (teacher_id)
  WHERE teacher_id IS NOT NULL;

COMMENT ON COLUMN public.staff_accounts.teacher_id IS
  'Linked teacher profile for front_desk role (hour logging).';
