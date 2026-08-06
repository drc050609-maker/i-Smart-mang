-- Reset Brooklyn student credit totals/used and clear classes-taken history

-- 1) Clear attendance history first (references attendance / session records)
DELETE FROM public.student_class_history h
USING public.students s
JOIN public.locations l ON l.id = s.location_id
WHERE h.student_id = s.id
  AND l.slug = 'brooklyn';

-- 2) Clear session records (used for auto catch-up / used credit increments)
DELETE FROM public.class_session_records r
USING public.students s
JOIN public.locations l ON l.id = s.location_id
WHERE r.student_id = s.id
  AND l.slug = 'brooklyn';

-- 3) Clear attendance (fallback source for "classes taken")
DELETE FROM public.class_attendance a
USING public.students s
JOIN public.locations l ON l.id = s.location_id
WHERE a.student_id = s.id
  AND l.slug = 'brooklyn';

-- 4) Zero all balance counters
UPDATE public.student_class_balances b
SET
  sessions_total = 0,
  sessions_remaining = 0,
  sessions_used = 0,
  absence_count = 0,
  updated_at = now()
FROM public.students s
JOIN public.locations l ON l.id = s.location_id
WHERE b.student_id = s.id
  AND l.slug = 'brooklyn'
  AND (
    b.sessions_total <> 0
    OR b.sessions_remaining <> 0
    OR b.sessions_used <> 0
    OR b.absence_count <> 0
  );

-- Keep starting credits at 0 for Brooklyn
UPDATE public.students s
SET starting_class_credits = 0
FROM public.locations l
WHERE s.location_id = l.id
  AND l.slug = 'brooklyn'
  AND s.starting_class_credits <> 0;
