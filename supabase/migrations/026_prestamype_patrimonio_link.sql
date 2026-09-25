-- Vincula instrumentos Prestamype a cuentas de Patrimonio (fuente única de capital)
ALTER TABLE prestamype_instrumentos
  ADD COLUMN IF NOT EXISTS cuenta_patrimonio_id uuid;
