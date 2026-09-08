-- Marca un registro de rendimiento como "cierre fiscal" (venta/liquidación de la posición).
-- Solo aplica a instrumentos con tipoImpuesto = 'al_cierre'.
-- El impuesto (tasa_impuesto) solo se cobra en este registro, no en los mensuales de valorización.
ALTER TABLE rendimientos ADD COLUMN IF NOT EXISTS es_cierre_fiscal boolean NOT NULL DEFAULT false;
