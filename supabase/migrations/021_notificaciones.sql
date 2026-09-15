-- 021_notificaciones.sql
create table if not exists notificaciones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tipo        text not null check (tipo in ('actividad', 'logro')),
  categoria   text not null,
  titulo      text not null,
  descripcion text,
  link        text,
  leida       boolean not null default false,
  metadata    jsonb,
  creado_en   timestamptz not null default now()
);

create index if not exists notificaciones_user_id_idx on notificaciones(user_id);
create index if not exists notificaciones_leida_idx   on notificaciones(user_id, leida) where leida = false;

alter table notificaciones enable row level security;

create policy "Usuario ve sus notificaciones"
  on notificaciones for select
  using (auth.uid() = user_id);

create policy "Usuario inserta sus notificaciones"
  on notificaciones for insert
  with check (auth.uid() = user_id);

create policy "Usuario actualiza sus notificaciones"
  on notificaciones for update
  using (auth.uid() = user_id);

create policy "Usuario elimina sus notificaciones"
  on notificaciones for delete
  using (auth.uid() = user_id);
