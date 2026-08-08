-- Align catalog / class prices to the latest official unit price list.

-- Other-instrument 1V1 60: 20@$1360 / 50@$3250
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'private'),
  single_price_cents = 6800,
  package_20_price_cents = 136000,
  package_50_price_cents = 325000
WHERE subject IN ('Guitar', 'Drums', 'Singing / Voice', 'Guzheng', 'Zither', 'Cello')
  AND duration_minutes = 60
  AND COALESCE(lesson_type, '') IN ('private', '')
  AND is_active = true;

-- Other-instrument 1V1 45 (re-affirm)
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

-- Band group lessons: 60 min packs 20@$960 / 50@$2250 (replaces monthly-only)
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  duration_minutes = 60,
  single_price_cents = 4800,
  package_20_price_cents = 96000,
  package_50_price_cents = 225000
WHERE subject = 'Band'
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial';

-- Choir / Orchestra / Music Theory — 60 min
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  duration_minutes = 60,
  single_price_cents = 4500,
  package_20_price_cents = 90000,
  package_50_price_cents = 210000
WHERE subject IN ('Choir', 'Orchestra', 'Music Theory')
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial';

-- Sing & Play / Model group — 60 min (re-affirm; Music Theory moved to choir section)
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  duration_minutes = 60,
  single_price_cents = 4500,
  package_20_price_cents = 90000,
  package_50_price_cents = 210000
WHERE subject IN ('Sing & Play', 'Model / Catwalk')
  AND duration_minutes = 60
  AND COALESCE(lesson_type, '') IN ('group', '')
  AND is_active = true;

-- Dance 60 min: 20@$580 / 50@$1300
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  class_track = COALESCE(NULLIF(class_track, ''), 'dance'),
  single_price_cents = 2900,
  package_20_price_cents = 58000,
  package_50_price_cents = 130000
WHERE subject IN ('Jazz Dance', 'Jazz', 'Chinese Dance', 'Dance — Hip Hop')
  AND duration_minutes = 60
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial';

-- Dance 90 min: 20@$650 / 50@$1500 (+$50 bag is display-only)
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  class_track = COALESCE(NULLIF(class_track, ''), 'dance'),
  single_price_cents = 3250,
  package_20_price_cents = 65000,
  package_50_price_cents = 150000
WHERE subject IN ('Jazz Dance', 'Jazz', 'Chinese Dance', 'Dance — Hip Hop')
  AND duration_minutes = 90
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial';

-- Art group 60 / 90 (re-affirm)
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

-- 1-to-1 Art 60 (re-affirm)
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'private'),
  single_price_cents = 7000,
  package_20_price_cents = 140000,
  package_50_price_cents = 335000
WHERE subject IN ('1-to-1 Art', 'Special Education')
  AND duration_minutes = 60
  AND COALESCE(lesson_type, '') IN ('private', '')
  AND is_active = true;

-- 1-to-1 Art 90
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'private'),
  single_price_cents = 8500,
  package_20_price_cents = 170000,
  package_50_price_cents = 410000
WHERE subject IN ('1-to-1 Art', 'Special Education')
  AND duration_minutes = 90
  AND COALESCE(lesson_type, '') IN ('private', '')
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

-- Ensure missing on-sheet catalog rows exist (idempotent)
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
  v.subject,
  (SELECT teacher_id FROM public.classes WHERE teacher_id IS NOT NULL LIMIT 1),
  COALESCE((SELECT id FROM public.locations ORDER BY id LIMIT 1), 1),
  v.duration_minutes,
  v.lesson_type,
  v.class_track,
  true,
  v.single_price_cents,
  v.package_20_price_cents,
  v.package_50_price_cents
FROM (
  VALUES
    ('Orchestra', 60, 'group', 'music_education', 4500, 90000, 210000),
    ('Talent Exam Prep', 60, 'group', 'other', 10000, 200000, NULL::integer),
    ('1-to-1 Art', 90, 'private', 'other', 8500, 170000, 410000),
    ('Band', 60, 'group', 'music_education', 4800, 96000, 225000)
) AS v(
  subject,
  duration_minutes,
  lesson_type,
  class_track,
  single_price_cents,
  package_20_price_cents,
  package_50_price_cents
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.classes AS existing
  WHERE existing.subject = v.subject
    AND existing.duration_minutes = v.duration_minutes
    AND COALESCE(existing.lesson_type, '') = v.lesson_type
    AND COALESCE(existing.lesson_type, '') <> 'trial'
);
