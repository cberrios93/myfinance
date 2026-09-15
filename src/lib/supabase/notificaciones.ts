import { supabase } from './client'

export interface Notificacion {
  id: string
  tipo: 'actividad' | 'logro'
  categoria: string
  titulo: string
  descripcion?: string
  link?: string
  leida: boolean
  metadata?: Record<string, unknown>
  creadoEn: string
}

async function uid(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  return user.id
}

export async function listarNotificaciones(limit = 50): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .order('creado_en', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id,
    tipo: r.tipo,
    categoria: r.categoria,
    titulo: r.titulo,
    descripcion: r.descripcion ?? undefined,
    link: r.link ?? undefined,
    leida: r.leida,
    metadata: r.metadata ?? undefined,
    creadoEn: r.creado_en,
  }))
}

export async function contarNoLeidas(): Promise<number> {
  const { count, error } = await supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('leida', false)
  if (error) throw error
  return count ?? 0
}

export async function insertarNotificacion(
  n: Omit<Notificacion, 'id' | 'leida' | 'creadoEn'>
): Promise<void> {
  const user_id = await uid()
  const { error } = await supabase.from('notificaciones').insert({
    user_id,
    tipo: n.tipo,
    categoria: n.categoria,
    titulo: n.titulo,
    descripcion: n.descripcion ?? null,
    link: n.link ?? null,
    metadata: n.metadata ?? null,
  })
  if (error) throw error
}

export async function marcarLeida(id: string): Promise<void> {
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', id)
  if (error) throw error
}

export async function marcarTodasLeidas(): Promise<void> {
  const user_id = await uid()
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('user_id', user_id)
    .eq('leida', false)
  if (error) throw error
}
