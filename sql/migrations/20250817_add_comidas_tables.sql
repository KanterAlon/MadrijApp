create table public.restaurants (
  id uuid not null default uuid_generate_v4(),
  proyecto_id uuid references public.proyectos(id),
  nombre text not null,
  platos jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  constraint restaurants_pkey primary key (id)
);

create table public.food_orders (
  id uuid not null default uuid_generate_v4(),
  proyecto_id uuid references public.proyectos(id),
  restaurant_id uuid references public.restaurants(id),
  created_at timestamp with time zone default now(),
  constraint food_orders_pkey primary key (id)
);

create table public.food_order_items (
  id uuid not null default uuid_generate_v4(),
  order_id uuid references public.food_orders(id) on delete cascade,
  plato text not null,
  guarnicion text,
  variante text,
  pedido_por text not null,
  created_at timestamp with time zone default now(),
  constraint food_order_items_pkey primary key (id)
);

