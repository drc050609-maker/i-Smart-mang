-- Photo receipts for students (private storage).

CREATE TABLE public.student_receipts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  note text,
  uploaded_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX student_receipts_student_id_created_at_idx
  ON public.student_receipts (student_id, created_at DESC);

COMMENT ON TABLE public.student_receipts IS
  'Uploaded receipt photos for a student.';
COMMENT ON COLUMN public.student_receipts.storage_path IS
  'Storage object path in the student-receipts bucket.';

ALTER TABLE public.student_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view student receipts"
  ON public.student_receipts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can insert student receipts"
  ON public.student_receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

CREATE POLICY "Active staff can delete student receipts"
  ON public.student_receipts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid() AND viewer.is_active = true
    )
  );

GRANT SELECT, INSERT, DELETE ON public.student_receipts TO authenticated;
GRANT ALL ON public.student_receipts TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-receipts',
  'student-receipts',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Active staff can read student receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-receipts'
    AND EXISTS (
      SELECT 1
      FROM public.staff_accounts AS viewer
      WHERE viewer.id = auth.uid()
        AND viewer.is_active = true
    )
  );
