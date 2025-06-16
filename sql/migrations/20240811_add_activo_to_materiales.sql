-- Adds activo column to materiales for soft delete
ALTER TABLE public.materiales
  ADD COLUMN activo boolean DEFAULT true;

UPDATE public.materiales SET activo = true WHERE activo IS NULL;
