-- Agrega columna mes (1-12) a rendimientos para filtrado mensual
alter table rendimientos add column if not exists mes integer check (mes >= 1 and mes <= 12);
