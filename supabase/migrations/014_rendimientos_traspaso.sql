-- Marca un rendimiento como traspaso entre instrumentos (no es ganancia/pérdida)
alter table rendimientos add column if not exists es_traspaso boolean not null default false;
