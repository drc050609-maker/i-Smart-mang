ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS student_id bigint REFERENCES public.students(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS leads_student_id_unique
  ON public.leads (student_id)
  WHERE student_id IS NOT NULL;

-- Backfill from converted lead children when a lead has exactly one converted child.
UPDATE public.leads AS l
SET student_id = c.student_id
FROM (
  SELECT lead_id, MIN(student_id) AS student_id
  FROM public.lead_children
  WHERE student_id IS NOT NULL
  GROUP BY lead_id
  HAVING COUNT(*) = 1
) AS c
WHERE l.id = c.lead_id
  AND l.student_id IS NULL;
