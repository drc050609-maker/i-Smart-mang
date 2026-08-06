-- Hour-log RLS for front_desk role (requires prior enum commit).

DROP POLICY IF EXISTS "Active staff can view front desk hour logs" ON public.front_desk_hour_logs;
DROP POLICY IF EXISTS "Active staff can insert front desk hour logs" ON public.front_desk_hour_logs;
DROP POLICY IF EXISTS "Active staff can update front desk hour logs" ON public.front_desk_hour_logs;
DROP POLICY IF EXISTS "Active staff can delete front desk hour logs" ON public.front_desk_hour_logs;
DROP POLICY IF EXISTS "Staff can view front desk hour logs" ON public.front_desk_hour_logs;
DROP POLICY IF EXISTS "Staff can insert front desk hour logs" ON public.front_desk_hour_logs;
DROP POLICY IF EXISTS "Staff can update front desk hour logs" ON public.front_desk_hour_logs;
DROP POLICY IF EXISTS "Staff can delete front desk hour logs" ON public.front_desk_hour_logs;

CREATE POLICY "Staff can view front desk hour logs"
  ON public.front_desk_hour_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_accounts s
      WHERE s.id = auth.uid()
        AND s.is_active
        AND (
          s.role IN ('admin', 'manager')
          OR (s.role = 'front_desk' AND s.teacher_id = front_desk_hour_logs.teacher_id)
        )
    )
  );

CREATE POLICY "Staff can insert front desk hour logs"
  ON public.front_desk_hour_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_accounts s
      WHERE s.id = auth.uid()
        AND s.is_active
        AND (
          s.role IN ('admin', 'manager')
          OR (s.role = 'front_desk' AND s.teacher_id = front_desk_hour_logs.teacher_id)
        )
    )
  );

CREATE POLICY "Staff can update front desk hour logs"
  ON public.front_desk_hour_logs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_accounts s
      WHERE s.id = auth.uid()
        AND s.is_active
        AND (
          s.role IN ('admin', 'manager')
          OR (s.role = 'front_desk' AND s.teacher_id = front_desk_hour_logs.teacher_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_accounts s
      WHERE s.id = auth.uid()
        AND s.is_active
        AND (
          s.role IN ('admin', 'manager')
          OR (s.role = 'front_desk' AND s.teacher_id = front_desk_hour_logs.teacher_id)
        )
    )
  );

CREATE POLICY "Staff can delete front desk hour logs"
  ON public.front_desk_hour_logs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_accounts s
      WHERE s.id = auth.uid()
        AND s.is_active
        AND (
          s.role IN ('admin', 'manager')
          OR (s.role = 'front_desk' AND s.teacher_id = front_desk_hour_logs.teacher_id)
        )
    )
  );
