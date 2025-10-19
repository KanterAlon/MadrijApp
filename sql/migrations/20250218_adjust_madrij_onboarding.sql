-- Allow onboarding flow to link madrijim after spreadsheet sync
ALTER TABLE public.madrijim
  ALTER COLUMN clerk_id DROP NOT NULL;

-- Ensure email uniqueness and normalise casing
UPDATE public.madrijim
SET email = LOWER(email)
WHERE email IS NOT NULL;

ALTER TABLE public.madrijim
  ADD CONSTRAINT madrijim_email_key UNIQUE (email);

-- Allow spreadsheet rows without a claimed madrij
ALTER TABLE public.madrijim_grupos
  ALTER COLUMN madrij_id DROP NOT NULL;

-- Keep emails in madrijim_grupos lower-cased for matching
UPDATE public.madrijim_grupos
SET email = LOWER(email)
WHERE email IS NOT NULL;
