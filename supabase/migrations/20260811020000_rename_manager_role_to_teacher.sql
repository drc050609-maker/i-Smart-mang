-- Rename login role manager → teacher across the database.
ALTER TYPE public.staff_role RENAME VALUE 'manager' TO 'teacher';

ALTER TABLE public.staff_accounts
  ALTER COLUMN role SET DEFAULT 'teacher';

-- Keep Auth JWT app_metadata in sync with staff_accounts.role
UPDATE auth.users AS u
SET raw_app_meta_data =
  COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'teacher')
FROM public.staff_accounts AS s
WHERE s.id = u.id
  AND s.role = 'teacher';

-- Link Su Jia (Brooklyn) and Lin Ming (Staten Island) to teacher profiles for app/chat.
WITH brooklyn AS (
  SELECT id FROM public.locations WHERE slug = 'brooklyn' LIMIT 1
), staten AS (
  SELECT id FROM public.locations WHERE slug = 'staten_island' LIMIT 1
), su_jia AS (
  INSERT INTO public.teachers (first_name, last_name, location_id, position, is_active)
  SELECT 'Su', 'Jia', brooklyn.id, 'teacher', true
  FROM brooklyn
  RETURNING id
), lin_ming AS (
  INSERT INTO public.teachers (first_name, last_name, location_id, position, is_active)
  SELECT 'Lin', 'Ming', staten.id, 'teacher', true
  FROM staten
  RETURNING id
)
UPDATE public.staff_accounts AS sa
SET teacher_id = CASE
  WHEN sa.email = 'theonemusic99@gmail.com' THEN (SELECT id FROM su_jia)
  WHEN sa.email = 'ismartmusic66@gmail.com' THEN (SELECT id FROM lin_ming)
  ELSE sa.teacher_id
END
WHERE sa.email IN ('theonemusic99@gmail.com', 'ismartmusic66@gmail.com')
  AND sa.teacher_id IS NULL;
