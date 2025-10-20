create index if not exists madrijim_grupos_madrij_activo_idx
  on public.madrijim_grupos (madrij_id)
  where activo is true;

create index if not exists madrijim_grupos_grupo_activo_idx
  on public.madrijim_grupos (grupo_id)
  where activo is true;

create index if not exists janijim_grupo_activo_idx
  on public.janijim (grupo_id)
  where activo is true;
