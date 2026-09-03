-- Agrega columna aporte del mes (USD y PEN) a rendimientos
-- Permite separar capital nuevo de ganancia real cuando hay aportes mid-mes
alter table rendimientos add column if not exists aporte_mes_usd numeric(14,2);
alter table rendimientos add column if not exists aporte_mes_pen numeric(14,2);
