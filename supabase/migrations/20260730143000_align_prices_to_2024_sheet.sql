-- Align catalog / class prices to official 2024.06.08 price sheet.
-- Fixes: Band $160/month (was $40), Dance 60-min packs, 1-to-1 Art catalog row.

-- Band: $160 / month (4 lessons), no packs
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  duration_minutes = 90,
  single_price_cents = 16000,
  package_20_price_cents = NULL,
  package_50_price_cents = NULL
WHERE subject = 'Band'
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial';

-- Dance 60 min: 20@$680 / 50@$1550
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  class_track = COALESCE(NULLIF(class_track, ''), 'dance'),
  single_price_cents = 3400,
  package_20_price_cents = 68000,
  package_50_price_cents = 155000
WHERE subject IN ('Jazz Dance', 'Jazz', 'Chinese Dance', 'Dance — Hip Hop')
  AND duration_minutes = 60
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial';

-- Dance 90 min: 20@$760 / 50@$1750 (re-affirm)
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  class_track = COALESCE(NULLIF(class_track, ''), 'dance'),
  single_price_cents = 3800,
  package_20_price_cents = 76000,
  package_50_price_cents = 175000
WHERE subject IN ('Jazz Dance', 'Jazz', 'Chinese Dance', 'Dance — Hip Hop')
  AND duration_minutes = 90
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial';

-- Art group 60 / 90 (re-affirm sheet + fill null campuses)
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  single_price_cents = 3300,
  package_20_price_cents = 66000,
  package_50_price_cents = 150000
WHERE subject = 'Art'
  AND duration_minutes = 60
  AND COALESCE(lesson_type, '') IN ('group', '')
  AND is_active = true;

UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  single_price_cents = 4300,
  package_20_price_cents = 86000,
  package_50_price_cents = 200000
WHERE subject = 'Art'
  AND duration_minutes = 90
  AND COALESCE(lesson_type, '') IN ('group', '')
  AND is_active = true;

-- Specialty group 60
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  single_price_cents = 4500,
  package_20_price_cents = 90000,
  package_50_price_cents = 210000
WHERE subject IN ('Sing & Play', 'Model / Catwalk', 'Music Theory')
  AND duration_minutes = 60
  AND COALESCE(lesson_type, '') IN ('group', '')
  AND is_active = true;

-- Other-instrument 1V1 45 / 60
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'private'),
  single_price_cents = 5300,
  package_20_price_cents = 106000,
  package_50_price_cents = 250000
WHERE subject IN ('Guitar', 'Drums', 'Singing / Voice', 'Guzheng', 'Zither', 'Cello')
  AND duration_minutes = 45
  AND COALESCE(lesson_type, '') IN ('private', '')
  AND is_active = true;

UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'private'),
  single_price_cents = 6500,
  package_20_price_cents = 130000,
  package_50_price_cents = 310000
WHERE subject IN ('Guitar', 'Drums', 'Singing / Voice', 'Guzheng', 'Zither', 'Cello')
  AND duration_minutes = 60
  AND COALESCE(lesson_type, '') IN ('private', '')
  AND is_active = true;

-- Ensemble / smart piano group 60
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  single_price_cents = 5000,
  package_20_price_cents = 100000,
  package_50_price_cents = 235000
WHERE subject IN ('Smart Piano', 'Acoustic Piano', 'Violin Group')
  AND duration_minutes = 60
  AND COALESCE(lesson_type, '') IN ('group', '')
  AND is_active = true;

UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  single_price_cents = 5300,
  package_20_price_cents = 106000,
  package_50_price_cents = 250000
WHERE subject IN ('Guitar Group', 'Drums Group', 'Vocal Group')
  AND duration_minutes = 60
  AND COALESCE(lesson_type, '') IN ('group', '')
  AND is_active = true;

-- Piano / Violin 1V1 catalog rates = Levels 0–2 (grade tier lives on enrollment)
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'private'),
  single_price_cents = 5000,
  package_20_price_cents = 100000,
  package_50_price_cents = 235000
WHERE subject IN ('Piano', 'Violin')
  AND duration_minutes = 45
  AND COALESCE(lesson_type, '') IN ('private', '')
  AND is_active = true;

UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'private'),
  single_price_cents = 6500,
  package_20_price_cents = 130000,
  package_50_price_cents = 310000
WHERE subject IN ('Piano', 'Violin')
  AND duration_minutes = 60
  AND COALESCE(lesson_type, '') IN ('private', '')
  AND is_active = true;

-- Rename leftover Special Education catalog rows → 1-to-1 Art (same sheet rates)
UPDATE public.classes
SET
  subject = '1-to-1 Art',
  lesson_type = 'private',
  duration_minutes = 60,
  single_price_cents = 7000,
  package_20_price_cents = 140000,
  package_50_price_cents = 335000
WHERE subject = 'Special Education'
  AND COALESCE(lesson_type, '') <> 'trial';

-- Ensure 1-to-1 Art catalog row exists (idempotent)
INSERT INTO public.classes (
  subject,
  teacher_id,
  location_id,
  duration_minutes,
  lesson_type,
  class_track,
  is_active,
  single_price_cents,
  package_20_price_cents,
  package_50_price_cents
)
SELECT
  '1-to-1 Art',
  (SELECT teacher_id FROM public.classes WHERE teacher_id IS NOT NULL LIMIT 1),
  COALESCE((SELECT id FROM public.locations ORDER BY id LIMIT 1), 1),
  60,
  'private',
  'other',
  true,
  7000,
  140000,
  335000
WHERE NOT EXISTS (
  SELECT 1
  FROM public.classes AS existing
  WHERE existing.subject IN ('1-to-1 Art', 'Special Education')
    AND existing.duration_minutes = 60
    AND COALESCE(existing.lesson_type, '') = 'private'
    AND COALESCE(existing.lesson_type, '') <> 'trial'
);
