-- Hora del día (zona Lima, UTC-5) en que se ejecuta el historial automático.
-- Rango 0–23. Default 8 = 8:00am Lima.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS hora_cierre_mensual smallint NOT NULL DEFAULT 8
    CHECK (hora_cierre_mensual >= 0 AND hora_cierre_mensual <= 23);
