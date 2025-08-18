
-- Stores the custom sidebar configuration for each user
create table if not exists public.user_sidebar_links (
  user_id text primary key,
  links jsonb not null default '[]'::jsonb
);

alter table public.user_sidebar_links enable row level security;

create policy "Users manage own sidebar links" on public.user_sidebar_links
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
