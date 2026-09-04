-- Layout personalizado del Dashboard por usuario (canvas de mosaicos).
-- Las preferencias de usuario viven como columnas en user_profiles (ver 008_user_preferences.sql).
-- La policy "users update own profile" de la migración 008 ya cubre el UPDATE de esta columna.
-- Estructura del jsonb: { "version": 1, "tiles": [{ "id": "kpi-patrimonio", "x": 0, "y": 0, "w": 2, "h": 1 }, ...] }
-- NULL = el usuario nunca personalizó → la app usa el layout por defecto.

alter table public.user_profiles
  add column if not exists dashboard_layout jsonb;
