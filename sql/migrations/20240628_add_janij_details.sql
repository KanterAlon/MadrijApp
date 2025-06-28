-- Add extra details to janijim
ALTER TABLE public.janijim
  ADD COLUMN apellido text,
  ADD COLUMN dni text,
  ADD COLUMN numero_socio text,
  ADD COLUMN grupo text,
  ADD COLUMN tel_madre text,
  ADD COLUMN tel_padre text,
  ADD COLUMN extras jsonb DEFAULT '{}'::jsonb;
