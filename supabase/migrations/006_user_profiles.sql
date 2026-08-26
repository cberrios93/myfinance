-- Tabla de perfiles de usuario con roles
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'guest' check (role in ('admin', 'guest')),
  created_at timestamptz not null default now()
);

create index if not exists user_profiles_user_id_idx on public.user_profiles(user_id);

alter table public.user_profiles enable row level security;

-- Usuarios ven su propio perfil
create policy "users view own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

-- Admin ve todos los perfiles
create policy "admin views all profiles"
  on public.user_profiles for select
  using (
    exists (
      select 1 from public.user_profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  );

-- Solo service role puede insertar/actualizar (via trigger o Edge Function)
-- No se permiten inserts desde el cliente anon

-- Trigger: crea perfil automáticamente al registrar un usuario nuevo
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, email, role)
  values (new.id, new.email, 'guest')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── INSTRUCCIONES POST-MIGRACIÓN ──────────────────────────────────────────
-- 1. Ejecutar en Supabase SQL Editor (reemplaza el email por el tuyo):
--
--    INSERT INTO public.user_profiles (user_id, email, role)
--    SELECT id, email, 'admin'
--    FROM auth.users
--    WHERE email = 'cberrios93@gmail.com'
--    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
--
-- 2. Agregar SUPABASE_SERVICE_ROLE_KEY en Vercel → Settings → Environment Variables
--    (obtenerla desde Supabase → Project Settings → API → service_role key)
-- ────────────────────────────────────────────────────────────────────────────
