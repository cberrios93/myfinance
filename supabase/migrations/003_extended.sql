-- Flujo de caja mensual (items recurrentes de ingreso/gasto)
create table if not exists flujo_caja (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nombre text not null,
  tipo text not null default 'Income',        -- Income | Expense
  categoria text,
  monto_pen numeric,
  monto_usd numeric,
  activo boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
alter table flujo_caja enable row level security;
create policy "fc_select" on flujo_caja for select using (auth.uid() = user_id);
create policy "fc_insert" on flujo_caja for insert with check (auth.uid() = user_id);
create policy "fc_update" on flujo_caja for update using (auth.uid() = user_id);
create policy "fc_delete" on flujo_caja for delete using (auth.uid() = user_id);

-- Rendimientos de inversiones por año
create table if not exists rendimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  anio integer not null,
  instrumento_nombre text not null,
  fecha_pago date,
  ganancias_pen numeric,
  ganancias_usd numeric,
  inversion_pen numeric,
  inversion_usd numeric,
  rentabilidad numeric,
  reinvertido boolean not null default false,
  marcado boolean not null default false,
  comentario text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
alter table rendimientos enable row level security;
create policy "rend_select" on rendimientos for select using (auth.uid() = user_id);
create policy "rend_insert" on rendimientos for insert with check (auth.uid() = user_id);
create policy "rend_update" on rendimientos for update using (auth.uid() = user_id);
create policy "rend_delete" on rendimientos for delete using (auth.uid() = user_id);

-- Recibos de haberes (planilla SAP mensual)
create table if not exists recibos_haberes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  fecha date not null,
  sueldo_basico numeric not null default 0,
  teletrabajo numeric not null default 0,
  tickets_alimentacion numeric not null default 0,
  comisiones numeric not null default 0,
  vale_gasolina numeric not null default 0,
  gratificacion numeric not null default 0,
  otros_haberes numeric not null default 0,
  total_haberes numeric not null default 0,
  afp numeric not null default 0,
  seguro_afp numeric not null default 0,
  comision_afp numeric not null default 0,
  impuesto_5ta numeric not null default 0,
  total_descuentos numeric not null default 0,
  essalud numeric not null default 0,
  neto_a_pagar numeric not null default 0,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique(user_id, fecha)
);
alter table recibos_haberes enable row level security;
create policy "rec_select" on recibos_haberes for select using (auth.uid() = user_id);
create policy "rec_insert" on recibos_haberes for insert with check (auth.uid() = user_id);
create policy "rec_update" on recibos_haberes for update using (auth.uid() = user_id);
create policy "rec_delete" on recibos_haberes for delete using (auth.uid() = user_id);

-- Suscripciones
create table if not exists suscripciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nombre text not null,
  monto_total numeric not null default 0,
  moneda text not null default 'PEN',
  periodicidad text not null default 'Mensual',
  personas jsonb,
  activa boolean not null default true,
  vencimiento date,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
alter table suscripciones enable row level security;
create policy "sus_select" on suscripciones for select using (auth.uid() = user_id);
create policy "sus_insert" on suscripciones for insert with check (auth.uid() = user_id);
create policy "sus_update" on suscripciones for update using (auth.uid() = user_id);
create policy "sus_delete" on suscripciones for delete using (auth.uid() = user_id);

-- Gastos familia
create table if not exists gastos_familia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  descripcion text not null,
  beneficiario text not null,
  tipo text not null default 'Otro',
  monto_pen numeric,
  monto_usd numeric,
  periodicidad text not null default 'Mensual',
  activo boolean not null default true,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
alter table gastos_familia enable row level security;
create policy "gf_select" on gastos_familia for select using (auth.uid() = user_id);
create policy "gf_insert" on gastos_familia for insert with check (auth.uid() = user_id);
create policy "gf_update" on gastos_familia for update using (auth.uid() = user_id);
create policy "gf_delete" on gastos_familia for delete using (auth.uid() = user_id);

-- Deudas pendientes
create table if not exists deudas_pendientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  deudor text not null,
  concepto text not null,
  fecha_deposito date,
  capital numeric not null default 0,
  intereses numeric not null default 0,
  estado text not null default 'Pendiente',
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
alter table deudas_pendientes enable row level security;
create policy "deu_select" on deudas_pendientes for select using (auth.uid() = user_id);
create policy "deu_insert" on deudas_pendientes for insert with check (auth.uid() = user_id);
create policy "deu_update" on deudas_pendientes for update using (auth.uid() = user_id);
create policy "deu_delete" on deudas_pendientes for delete using (auth.uid() = user_id);

-- Notas e ideas
create table if not exists notas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  titulo text not null,
  contenido text,
  tags text[],
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
alter table notas enable row level security;
create policy "not_select" on notas for select using (auth.uid() = user_id);
create policy "not_insert" on notas for insert with check (auth.uid() = user_id);
create policy "not_update" on notas for update using (auth.uid() = user_id);
create policy "not_delete" on notas for delete using (auth.uid() = user_id);
