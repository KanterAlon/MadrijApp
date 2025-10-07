-- Add spreadsheet configuration columns for Google Sheets sync
ALTER TABLE public.grupos
  ADD COLUMN IF NOT EXISTS spreadsheet_id text,
  ADD COLUMN IF NOT EXISTS janij_sheet text,
  ADD COLUMN IF NOT EXISTS madrij_sheet text;

-- Ensure supporting metadata columns exist for madrijim_grupos sync
ALTER TABLE public.madrijim_grupos
  ADD COLUMN IF NOT EXISTS nombre text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS rol text,
  ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;
