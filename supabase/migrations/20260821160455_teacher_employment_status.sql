-- Three-way employment status for teachers. is_active stays in sync:
-- true only when status is 'active'. On-leave teachers remain on the
-- teachers roster but are hidden from class-assignment pickers that
-- filter is_active = true (same as inactive).

CREATE TYPE public.teacher_status AS ENUM ('active', 'on_leave', 'inactive');

ALTER TABLE public.teachers
  ADD COLUMN status public.teacher_status NOT NULL DEFAULT 'active';

UPDATE public.teachers
SET status = 'inactive'
WHERE is_active = false;

COMMENT ON COLUMN public.teachers.status IS
  'Employment status: active (available), on_leave (rostered but not assignable), or inactive.';

COMMENT ON COLUMN public.teachers.is_active IS
  'True only when status is active. Used to hide on-leave and inactive tutors from class assignment pickers.';

CREATE OR REPLACE FUNCTION public.sync_teacher_status_and_is_active()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' AND NEW.is_active = false THEN
      NEW.status := 'inactive';
    ELSE
      NEW.is_active := (NEW.status = 'active');
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.is_active := (NEW.status = 'active');
  ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    IF NEW.is_active THEN
      NEW.status := 'active';
    ELSIF OLD.status = 'active' THEN
      NEW.status := 'inactive';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER teachers_sync_status_and_is_active
  BEFORE INSERT OR UPDATE OF status, is_active ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_teacher_status_and_is_active();

GRANT USAGE ON TYPE public.teacher_status TO authenticated, service_role;
