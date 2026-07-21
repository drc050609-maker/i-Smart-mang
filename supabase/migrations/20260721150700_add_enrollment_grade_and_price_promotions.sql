-- Enrollment grade level (editable per student-class assignment)
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS grade_level text;

COMMENT ON COLUMN public.enrollments.grade_level IS
  'Student grade/level for this class enrollment, e.g. G5 or 0-2. Displayed as Subject (G5).';

-- Special / limited-time pack prices
CREATE TABLE IF NOT EXISTS public.class_price_promotions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  class_id bigint NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  single_price_cents integer CHECK (single_price_cents IS NULL OR single_price_cents > 0),
  package_20_price_cents integer CHECK (package_20_price_cents IS NULL OR package_20_price_cents > 0),
  package_50_price_cents integer CHECK (package_50_price_cents IS NULL OR package_50_price_cents > 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT class_price_promotions_date_range CHECK (end_date >= start_date),
  CONSTRAINT class_price_promotions_has_price CHECK (
    single_price_cents IS NOT NULL
    OR package_20_price_cents IS NOT NULL
    OR package_50_price_cents IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS class_price_promotions_class_id_idx
  ON public.class_price_promotions (class_id);

CREATE INDEX IF NOT EXISTS class_price_promotions_dates_idx
  ON public.class_price_promotions (start_date, end_date);

COMMENT ON TABLE public.class_price_promotions IS
  'Limited-time / special pack prices for a class, with inclusive start and end dates.';

ALTER TABLE public.class_price_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view class price promotions"
  ON public.class_price_promotions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS viewer
      WHERE viewer.id = auth.uid()
        AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can insert class price promotions"
  ON public.class_price_promotions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

CREATE POLICY "Active staff can update class price promotions"
  ON public.class_price_promotions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

CREATE POLICY "Active staff can delete class price promotions"
  ON public.class_price_promotions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_price_promotions TO authenticated;

-- Allow monthly-only pricing (packages null) for non-trial classes such as Band.
CREATE OR REPLACE FUNCTION public.update_class_pricing(
  p_class_id bigint,
  p_single_price_cents integer,
  p_package_20_price_cents integer DEFAULT NULL,
  p_package_50_price_cents integer DEFAULT NULL,
  p_reason text DEFAULT 'Updated class pricing'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid := public.require_active_staff();
  v_reason text := trim(COALESCE(p_reason, 'Updated class pricing'));
  v_old_single integer;
  v_old_20 integer;
  v_old_50 integer;
  v_lesson_type text;
BEGIN
  IF p_single_price_cents IS NULL OR p_single_price_cents <= 0 THEN
    RAISE EXCEPTION 'Single class price must be positive.';
  END IF;

  SELECT single_price_cents, package_20_price_cents, package_50_price_cents, lesson_type
  INTO v_old_single, v_old_20, v_old_50, v_lesson_type
  FROM classes
  WHERE id = p_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found.';
  END IF;

  IF v_lesson_type = 'trial' THEN
    IF p_package_20_price_cents IS NOT NULL OR p_package_50_price_cents IS NOT NULL THEN
      RAISE EXCEPTION 'Trial classes only support a single price.';
    END IF;
  ELSE
    IF (p_package_20_price_cents IS NULL) <> (p_package_50_price_cents IS NULL) THEN
      RAISE EXCEPTION 'Provide both package prices, or neither for monthly-only pricing.';
    END IF;
    IF p_package_20_price_cents IS NOT NULL AND p_package_20_price_cents <= 0 THEN
      RAISE EXCEPTION 'Package prices must be positive when set.';
    END IF;
    IF p_package_50_price_cents IS NOT NULL AND p_package_50_price_cents <= 0 THEN
      RAISE EXCEPTION 'Package prices must be positive when set.';
    END IF;
  END IF;

  UPDATE classes
  SET
    single_price_cents = p_single_price_cents,
    package_20_price_cents = CASE WHEN v_lesson_type = 'trial' THEN NULL ELSE p_package_20_price_cents END,
    package_50_price_cents = CASE WHEN v_lesson_type = 'trial' THEN NULL ELSE p_package_50_price_cents END
  WHERE id = p_class_id;

  IF v_old_single IS DISTINCT FROM p_single_price_cents THEN
    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'class_pricing', p_class_id, 'single_price_cents',
      COALESCE(v_old_single, 0),
      p_single_price_cents - COALESCE(v_old_single, 0),
      p_single_price_cents,
      v_reason, v_staff_id
    );
  END IF;

  IF v_lesson_type <> 'trial' AND v_old_20 IS DISTINCT FROM p_package_20_price_cents THEN
    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'class_pricing', p_class_id, 'package_20_price_cents',
      COALESCE(v_old_20, 0),
      COALESCE(p_package_20_price_cents, 0) - COALESCE(v_old_20, 0),
      COALESCE(p_package_20_price_cents, 0),
      v_reason, v_staff_id
    );
  END IF;

  IF v_lesson_type <> 'trial' AND v_old_50 IS DISTINCT FROM p_package_50_price_cents THEN
    INSERT INTO financial_adjustments (
      source_kind, source_id, field_name,
      original_amount_cents, adjustment_cents, corrected_amount_cents,
      reason, created_by
    )
    VALUES (
      'class_pricing', p_class_id, 'package_50_price_cents',
      COALESCE(v_old_50, 0),
      COALESCE(p_package_50_price_cents, 0) - COALESCE(v_old_50, 0),
      COALESCE(p_package_50_price_cents, 0),
      v_reason, v_staff_id
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_class_pricing(bigint, integer, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_class_pricing(bigint, integer, integer, integer, text) TO authenticated;

-- Align matching on-sheet classes to the price sheet (leave trials and unmatched alone).
-- Piano 45 1v1 uses Levels 0-2 catalog rates; grade on enrollment is separate.
UPDATE public.classes
SET
  single_price_cents = 5000,
  package_20_price_cents = 100000,
  package_50_price_cents = 235000
WHERE id = 25
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial';

UPDATE public.classes
SET
  single_price_cents = 6500,
  package_20_price_cents = 130000,
  package_50_price_cents = 310000
WHERE id = 26
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial';

UPDATE public.classes
SET
  single_price_cents = 5300,
  package_20_price_cents = 106000,
  package_50_price_cents = 250000
WHERE id = 21
  AND is_active = true
  AND COALESCE(lesson_type, '') <> 'trial';
