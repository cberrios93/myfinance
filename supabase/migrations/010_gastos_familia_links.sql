-- Vinculación entre Gastos Familia y Flujo de Caja (igual que suscripciones)
alter table gastos_familia
  add column if not exists flujo_caja_item_id uuid references flujo_caja(id) on delete set null;

alter table flujo_caja
  add column if not exists gasto_familia_id uuid references gastos_familia(id) on delete set null;
