-- Tabla de escenarios financieros (MyFinance)
create table if not exists public.escenarios (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  datos jsonb not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Índice para consultas por usuario
create index if not exists escenarios_user_id_idx on public.escenarios(user_id);

-- Row Level Security
alter table public.escenarios enable row level security;

-- Política: cada usuario solo ve y modifica sus propios escenarios
create policy "usuarios ven sus escenarios"
  on public.escenarios for select
  using (auth.uid() = user_id);

create policy "usuarios insertan sus escenarios"
  on public.escenarios for insert
  with check (auth.uid() = user_id);

create policy "usuarios actualizan sus escenarios"
  on public.escenarios for update
  using (auth.uid() = user_id);

create policy "usuarios eliminan sus escenarios"
  on public.escenarios for delete
  using (auth.uid() = user_id);
