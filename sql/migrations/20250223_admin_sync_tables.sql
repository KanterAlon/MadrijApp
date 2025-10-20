create extension if not exists "pgcrypto";

create table if not exists public.admin_sync_runs (
  id uuid primary key default gen_random_uuid(),
  admin_id text not null,
  status text not null default 'review' check (status in ('review', 'applied', 'cancelled')),
  preview jsonb not null,
  summary jsonb not null,
  result jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  committed_at timestamptz
);

create index if not exists admin_sync_runs_admin_idx
  on public.admin_sync_runs (admin_id);

create index if not exists admin_sync_runs_status_idx
  on public.admin_sync_runs (status);
