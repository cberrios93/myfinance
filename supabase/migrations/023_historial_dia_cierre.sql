-- Día del mes en que se ejecuta el historial automático por usuario.
-- Valores 1–28: día fijo del mes. 0: último día del mes.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS dia_cierre_mensual smallint NOT NULL DEFAULT 1
    CHECK (dia_cierre_mensual >= 0 AND dia_cierre_mensual <= 28);
