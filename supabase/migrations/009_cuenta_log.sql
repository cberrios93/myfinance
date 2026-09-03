-- Historial de cambios de montos por cuenta (últimos 5 por cuenta)
create table if not exists cuenta_log (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  cuenta_id   uuid        not null references cuentas(id) on delete cascade,
  monto_pen   numeric,
  monto_usd   numeric,
  creado_en   timestamptz not null default now()
);

alter table cuenta_log enable row level security;

create policy "Users can manage their own cuenta_log"
  on cuenta_log for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index cuenta_log_cuenta_idx on cuenta_log(cuenta_id, creado_en desc);
