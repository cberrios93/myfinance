-- Preferencias de email semanal por usuario
-- Un registro por usuario (upsert). Por defecto: lunes 9am Lima.

create table if not exists email_preferencias (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null unique references auth.users(id) on delete cascade,
  activo        boolean     not null default true,
  dia_semana    smallint    not null default 1 check (dia_semana between 0 and 6), -- 0=dom … 6=sáb
  hora          smallint    not null default 9  check (hora between 0 and 23),
  zona_horaria  text        not null default 'America/Lima',
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Índice para el cron (filtra activos)
create index if not exists email_preferencias_activo_idx
  on email_preferencias (activo) where activo = true;

-- RLS
alter table email_preferencias enable row level security;

create policy "usuario lee sus preferencias"
  on email_preferencias for select
  using (auth.uid() = user_id);

create policy "usuario inserta sus preferencias"
  on email_preferencias for insert
  with check (auth.uid() = user_id);

create policy "usuario actualiza sus preferencias"
  on email_preferencias for update
  using (auth.uid() = user_id);
