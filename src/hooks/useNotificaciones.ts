import { useState, useCallback, useEffect } from 'react'
import {
  listarNotificaciones, contarNoLeidas, marcarLeida,
  marcarTodasLeidas, insertarNotificacion,
  type Notificacion,
} from '../lib/supabase/notificaciones'
import { supabaseConfigured } from '../lib/supabase/client'

export type { Notificacion }

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [loading] = useState(false)

  const cargar = useCallback(async () => {
    if (!supabaseConfigured) return
    try {
      const [lista, count] = await Promise.all([listarNotificaciones(), contarNoLeidas()])
      setNotificaciones(lista)
      setNoLeidas(count)
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const marcarUnaLeida = useCallback(async (id: string) => {
    await marcarLeida(id)
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    setNoLeidas(prev => Math.max(0, prev - 1))
  }, [])

  const marcarTodas = useCallback(async () => {
    await marcarTodasLeidas()
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
    setNoLeidas(0)
  }, [])

  const registrar = useCallback(async (
    n: Omit<Notificacion, 'id' | 'leida' | 'creadoEn'>
  ) => {
    if (!supabaseConfigured) return
    try {
      await insertarNotificacion(n)
      // Optimistic: agrega al inicio sin recargar todo
      const nueva: Notificacion = {
        ...n, id: crypto.randomUUID(), leida: false, creadoEn: new Date().toISOString(),
      }
      setNotificaciones(prev => [nueva, ...prev])
      setNoLeidas(prev => prev + 1)
    } catch { /* silencioso */ }
  }, [])

  return { notificaciones, noLeidas, loading, cargar, marcarUnaLeida, marcarTodas, registrar }
}
