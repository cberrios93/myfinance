-- Agrega preferencias de usuario a user_profiles
alter table public.user_profiles
  add column if not exists historial_auto boolean not null default false;

-- Permitir que el usuario actualice su propio perfil (solo campos de preferencias)
create policy "users update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
