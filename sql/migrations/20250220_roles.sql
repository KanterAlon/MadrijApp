create table if not exists public.app_roles (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  nombre text not null,
  role text not null check (role in ('madrij', 'coordinador', 'director', 'admin')),
  clerk_id text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, role)
);

create index if not exists app_roles_email_idx on public.app_roles (lower(email));
create index if not exists app_roles_role_idx on public.app_roles (role);

create table if not exists public.proyecto_coordinadores (
  id uuid primary key default uuid_generate_v4(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  role_id uuid not null references public.app_roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (proyecto_id, role_id)
);

create index if not exists proyecto_coordinadores_role_idx on public.proyecto_coordinadores (role_id);

create or replace function public.set_app_roles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_app_roles_update on public.app_roles;

create trigger trg_app_roles_update
  before update on public.app_roles
  for each row
  execute procedure public.set_app_roles_updated_at();
alter table public.proyectos alter column grupo_id drop not null;

create table if not exists public.proyecto_grupos (
  id uuid primary key default uuid_generate_v4(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (proyecto_id, grupo_id)
);

create index if not exists proyecto_grupos_proyecto_idx on public.proyecto_grupos (proyecto_id);
create index if not exists proyecto_grupos_grupo_idx on public.proyecto_grupos (grupo_id);

insert into public.proyecto_grupos (proyecto_id, grupo_id)
select id, grupo_id
from public.proyectos
where grupo_id is not null
on conflict do nothing;
