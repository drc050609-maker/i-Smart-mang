ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS needs_future_contact boolean NOT NULL DEFAULT true;

UPDATE public.leads
SET needs_future_contact = CASE
  WHEN status IN ('enrolled', 'closed') THEN false
  ELSE true
END;
