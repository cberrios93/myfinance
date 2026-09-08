-- Marca si el impuesto calculado para ese registro ya fue declarado/pagado
ALTER TABLE rendimientos ADD COLUMN IF NOT EXISTS impuesto_pagado boolean NOT NULL DEFAULT false;
