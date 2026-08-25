import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import type { CuentaPatrimonio, HistorialMensual } from './types'
import { listarCuentas, guardarCuenta, eliminarCuenta, listarHistorial, guardarHistorial, eliminarHistorial } from '../lib/supabase/patrimony'
import { useAuth } from '../auth/AuthContext'

interface PatrimonyContextValue {
  cuentas: CuentaPatrimonio[]
  historial: HistorialMensual[]
  loading: boolean
  agregarCuenta: (c: Omit<CuentaPatrimonio, 'id' | 'creadoEn' | 'actualizadoEn'>) => Promise<void>
  actualizarCuenta: (c: CuentaPatrimonio) => Promise<void>
  borrarCuenta: (id: string) => Promise<void>
  agregarHistorial: (h: Omit<HistorialMensual, 'id' | 'creadoEn' | 'actualizadoEn'>) => Promise<void>
  actualizarHistorial: (h: HistorialMensual) => Promise<void>
  borrarHistorial: (id: string) => Promise<void>
}

const PatrimonyContext = createContext<PatrimonyContextValue | null>(null)

export function PatrimonyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cuentas, setCuentas] = useState<CuentaPatrimonio[]>([])
  const [historial, setHistorial] = useState<HistorialMensual[]>([])
  const [loading, setLoading] = useState(true)

  const recargar = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [c, h] = await Promise.all([listarCuentas(), listarHistorial()])
      setCuentas(c)
      setHistorial(h)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) recargar()
    else { setCuentas([]); setHistorial([]); setLoading(false) }
  }, [user])

  async function agregarCuenta(data: Omit<CuentaPatrimonio, 'id' | 'creadoEn' | 'actualizadoEn'>) {
    const ahora = new Date().toISOString()
    const nueva: CuentaPatrimonio = { ...data, id: uuid(), creadoEn: ahora, actualizadoEn: ahora }
    await guardarCuenta(nueva)
    setCuentas(prev => [...prev, nueva].sort((a, b) => a.orden - b.orden))
  }

  async function actualizarCuenta(c: CuentaPatrimonio) {
    const updated = { ...c, actualizadoEn: new Date().toISOString() }
    await guardarCuenta(updated)
    setCuentas(prev => prev.map(x => x.id === updated.id ? updated : x))
  }

  async function borrarCuenta(id: string) {
    await eliminarCuenta(id)
    setCuentas(prev => prev.filter(x => x.id !== id))
  }

  async function agregarHistorial(data: Omit<HistorialMensual, 'id' | 'creadoEn' | 'actualizadoEn'>) {
    const ahora = new Date().toISOString()
    const nuevo: HistorialMensual = { ...data, id: uuid(), creadoEn: ahora, actualizadoEn: ahora }
    await guardarHistorial(nuevo)
    setHistorial(prev => [...prev, nuevo].sort((a, b) => a.fecha.localeCompare(b.fecha)))
  }

  async function actualizarHistorial(h: HistorialMensual) {
    const updated = { ...h, actualizadoEn: new Date().toISOString() }
    await guardarHistorial(updated)
    setHistorial(prev => prev.map(x => x.id === updated.id ? updated : x))
  }

  async function borrarHistorial(id: string) {
    await eliminarHistorial(id)
    setHistorial(prev => prev.filter(x => x.id !== id))
  }

  return (
    <PatrimonyContext.Provider value={{
      cuentas, historial, loading,
      agregarCuenta, actualizarCuenta, borrarCuenta,
      agregarHistorial, actualizarHistorial, borrarHistorial,
    }}>
      {children}
    </PatrimonyContext.Provider>
  )
}

export function usePatrimony() {
  const ctx = useContext(PatrimonyContext)
  if (!ctx) throw new Error('usePatrimony must be used within PatrimonyProvider')
  return ctx
}
