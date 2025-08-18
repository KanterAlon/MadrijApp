create table if not exists user_sidebar_links (
  user_id text primary key,
  links jsonb not null default '[]'::jsonb
);
