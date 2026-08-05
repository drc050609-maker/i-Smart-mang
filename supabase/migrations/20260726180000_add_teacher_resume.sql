-- PDF resumes for teachers (private storage).

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS resume_path text,
  ADD COLUMN IF NOT EXISTS resume_file_name text;

COMMENT ON COLUMN public.teachers.resume_path IS
  'Storage object path in the teacher-resumes bucket.';
COMMENT ON COLUMN public.teachers.resume_file_name IS
  'Original PDF file name for display.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'teacher-resumes',
  'teacher-resumes',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Active staff can read teacher resumes"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'teacher-resumes'
    AND EXISTS (
      SELECT 1
      FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid()
        AND viewer.is_active = true
    )
  );
