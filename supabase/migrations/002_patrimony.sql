-- Cuentas de patrimonio (balance sheet real, independiente de escenarios)
create table if not exists cuentas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nombre text not null,
  categoria text not null default 'Savings',
  monto_pen numeric,
  monto_usd numeric,
  es_riesgo boolean not null default false,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table cuentas enable row level security;

create policy "cuentas_select" on cuentas for select using (auth.uid() = user_id);
create policy "cuentas_insert" on cuentas for insert with check (auth.uid() = user_id);
create policy "cuentas_update" on cuentas for update using (auth.uid() = user_id);
create policy "cuentas_delete" on cuentas for delete using (auth.uid() = user_id);

-- Historial mensual de patrimonio
create table if not exists historial_mensual (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  fecha date not null,
  periodo text not null,
  total_pen numeric not null default 0,
  total_usd numeric not null default 0,
  tipo_cambio numeric not null default 3.7,
  nota text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique(user_id, fecha)
);

alter table historial_mensual enable row level security;

create policy "historial_select" on historial_mensual for select using (auth.uid() = user_id);
create policy "historial_insert" on historial_mensual for insert with check (auth.uid() = user_id);
create policy "historial_update" on historial_mensual for update using (auth.uid() = user_id);
create policy "historial_delete" on historial_mensual for delete using (auth.uid() = user_id);
