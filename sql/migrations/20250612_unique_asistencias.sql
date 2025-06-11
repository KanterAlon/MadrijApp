-- Avoid duplicate attendance entries per session
ALTER TABLE public.asistencias
  ADD CONSTRAINT IF NOT EXISTS asistencia_unique_sesion_janij
    UNIQUE (sesion_id, janij_id);
