-- Rename Brooklyn admin and link to Daniel Chen front desk for hour logging.

UPDATE public.staff_accounts
SET
  full_name = 'Daniel R Chen',
  teacher_id = 225
WHERE id = '7bdc0bc2-5c1e-4bbd-83e9-f6f691e9f9f5'
  AND role = 'admin'
  AND EXISTS (
    SELECT 1
    FROM public.teachers AS t
    WHERE t.id = 225
      AND t.position = 'front_desk'
  );
