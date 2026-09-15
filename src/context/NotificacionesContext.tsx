import { createContext, useContext, type ReactNode } from 'react'
import { useNotificaciones, type Notificacion } from '../hooks/useNotificaciones'

interface NotificacionesCtx {
  notificaciones: Notificacion[]
  noLeidas: number
  loading: boolean
  cargar: () => Promise<void>
  marcarUnaLeida: (id: string) => Promise<void>
  marcarTodas: () => Promise<void>
  registrar: (n: Omit<Notificacion, 'id' | 'leida' | 'creadoEn'>) => Promise<void>
}

const Ctx = createContext<NotificacionesCtx | null>(null)

export function NotificacionesProvider({ children }: { children: ReactNode }) {
  const value = useNotificaciones()
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotificacionesCtx(): NotificacionesCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNotificacionesCtx must be inside NotificacionesProvider')
  return ctx
}
