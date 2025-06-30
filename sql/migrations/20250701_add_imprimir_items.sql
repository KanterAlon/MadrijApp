-- Add imprimir_items column to materiales
ALTER TABLE public.materiales
  ADD COLUMN imprimir_items jsonb DEFAULT '[]'::jsonb;
