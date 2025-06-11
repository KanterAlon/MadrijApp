-- Create table for attendance sessions
CREATE TABLE IF NOT EXISTS public.asistencia_sesiones (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id uuid NOT NULL REFERENCES public.proyectos(id),
    nombre text NOT NULL,
    inicio timestamp with time zone NOT NULL DEFAULT now(),
    fecha date NOT NULL,
    madrij_id text NOT NULL,
    finalizado boolean DEFAULT false,
    finalizado_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Link attendance records to a session
ALTER TABLE public.asistencias
  ADD COLUMN IF NOT EXISTS sesion_id uuid;

ALTER TABLE public.asistencias
  ADD CONSTRAINT asistencias_sesion_id_fkey
    FOREIGN KEY (sesion_id) REFERENCES public.asistencia_sesiones(id);
