-- Ampliar recibos_haberes con el detalle completo del recibo SAP
-- Ejecutar en Supabase DEV SQL Editor

alter table recibos_haberes
  -- Haberes
  add column if not exists aporte_empresa           numeric not null default 0,
  add column if not exists premio_reconocimiento_impto numeric not null default 0,
  add column if not exists comisiones_anio_actual   numeric not null default 0,
  add column if not exists sueldo_vacaciones        numeric not null default 0,
  add column if not exists venta_vacaciones         numeric not null default 0,
  add column if not exists remuneracion_1_mayo      numeric not null default 0,
  add column if not exists vacaciones_devengadas    numeric not null default 0,
  add column if not exists equity_shares_taxable    numeric not null default 0,

  -- Otros Haberes
  add column if not exists seguro_vida              numeric not null default 0,
  add column if not exists premio_reconocimiento_gross_up numeric not null default 0,
  add column if not exists comisiones_anio_anterior numeric not null default 0,
  add column if not exists participacion_utilidades numeric not null default 0,
  add column if not exists equity_rsu_psu_payout    numeric not null default 0,
  add column if not exists indem_vacacional         numeric not null default 0,
  add column if not exists bonificacion_extraord    numeric not null default 0,
  add column if not exists equity_cash_payout       numeric not null default 0,
  add column if not exists equity_tax_cover_advance numeric not null default 0,
  add column if not exists equity_net_sale_proceeds numeric not null default 0,
  add column if not exists total_otros_haberes      numeric not null default 0,

  -- Otros Descuentos
  add column if not exists abono_gratificacion      numeric not null default 0,
  add column if not exists abono_utilidades         numeric not null default 0,
  add column if not exists dcto_vale_gasolina       numeric not null default 0,
  add column if not exists dcto_premio_reconocimiento numeric not null default 0,
  add column if not exists contribucion_empleado    numeric not null default 0,
  add column if not exists descto_aporte_empresa    numeric not null default 0,
  add column if not exists dcto_seguro_vida         numeric not null default 0,
  add column if not exists dcto_tickets_alimentacion numeric not null default 0,
  add column if not exists essalud_vida             numeric not null default 0,
  add column if not exists equity_shares_taxable_dscto numeric not null default 0,
  add column if not exists equity_tax_cover_advance_dscto numeric not null default 0,
  add column if not exists total_otros_descuentos   numeric not null default 0,

  -- Aportes Empleador
  add column if not exists eps_privado              numeric not null default 0,
  add column if not exists vida_ley                 numeric not null default 0,
  add column if not exists total_aportes            numeric not null default 0;

-- Renombrar columnas que cambiaron de nombre en el modelo
-- comisiones -> comisiones_anio_actual ya se agrega arriba; la columna original se mantiene para no romper datos históricos
-- Si la tabla está vacía, se puede hacer: alter table recibos_haberes rename column comisiones to comisiones_anio_actual;
-- Si ya tiene datos, copiar y dejar las dos:
update recibos_haberes set comisiones_anio_actual = comisiones where comisiones_anio_actual = 0 and comisiones > 0;

-- essalud existente pasa a ser el aporte empleador (EsSALUD); no cambia nombre
-- otros_haberes existente queda pero ya no se usa — el total se calcula desde los campos individuales
