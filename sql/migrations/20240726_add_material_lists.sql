-- Adds table for material lists and reference from materiales
CREATE TABLE public.material_lists (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  proyecto_id uuid REFERENCES public.proyectos(id),
  titulo text NOT NULL,
  fecha date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT material_lists_pkey PRIMARY KEY (id)
);

ALTER TABLE public.materiales
  ADD COLUMN lista_id uuid REFERENCES public.material_lists(id);
