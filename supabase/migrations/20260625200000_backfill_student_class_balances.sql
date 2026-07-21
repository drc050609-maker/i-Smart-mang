-- Give every actively enrolled student 10 prepaid sessions per class.

WITH enrollment_pairs AS (
  SELECT DISTINCT
    e."student id" AS student_id,
    e."class id" AS class_id
  FROM enrollments e
  INNER JOIN students s ON s.id = e."student id" AND s.is_active = true
  INNER JOIN classes c ON c.id = e."class id" AND c.is_active = true
  WHERE e."student id" IS NOT NULL
    AND COALESCE(e.is_active, true) = true
)
INSERT INTO student_class_balances (
  student_id,
  class_id,
  sessions_total,
  sessions_remaining,
  sessions_used,
  absence_count
)
SELECT
  student_id,
  class_id,
  10,
  10,
  0,
  0
FROM enrollment_pairs
ON CONFLICT (student_id, class_id) DO UPDATE SET
  sessions_total = 10,
  sessions_remaining = 10,
  sessions_used = 0,
  absence_count = 0,
  updated_at = now();
