create table public.grupos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  spreadsheet_id text,
  janij_sheet text,
  madrij_sheet text,
  created_at timestamptz default now()
);

alter table public.proyectos add column grupo_id uuid;
insert into public.grupos (id, nombre)
  select id, nombre from public.proyectos;
update public.proyectos set grupo_id = id;
alter table public.proyectos alter column grupo_id set not null;
alter table public.proyectos
  add constraint proyectos_grupo_id_fkey foreign key (grupo_id)
  references public.grupos(id) on delete restrict;

alter table public.janijim add column grupo_id uuid;
update public.janijim set grupo_id = proyecto_id;
alter table public.janijim alter column grupo_id set not null;
alter table public.janijim
  add constraint janijim_grupo_id_fkey foreign key (grupo_id)
  references public.grupos(id) on delete cascade;
create index janijim_grupo_id_idx on public.janijim (grupo_id);

alter table public.madrijim_proyectos rename to madrijim_grupos;
alter table public.madrijim_grupos
  rename constraint madrijim_proyectos_pkey to madrijim_grupos_pkey;
alter table public.madrijim_grupos add column grupo_id uuid;
update public.madrijim_grupos set grupo_id = proyecto_id;
alter table public.madrijim_grupos alter column grupo_id set not null;
alter table public.madrijim_grupos drop constraint madrijim_proyectos_proyecto_id_fkey;
alter table public.madrijim_grupos drop column proyecto_id;
alter table public.madrijim_grupos
  add constraint madrijim_grupos_grupo_id_fkey foreign key (grupo_id)
  references public.grupos(id) on delete cascade;
create unique index madrijim_grupos_unique on public.madrijim_grupos (grupo_id, madrij_id);
