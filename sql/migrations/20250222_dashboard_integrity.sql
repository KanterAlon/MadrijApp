create index if not exists app_roles_clerk_id_idx on public.app_roles (clerk_id);

create index if not exists proyecto_coordinadores_proyecto_idx
  on public.proyecto_coordinadores (proyecto_id);

alter table public.proyecto_grupos
  add constraint proyecto_grupos_grupo_unique unique (grupo_id);
