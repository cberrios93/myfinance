-- Tasa de impuesto por registro de rendimiento (0-100, ej: 5 = 5%)
-- La ganancia neta = ganancia × (1 - tasa_impuesto/100)
ALTER TABLE rendimientos ADD COLUMN IF NOT EXISTS tasa_impuesto numeric NOT NULL DEFAULT 0;
