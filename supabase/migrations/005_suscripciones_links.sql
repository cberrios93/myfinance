-- Columnas de vinculación entre Suscripciones y Flujo de Caja
alter table suscripciones
  add column if not exists flujo_caja_item_id uuid references flujo_caja(id) on delete set null;

alter table flujo_caja
  add column if not exists suscripcion_id uuid references suscripciones(id) on delete set null;
