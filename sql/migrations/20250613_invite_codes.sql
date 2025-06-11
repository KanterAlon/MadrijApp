-- Add invitation code for sharing projects
ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS codigo_invite uuid DEFAULT uuid_generate_v4() UNIQUE;

-- Avoid duplicate members in a project
ALTER TABLE public.madrijim_proyectos
  ADD CONSTRAINT IF NOT EXISTS madrijim_proyectos_unique
    UNIQUE (proyecto_id, madrij_id);
