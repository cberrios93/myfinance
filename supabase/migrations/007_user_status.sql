-- Agrega status y block_reason a user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('active', 'blocked', 'pending')),
  ADD COLUMN IF NOT EXISTS block_reason text;

-- Usuarios existentes ya están activos
UPDATE public.user_profiles SET status = 'active';

-- Función para que el propio usuario active su cuenta al aceptar invitación
-- SECURITY DEFINER evita restricciones de RLS en el UPDATE
CREATE OR REPLACE FUNCTION public.activate_own_account()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.user_profiles
  SET status = 'active'
  WHERE user_id = auth.uid() AND status = 'pending';
$$;
