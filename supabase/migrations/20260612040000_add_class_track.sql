ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS class_track text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.classes'::regclass
      AND conname = 'classes_class_track_check'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT classes_class_track_check
      CHECK (
        class_track IS NULL OR class_track IN (
          'instrumental',
          'vocal',
          'composition',
          'dance',
          'music_education',
          'other'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.classes.class_track IS 'Program track: instrumental, vocal, composition, dance, music_education, or other.';
