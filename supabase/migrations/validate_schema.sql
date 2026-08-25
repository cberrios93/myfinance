-- ============================================================
-- MyFinance — Validación de esquema
-- Ejecutar en Supabase SQL Editor (DEV o PROD)
-- Resultado: una fila por check con estado OK o FALTA
-- ============================================================

with checks as (

  -- ── Tablas esperadas ──────────────────────────────────────
  select '001' as migr, 'tabla' as tipo, 'escenarios' as objeto,
    case when exists (select 1 from information_schema.tables where table_schema='public' and table_name='escenarios')
         then 'OK' else 'FALTA' end as estado

  union all select '002','tabla','cuentas',
    case when exists (select 1 from information_schema.tables where table_schema='public' and table_name='cuentas')
         then 'OK' else 'FALTA' end

  union all select '002','tabla','historial_mensual',
    case when exists (select 1 from information_schema.tables where table_schema='public' and table_name='historial_mensual')
         then 'OK' else 'FALTA' end

  union all select '003','tabla','flujo_caja',
    case when exists (select 1 from information_schema.tables where table_schema='public' and table_name='flujo_caja')
         then 'OK' else 'FALTA' end

  union all select '003','tabla','rendimientos',
    case when exists (select 1 from information_schema.tables where table_schema='public' and table_name='rendimientos')
         then 'OK' else 'FALTA' end

  union all select '003','tabla','recibos_haberes',
    case when exists (select 1 from information_schema.tables where table_schema='public' and table_name='recibos_haberes')
         then 'OK' else 'FALTA' end

  union all select '003','tabla','suscripciones',
    case when exists (select 1 from information_schema.tables where table_schema='public' and table_name='suscripciones')
         then 'OK' else 'FALTA' end

  union all select '003','tabla','gastos_familia',
    case when exists (select 1 from information_schema.tables where table_schema='public' and table_name='gastos_familia')
         then 'OK' else 'FALTA' end

  union all select '003','tabla','deudas_pendientes',
    case when exists (select 1 from information_schema.tables where table_schema='public' and table_name='deudas_pendientes')
         then 'OK' else 'FALTA' end

  union all select '003','tabla','notas',
    case when exists (select 1 from information_schema.tables where table_schema='public' and table_name='notas')
         then 'OK' else 'FALTA' end

  -- ── Columnas nuevas de recibos_haberes (migración 004) ────
  union all select '004','columna','recibos_haberes.aporte_empresa',
    case when exists (select 1 from information_schema.columns where table_name='recibos_haberes' and column_name='aporte_empresa')
         then 'OK' else 'FALTA' end

  union all select '004','columna','recibos_haberes.comisiones_anio_actual',
    case when exists (select 1 from information_schema.columns where table_name='recibos_haberes' and column_name='comisiones_anio_actual')
         then 'OK' else 'FALTA' end

  union all select '004','columna','recibos_haberes.sueldo_vacaciones',
    case when exists (select 1 from information_schema.columns where table_name='recibos_haberes' and column_name='sueldo_vacaciones')
         then 'OK' else 'FALTA' end

  union all select '004','columna','recibos_haberes.equity_shares_taxable',
    case when exists (select 1 from information_schema.columns where table_name='recibos_haberes' and column_name='equity_shares_taxable')
         then 'OK' else 'FALTA' end

  union all select '004','columna','recibos_haberes.seguro_vida',
    case when exists (select 1 from information_schema.columns where table_name='recibos_haberes' and column_name='seguro_vida')
         then 'OK' else 'FALTA' end

  union all select '004','columna','recibos_haberes.equity_rsu_psu_payout',
    case when exists (select 1 from information_schema.columns where table_name='recibos_haberes' and column_name='equity_rsu_psu_payout')
         then 'OK' else 'FALTA' end

  union all select '004','columna','recibos_haberes.total_otros_haberes',
    case when exists (select 1 from information_schema.columns where table_name='recibos_haberes' and column_name='total_otros_haberes')
         then 'OK' else 'FALTA' end

  union all select '004','columna','recibos_haberes.abono_gratificacion',
    case when exists (select 1 from information_schema.columns where table_name='recibos_haberes' and column_name='abono_gratificacion')
         then 'OK' else 'FALTA' end

  union all select '004','columna','recibos_haberes.dcto_tickets_alimentacion',
    case when exists (select 1 from information_schema.columns where table_name='recibos_haberes' and column_name='dcto_tickets_alimentacion')
         then 'OK' else 'FALTA' end

  union all select '004','columna','recibos_haberes.total_otros_descuentos',
    case when exists (select 1 from information_schema.columns where table_name='recibos_haberes' and column_name='total_otros_descuentos')
         then 'OK' else 'FALTA' end

  union all select '004','columna','recibos_haberes.eps_privado',
    case when exists (select 1 from information_schema.columns where table_name='recibos_haberes' and column_name='eps_privado')
         then 'OK' else 'FALTA' end

  union all select '004','columna','recibos_haberes.vida_ley',
    case when exists (select 1 from information_schema.columns where table_name='recibos_haberes' and column_name='vida_ley')
         then 'OK' else 'FALTA' end

  union all select '004','columna','recibos_haberes.total_aportes',
    case when exists (select 1 from information_schema.columns where table_name='recibos_haberes' and column_name='total_aportes')
         then 'OK' else 'FALTA' end

  -- ── Columnas opcionales de otras tablas ───────────────────
  union all select '003','columna','flujo_caja.suscripcion_id (opcional)',
    case when exists (select 1 from information_schema.columns where table_name='flujo_caja' and column_name='suscripcion_id')
         then 'OK' else 'FALTA (opcional)' end

  union all select '003','columna','suscripciones.flujo_caja_item_id (opcional)',
    case when exists (select 1 from information_schema.columns where table_name='suscripciones' and column_name='flujo_caja_item_id')
         then 'OK' else 'FALTA (opcional)' end

  -- ── RLS habilitado ────────────────────────────────────────
  union all select '001','rls','escenarios',
    case when (select relrowsecurity from pg_class where relname='escenarios') then 'OK' else 'FALTA' end

  union all select '002','rls','cuentas',
    case when (select relrowsecurity from pg_class where relname='cuentas') then 'OK' else 'FALTA' end

  union all select '003','rls','recibos_haberes',
    case when (select relrowsecurity from pg_class where relname='recibos_haberes') then 'OK' else 'FALTA' end

  union all select '003','rls','flujo_caja',
    case when (select relrowsecurity from pg_class where relname='flujo_caja') then 'OK' else 'FALTA' end

  -- ── Constraint único en recibos_haberes ───────────────────
  union all select '003','constraint','recibos_haberes (user_id, fecha) unique',
    case when exists (
      select 1 from information_schema.table_constraints tc
      join information_schema.constraint_column_usage cu on tc.constraint_name = cu.constraint_name
      where tc.table_name = 'recibos_haberes'
        and tc.constraint_type = 'UNIQUE'
        and cu.column_name = 'fecha'
    ) then 'OK' else 'FALTA' end

)

select
  migr     as "Migración",
  tipo     as "Tipo",
  objeto   as "Objeto",
  estado   as "Estado",
  case when estado = 'OK' then '✓' else '✗' end as "✓/✗"
from checks
order by migr, tipo, objeto;
