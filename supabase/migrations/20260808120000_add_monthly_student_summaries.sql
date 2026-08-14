-- Monthly student lesson summaries (云乐艺校学生月度上课总结表) for the teacher app.

CREATE TABLE IF NOT EXISTS public.monthly_student_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id bigint NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff_accounts (id) ON DELETE SET NULL,
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  student_name text NOT NULL DEFAULT '',
  instrument text NOT NULL DEFAULT '',
  teacher_name text NOT NULL DEFAULT '',
  class_count text NOT NULL DEFAULT '',
  tech_scale boolean NOT NULL DEFAULT false,
  tech_rhythm boolean NOT NULL DEFAULT false,
  tech_fingers boolean NOT NULL DEFAULT false,
  tech_other text NOT NULL DEFAULT '',
  repertoire text NOT NULL DEFAULT '',
  repertoire_notes text NOT NULL DEFAULT '',
  theory_basics boolean NOT NULL DEFAULT false,
  theory_beat boolean NOT NULL DEFAULT false,
  theory_chord boolean NOT NULL DEFAULT false,
  theory_other text NOT NULL DEFAULT '',
  focus text NOT NULL DEFAULT '',
  homework text NOT NULL DEFAULT '',
  technique_mastery text NOT NULL DEFAULT '',
  musical_expression text NOT NULL DEFAULT '',
  problem_technique text NOT NULL DEFAULT '',
  problem_practice_habits text NOT NULL DEFAULT '',
  problem_understanding text NOT NULL DEFAULT '',
  suggestions text NOT NULL DEFAULT '',
  next_tech_goals text NOT NULL DEFAULT '',
  next_repertoire text NOT NULL DEFAULT '',
  next_exam_performance text NOT NULL DEFAULT '',
  daily_practice_time text NOT NULL DEFAULT '',
  practice_focus text NOT NULL DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monthly_student_summaries_unique
    UNIQUE (teacher_id, student_id, year, month)
);

CREATE INDEX IF NOT EXISTS monthly_student_summaries_teacher_period_idx
  ON public.monthly_student_summaries (teacher_id, year DESC, month DESC);

CREATE INDEX IF NOT EXISTS monthly_student_summaries_student_idx
  ON public.monthly_student_summaries (student_id);

COMMENT ON TABLE public.monthly_student_summaries IS
  'Teacher monthly class summaries for each student (app + website).';

ALTER TABLE public.monthly_student_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view monthly student summaries"
  ON public.monthly_student_summaries;
DROP POLICY IF EXISTS "Staff can insert monthly student summaries"
  ON public.monthly_student_summaries;
DROP POLICY IF EXISTS "Staff can update monthly student summaries"
  ON public.monthly_student_summaries;
DROP POLICY IF EXISTS "Staff can delete monthly student summaries"
  ON public.monthly_student_summaries;

CREATE POLICY "Staff can view monthly student summaries"
  ON public.monthly_student_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid()
        AND viewer.is_active = true
        AND (
          viewer.role = 'admin'
          OR viewer.teacher_id = monthly_student_summaries.teacher_id
          OR viewer.teacher_id IS NULL
        )
    )
  );

CREATE POLICY "Staff can insert monthly student summaries"
  ON public.monthly_student_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS actor
      WHERE actor.id = auth.uid()
        AND actor.is_active = true
        AND (
          actor.role = 'admin'
          OR actor.teacher_id = monthly_student_summaries.teacher_id
        )
    )
  );

CREATE POLICY "Staff can update monthly student summaries"
  ON public.monthly_student_summaries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS actor
      WHERE actor.id = auth.uid()
        AND actor.is_active = true
        AND (
          actor.role = 'admin'
          OR actor.teacher_id = monthly_student_summaries.teacher_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS actor
      WHERE actor.id = auth.uid()
        AND actor.is_active = true
        AND (
          actor.role = 'admin'
          OR actor.teacher_id = monthly_student_summaries.teacher_id
        )
    )
  );

CREATE POLICY "Staff can delete monthly student summaries"
  ON public.monthly_student_summaries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS actor
      WHERE actor.id = auth.uid()
        AND actor.is_active = true
        AND (
          actor.role = 'admin'
          OR actor.teacher_id = monthly_student_summaries.teacher_id
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_student_summaries TO authenticated;
