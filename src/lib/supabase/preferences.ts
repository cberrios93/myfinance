import { supabase } from './client'

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
