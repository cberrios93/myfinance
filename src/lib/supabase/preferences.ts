import { supabase } from './client'
import type { DashboardLayout } from '../../data/types'

export async function obtenerHistorialAuto(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from('user_profiles')
    .select('historial_auto')
    .eq('user_id', user.id)
    .single()
  return data?.historial_auto ?? false
}

export async function setHistorialAuto(valor: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase
    .from('user_profiles')
    .update({ historial_auto: valor })
    .eq('user_id', user.id)
  if (error) throw error
}

// --- Dashboard layout (canvas de mosaicos) ---
// Fuente de verdad: user_profiles.dashboard_layout jsonb (migración 018).
// null = el usuario nunca personalizó → el caller usa el layout por defecto.

export async function obtenerDashboardLayout(): Promise<DashboardLayout | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('user_profiles')
    .select('dashboard_layout')
    .eq('user_id', user.id)
    .single()
  return (data?.dashboard_layout as DashboardLayout | null) ?? null
}

export async function setDashboardLayout(layout: DashboardLayout): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase
    .from('user_profiles')
    .update({ dashboard_layout: layout })
    .eq('user_id', user.id)
  if (error) throw error
}

// Borra la personalización → la app vuelve al dashboard clásico.
export async function limpiarDashboardLayout(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase
    .from('user_profiles')
    .update({ dashboard_layout: null })
    .eq('user_id', user.id)
  if (error) throw error
}
