-- Multiple teachers per class; classes.teacher_id remains the primary teacher.

CREATE TABLE public.class_teachers (
  class_id bigint NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  teacher_id bigint NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, teacher_id)
);

CREATE UNIQUE INDEX class_teachers_one_primary_per_class_idx
  ON public.class_teachers (class_id)
  WHERE is_primary;

CREATE INDEX class_teachers_teacher_id_idx
  ON public.class_teachers (teacher_id);

COMMENT ON TABLE public.class_teachers IS
  'Teachers assigned to a class. classes.teacher_id mirrors the primary teacher for backward compatibility.';

-- Backfill existing assignments
INSERT INTO public.class_teachers (class_id, teacher_id, is_primary)
SELECT id, teacher_id, true
FROM public.classes
WHERE teacher_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view class teachers"
  ON public.class_teachers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid()
        AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can insert class teachers"
  ON public.class_teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

CREATE POLICY "Active staff can update class teachers"
  ON public.class_teachers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid()
        AND viewer.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

CREATE POLICY "Active staff can delete class teachers"
  ON public.class_teachers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid()
        AND viewer.is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_teachers TO authenticated;
