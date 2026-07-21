-- Public trial class booking: creates student, 1:1 trial class, schedule, payment, and teacher pay rate.
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
  p_parent_email text DEFAULT NULL
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
  v_duration_minutes integer := 45;
  v_price_cents integer := 2500;
  v_teacher_pay_cents integer := 1500;
  v_class_track text;
  v_teacher_active boolean;
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

  SELECT t.is_active
  INTO v_teacher_active
  FROM teachers AS t
  WHERE t.id = p_teacher_id;

  IF v_teacher_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Selected teacher is not available';
  END IF;

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
    starting_class_credits,
    is_active
  )
  VALUES (
    trim(p_first_name),
    nullif(trim(coalesce(p_last_name, '')), ''),
    p_dob,
    nullif(trim(coalesce(p_experience, '')), ''),
    0,
    true
  )
  RETURNING id INTO v_student_id;

  INSERT INTO classes (
    subject,
    teacher_id,
    duration_minutes,
    lesson_type,
    class_track,
    is_active
  )
  VALUES (
    trim(p_subject),
    p_teacher_id,
    v_duration_minutes,
    'trial',
    v_class_track,
    true
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
      WHEN p_parent_phone IS NOT NULL OR p_parent_email IS NOT NULL THEN
        trim(
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
    rate_cents,
    updated_by
  )
  VALUES (
    p_teacher_id,
    v_class_id,
    v_teacher_pay_cents,
    NULL
  )
  ON CONFLICT (teacher_id, class_id)
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
  text
) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.book_trial_class IS
  'Books a $25 / 45-minute 1:1 trial class: student, class, schedule, payment, and teacher pay rate.';
