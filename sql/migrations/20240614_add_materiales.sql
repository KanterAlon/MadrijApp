-- Adds materiales and items_llevar tables
CREATE TABLE public.materiales (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  proyecto_id uuid REFERENCES public.proyectos(id),
  nombre text NOT NULL,
  descripcion text DEFAULT '',
  asignado text,
  compra boolean DEFAULT false,
  sede boolean DEFAULT false,
  san_miguel boolean DEFAULT false,
  armar_en_san_miguel boolean DEFAULT false,
  compra_items text[] DEFAULT ARRAY[]::text[],
  sede_items text[] DEFAULT ARRAY[]::text[],
  san_miguel_items text[] DEFAULT ARRAY[]::text[],
  estado text NOT NULL DEFAULT 'por hacer',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT materiales_pkey PRIMARY KEY (id)
);

CREATE TABLE public.items_llevar (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  proyecto_id uuid REFERENCES public.proyectos(id),
  nombre text NOT NULL,
  en_san_miguel boolean DEFAULT true,
  desde_sede boolean DEFAULT false,
  encargado text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT items_llevar_pkey PRIMARY KEY (id)
);
