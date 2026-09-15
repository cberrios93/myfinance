import { supabase } from './client'

export interface EmailPreferencias {
  id: string
  user_id: string
  activo: boolean
  dia_semana: number   // 0=dom … 6=sáb
  hora: number         // 0-23
  zona_horaria: string
  creado_en: string
  actualizado_en: string
}

export const DIAS_SEMANA = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
]

export const ZONAS_HORARIAS = [
  { value: 'America/Lima',         label: 'Lima (UTC−5)' },
  { value: 'America/Bogota',       label: 'Bogotá (UTC−5)' },
  { value: 'America/Santiago',     label: 'Santiago (UTC−4/−3)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (UTC−3)' },
  { value: 'America/Mexico_City',  label: 'Ciudad de México (UTC−6)' },
  { value: 'America/New_York',     label: 'Nueva York (UTC−5/−4)' },
  { value: 'Europe/Madrid',        label: 'Madrid (UTC+1/+2)' },
]

export async function obtenerEmailPreferencias(): Promise<EmailPreferencias | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('email_preferencias')
    .select('*')
    .eq('user_id', user.id)
    .single()
  return data ?? null
}

export async function guardarEmailPreferencias(
  pref: Pick<EmailPreferencias, 'activo' | 'dia_semana' | 'hora' | 'zona_horaria'>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase
    .from('email_preferencias')
    .upsert({
      user_id: user.id,
      ...pref,
      actualizado_en: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  if (error) throw error
}
