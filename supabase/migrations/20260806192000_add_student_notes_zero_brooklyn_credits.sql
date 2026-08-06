-- Free-form admin notes for students (shown as ★ on schedule when set)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.students.notes IS
  'Free-form staff notes about the student; shown on the schedule when present.';

-- Zero remaining class credits for Brooklyn campus students
UPDATE public.student_class_balances AS b
SET
  sessions_remaining = 0,
  updated_at = now()
FROM public.students AS s
JOIN public.locations AS l ON l.id = s.location_id
WHERE b.student_id = s.id
  AND l.slug = 'brooklyn'
  AND b.sessions_remaining <> 0;

-- New enrollments for Brooklyn students should not auto-grant credits
UPDATE public.students AS s
SET starting_class_credits = 0
FROM public.locations AS l
WHERE s.location_id = l.id
  AND l.slug = 'brooklyn'
  AND s.starting_class_credits <> 0;
