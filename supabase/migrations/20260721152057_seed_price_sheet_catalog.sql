-- Seed / align class catalog prices to the official iSmart price sheet.
-- Grade tiers for Piano/Violin 1V1 stay on enrollments.grade_level; catalog uses Levels 0-2 rates.
-- Does NOT deactivate unmatched off-sheet classes (awaiting staff decision).

-- Existing clear matches -------------------------------------------------------

-- Piano 45 1V1 → Levels 0-2
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'private'),
  duration_minutes = 45,
  single_price_cents = 5000,
  package_20_price_cents = 100000,
  package_50_price_cents = 235000
WHERE subject = 'Piano'
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial'
  AND duration_minutes = 45;

-- Piano private with missing duration → Piano 60 1V1 Levels 0-2
UPDATE public.classes
SET
  lesson_type = 'private',
  duration_minutes = 60,
  single_price_cents = 6500,
  package_20_price_cents = 130000,
  package_50_price_cents = 310000
WHERE subject = 'Piano'
  AND is_active = true
  AND COALESCE(lesson_type, '') = 'private'
  AND duration_minutes IS NULL;

-- Guitar 60 1V1
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'private'),
  single_price_cents = 6500,
  package_20_price_cents = 130000,
  package_50_price_cents = 310000
WHERE subject = 'Guitar'
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial'
  AND duration_minutes = 60;

-- Singing / Voice 45 1V1
UPDATE public.classes
SET
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'private'),
  single_price_cents = 5300,
  package_20_price_cents = 106000,
  package_50_price_cents = 250000
WHERE subject = 'Singing / Voice'
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial'
  AND duration_minutes = 45;

-- Hip Hop → Jazz & Chinese dance sheet rates (90 min)
UPDATE public.classes
SET
  duration_minutes = 90,
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  class_track = 'dance',
  single_price_cents = 3800,
  package_20_price_cents = 76000,
  package_50_price_cents = 175000
WHERE subject = 'Dance — Hip Hop'
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial';

-- Music Theory → specialty group sheet (60 min)
UPDATE public.classes
SET
  duration_minutes = 60,
  lesson_type = COALESCE(NULLIF(lesson_type, ''), 'group'),
  class_track = 'music_education',
  single_price_cents = 4500,
  package_20_price_cents = 90000,
  package_50_price_cents = 210000
WHERE subject = 'Music Theory'
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial';

-- Insert missing on-sheet catalog rows (idempotent by subject+duration+lesson_type)
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
  COALESCE(
    (SELECT id FROM public.locations ORDER BY id LIMIT 1),
    1
  ),
  v.duration_minutes,
  v.lesson_type,
  v.class_track,
  true,
  v.single_price_cents,
  v.package_20_price_cents,
  v.package_50_price_cents
FROM (
  VALUES
    -- Piano / Violin 1V1 (Levels 0-2 catalog rates)
    ('Piano', 60, 'private', 'instrumental', 6500, 130000, 310000),
    ('Violin', 45, 'private', 'instrumental', 5000, 100000, 235000),
    ('Violin', 60, 'private', 'instrumental', 6500, 130000, 310000),
    -- Smart / acoustic / violin group 60
    ('Smart Piano', 60, 'group', 'instrumental', 5000, 100000, 235000),
    ('Acoustic Piano', 60, 'group', 'instrumental', 5000, 100000, 235000),
    ('Violin Group', 60, 'group', 'instrumental', 5000, 100000, 235000),
    -- Guitar/Drum/Vocal/Zither/Cello 1V1
    ('Guitar', 45, 'private', 'instrumental', 5300, 106000, 250000),
    ('Drums', 45, 'private', 'instrumental', 5300, 106000, 250000),
    ('Drums', 60, 'private', 'instrumental', 6500, 130000, 310000),
    ('Singing / Voice', 60, 'private', 'vocal', 6500, 130000, 310000),
    ('Zither', 45, 'private', 'instrumental', 5300, 106000, 250000),
    ('Zither', 60, 'private', 'instrumental', 6500, 130000, 310000),
    ('Cello', 45, 'private', 'instrumental', 5300, 106000, 250000),
    ('Cello', 60, 'private', 'instrumental', 6500, 130000, 310000),
    -- Other-instrument group 60
    ('Guitar Group', 60, 'group', 'instrumental', 5300, 106000, 250000),
    ('Drums Group', 60, 'group', 'instrumental', 5300, 106000, 250000),
    ('Vocal Group', 60, 'group', 'vocal', 5300, 106000, 250000),
    -- Specialty group 60
    ('Sing & Play', 60, 'group', 'music_education', 4500, 90000, 210000),
    ('Model / Catwalk', 60, 'group', 'other', 4500, 90000, 210000),
    -- Art (+ material fee shown in UI)
    ('Art', 60, 'group', 'other', 3300, 66000, 150000),
    ('Art', 90, 'group', 'other', 4300, 86000, 200000),
    -- Jazz & Chinese dance 90
    ('Jazz Dance', 90, 'group', 'dance', 3800, 76000, 175000),
    ('Chinese Dance', 90, 'group', 'dance', 3800, 76000, 175000),
    -- Band monthly-only ($40 / month)
    ('Band', 90, 'group', 'music_education', 4000, NULL, NULL),
    -- 1-to-1 special education 60
    ('Special Education', 60, 'private', 'other', 7000, 140000, 335000)
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
