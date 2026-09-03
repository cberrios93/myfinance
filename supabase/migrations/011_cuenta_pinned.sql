-- Agrega campo pinned a cuentas para cuentas destacadas en Dashboard
ALTER TABLE cuentas ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
