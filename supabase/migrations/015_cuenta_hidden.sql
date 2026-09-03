-- Agrega campo is_hidden a cuentas para ocultar cuentas vacías
ALTER TABLE cuentas ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
