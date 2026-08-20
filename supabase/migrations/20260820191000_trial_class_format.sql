-- Persist whether a trial booking is 1-to-1 (private) or group.
-- lesson_type stays 'trial' so leads/schedule/catalog trial behavior is unchanged.

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS trial_format text;

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_trial_format_check;
ALTER TABLE public.classes
  ADD CONSTRAINT classes_trial_format_check
  CHECK (trial_format IS NULL OR trial_format IN ('private', 'group'));

COMMENT ON COLUMN public.classes.trial_format IS
  'For trial classes: private (1-to-1) vs group. Null for non-trial classes and older trials.';

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'book_trial_class'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.book_trial_class(
  p_first_name text,
  p_last_name text DEFAULT NULL,
  p_dob date DEFAULT NULL,
  p_experience text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_teacher_id bigint DEFAULT NULL,
  p_schedule_date date DEFAULT NULL,
  p_schedule_start_time time DEFAULT NULL,
  p_parent_phone text DEFAULT NULL,
  p_parent_email text DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_parent_name text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_trial_time_preference text DEFAULT NULL,
  p_duration_minutes integer DEFAULT 45,
  p_trial_format text DEFAULT NULL
)
RETURNS TABLE (
  student_id bigint,
  class_id bigint,
  schedule_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
#variable_conflict use_column
DECLARE
  v_student_id bigint;
  v_class_id bigint;
  v_schedule_id bigint;
  v_schedule_end_time time;
  v_duration_minutes integer := coalesce(p_duration_minutes, 45);
  v_price_cents integer := 2500;
  v_teacher_pay_cents integer := 1500;
  v_class_track text;
  v_trial_format text;
  v_teacher_active boolean;
  v_location_id bigint;
  v_gender text;
  v_time_pref text;
BEGIN
  IF p_first_name IS NULL OR char_length(trim(p_first_name)) = 0 THEN
    RAISE EXCEPTION 'First name is required';
  END IF;

  IF p_subject IS NULL OR char_length(trim(p_subject)) = 0 THEN
    RAISE EXCEPTION 'Subject is required';
  END IF;

  IF p_teacher_id IS NULL OR p_teacher_id <= 0 THEN
    RAISE EXCEPTION 'Teacher is required';
  END IF;

  IF p_schedule_date IS NULL THEN
    RAISE EXCEPTION 'Schedule date is required';
  END IF;

  IF p_schedule_start_time IS NULL THEN
    RAISE EXCEPTION 'Start time is required';
  END IF;

  IF v_duration_minutes < 15 OR v_duration_minutes > 180 THEN
    RAISE EXCEPTION 'Duration must be between 15 and 180 minutes';
  END IF;

  v_trial_format := nullif(lower(trim(coalesce(p_trial_format, ''))), '');
  IF v_trial_format IS NULL OR v_trial_format NOT IN ('private', 'group') THEN
    RAISE EXCEPTION 'Select 1-to-1 or group class';
  END IF;

  v_gender := nullif(lower(trim(coalesce(p_gender, ''))), '');
  IF v_gender IS NOT NULL AND v_gender NOT IN ('male', 'female') THEN
    RAISE EXCEPTION 'Gender must be male or female';
  END IF;

  v_time_pref := nullif(lower(trim(coalesce(p_trial_time_preference, ''))), '');
  IF v_time_pref IS NOT NULL AND v_time_pref NOT IN ('weekday', 'weekend') THEN
    RAISE EXCEPTION 'Trial time preference must be weekday or weekend';
  END IF;

  SELECT t.is_active, t.location_id
  INTO v_teacher_active, v_location_id
  FROM teachers AS t
  WHERE t.id = p_teacher_id;

  IF v_teacher_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Selected teacher is not available';
  END IF;

  IF v_location_id IS NULL THEN
    SELECT id INTO v_location_id FROM locations WHERE slug = 'brooklyn' LIMIT 1;
  END IF;

  SELECT
    coalesce(l.trial_price_cents, 2500),
    coalesce(l.trial_teacher_pay_cents, 1500)
  INTO v_price_cents, v_teacher_pay_cents
  FROM locations AS l
  WHERE l.id = v_location_id;

  v_schedule_end_time := (p_schedule_start_time + make_interval(mins => v_duration_minutes))::time;

  IF v_schedule_end_time <= p_schedule_start_time THEN
    RAISE EXCEPTION 'Trial class cannot extend past midnight';
  END IF;

  v_class_track := CASE
    WHEN lower(p_subject) LIKE '%voice%'
      OR lower(p_subject) LIKE '%singing%'
      OR lower(p_subject) LIKE '%choir%' THEN 'vocal'
    WHEN lower(p_subject) LIKE '%songwriting%'
      OR lower(p_subject) LIKE '%composition%' THEN 'composition'
    WHEN lower(p_subject) LIKE '%dance%'
      OR lower(p_subject) LIKE '%ballet%'
      OR lower(p_subject) LIKE '%tap%'
      OR lower(p_subject) LIKE '%hip hop%' THEN 'dance'
    WHEN lower(p_subject) LIKE '%theory%'
      OR lower(p_subject) LIKE '%theater%'
      OR lower(p_subject) LIKE '%theatre%'
      OR lower(p_subject) LIKE '%ensemble%' THEN 'music_education'
    WHEN lower(p_subject) LIKE '%piano%'
      OR lower(p_subject) LIKE '%violin%'
      OR lower(p_subject) LIKE '%viola%'
      OR lower(p_subject) LIKE '%cello%'
      OR lower(p_subject) LIKE '%guitar%'
      OR lower(p_subject) LIKE '%drums%'
      OR lower(p_subject) LIKE '%percussion%'
      OR lower(p_subject) LIKE '%flute%'
      OR lower(p_subject) LIKE '%saxophone%'
      OR lower(p_subject) LIKE '%trumpet%'
      OR lower(p_subject) LIKE '%clarinet%'
      OR lower(p_subject) LIKE '%ukulele%' THEN 'instrumental'
    ELSE 'other'
  END;

  INSERT INTO students (
    "first name",
    "last name",
    dob,
    experience,
    gender,
    parent_name,
    trial_time_preference,
    starting_class_credits,
    is_active,
    location_id
  )
  VALUES (
    trim(p_first_name),
    nullif(trim(coalesce(p_last_name, '')), ''),
    p_dob,
    nullif(trim(coalesce(p_experience, '')), ''),
    v_gender,
    nullif(trim(coalesce(p_parent_name, '')), ''),
    v_time_pref,
    0,
    true,
    v_location_id
  )
  RETURNING id INTO v_student_id;

  IF nullif(trim(coalesce(p_parent_phone, '')), '') IS NOT NULL THEN
    INSERT INTO student_phone_contacts (
      student_id,
      phone_number,
      owner_role,
      owner_name,
      is_primary
    )
    VALUES (
      v_student_id,
      trim(p_parent_phone),
      'guardian',
      nullif(trim(coalesce(p_parent_name, '')), ''),
      true
    );
  END IF;

  IF nullif(trim(coalesce(p_address, '')), '') IS NOT NULL THEN
    INSERT INTO addresses ("street 1", student)
    VALUES (trim(p_address), v_student_id);
  END IF;

  INSERT INTO classes (
    subject,
    teacher_id,
    duration_minutes,
    lesson_type,
    class_track,
    trial_format,
    is_active,
    location_id
  )
  VALUES (
    trim(p_subject),
    p_teacher_id,
    v_duration_minutes,
    'trial',
    v_class_track,
    v_trial_format,
    true,
    v_location_id
  )
  RETURNING id INTO v_class_id;

  INSERT INTO class_schedules (
    class_id,
    is_recurring,
    schedule_date,
    schedule_start_time,
    schedule_end_time
  )
  VALUES (
    v_class_id,
    false,
    p_schedule_date,
    p_schedule_start_time,
    v_schedule_end_time
  )
  RETURNING id INTO v_schedule_id;

  INSERT INTO enrollments (
    "class id",
    "student id",
    created_date,
    is_active,
    updated_date
  )
  VALUES (
    v_class_id,
    v_student_id,
    current_date,
    true,
    current_date
  );

  PERFORM record_class_payment(
    v_student_id,
    v_class_id,
    'single'::payment_plan,
    v_price_cents,
    1,
    NULL,
    CASE
      WHEN p_parent_phone IS NOT NULL OR p_parent_email IS NOT NULL OR p_parent_name IS NOT NULL THEN
        trim(
          coalesce('Parent: ' || nullif(trim(p_parent_name), ''), '') ||
          CASE
            WHEN p_parent_name IS NOT NULL AND (p_parent_phone IS NOT NULL OR p_parent_email IS NOT NULL) THEN ' · '
            ELSE ''
          END ||
          coalesce('Phone: ' || nullif(trim(p_parent_phone), ''), '') ||
          CASE
            WHEN p_parent_phone IS NOT NULL AND p_parent_email IS NOT NULL THEN ' · '
            ELSE ''
          END ||
          coalesce('Email: ' || nullif(trim(p_parent_email), ''), '')
        )
      ELSE 'Trial class signup'
    END
  );

  INSERT INTO teacher_class_pay_rates (
    teacher_id,
    class_id,
    grade_tier,
    rate_cents,
    updated_by
  )
  VALUES (
    p_teacher_id,
    v_class_id,
    'G0-2',
    v_teacher_pay_cents,
    NULL
  )
  ON CONFLICT (teacher_id, class_id, grade_tier)
  DO UPDATE SET
    rate_cents = EXCLUDED.rate_cents,
    updated_at = now();

  RETURN QUERY
  SELECT v_student_id, v_class_id, v_schedule_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_trial_class(
  text,
  text,
  date,
  text,
  text,
  bigint,
  date,
  time without time zone,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text
) TO anon, authenticated, service_role;
