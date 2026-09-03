import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import type { CuentaPatrimonio, HistorialMensual } from './types'
import { listarCuentas, guardarCuenta, eliminarCuenta, togglePinnedCuenta, toggleHiddenCuenta, registrarLogCuenta, listarLogCuenta, listarHistorial, guardarHistorial, eliminarHistorial } from '../lib/supabase/patrimony'
import type { CuentaLog } from './types'
import { useAuth } from '../auth/AuthContext'
import { useUndo } from '../contexts/UndoContext'

interface PatrimonyContextValue {
  cuentas: CuentaPatrimonio[]
  historial: HistorialMensual[]
  loading: boolean
  agregarCuenta: (c: Omit<CuentaPatrimonio, 'id' | 'creadoEn' | 'actualizadoEn'>) => Promise<void>
  actualizarCuenta: (c: CuentaPatrimonio) => Promise<void>
  borrarCuenta: (id: string) => Promise<void>
  togglePinCuenta: (id: string, pinned: boolean) => Promise<void>
  toggleHideCuenta: (id: string, isHidden: boolean) => Promise<void>
  obtenerLogCuenta: (cuentaId: string) => Promise<CuentaLog[]>
  agregarHistorial: (h: Omit<HistorialMensual, 'id' | 'creadoEn' | 'actualizadoEn'>) => Promise<void>
  actualizarHistorial: (h: HistorialMensual) => Promise<void>
  borrarHistorial: (id: string) => Promise<void>
}

const PatrimonyContext = createContext<PatrimonyContextValue | null>(null)

export function PatrimonyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { showUndo } = useUndo()
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
    showUndo(`Cuenta "${nueva.nombre}" creada`, async () => {
      await eliminarCuenta(nueva.id)
      setCuentas(prev => prev.filter(x => x.id !== nueva.id))
    })
  }

  async function actualizarCuenta(c: CuentaPatrimonio) {
    const anterior = cuentas.find(x => x.id === c.id)
    const hasSaldo = (c.montoPEN != null && c.montoPEN !== 0) || (c.montoUSD != null && c.montoUSD !== 0)
    const updated = { ...c, isHidden: hasSaldo ? false : c.isHidden, actualizadoEn: new Date().toISOString() }
    const amountsChanged = anterior && (anterior.montoPEN !== c.montoPEN || anterior.montoUSD !== c.montoUSD)
    await guardarCuenta(updated)
    setCuentas(prev => prev.map(x => x.id === updated.id ? updated : x))
    if (amountsChanged) {
      registrarLogCuenta(updated.id, updated.montoPEN, updated.montoUSD).catch(() => {})
    }
    if (anterior) {
      showUndo(`Cuenta "${updated.nombre}" actualizada`, async () => {
        await guardarCuenta(anterior)
        setCuentas(prev => prev.map(x => x.id === anterior.id ? anterior : x))
      })
    }
  }

  async function obtenerLogCuenta(cuentaId: string): Promise<CuentaLog[]> {
    return listarLogCuenta(cuentaId)
  }

  async function borrarCuenta(id: string) {
    const snapshot = cuentas.find(x => x.id === id)
    await eliminarCuenta(id)
    setCuentas(prev => prev.filter(x => x.id !== id))
    if (snapshot) {
      showUndo(`Cuenta "${snapshot.nombre}" eliminada`, async () => {
        await guardarCuenta(snapshot)
        setCuentas(prev => [...prev, snapshot].sort((a, b) => a.orden - b.orden))
      })
    }
  }

  async function togglePinCuenta(id: string, pinned: boolean) {
    await togglePinnedCuenta(id, pinned)
    setCuentas(prev => prev.map(x => x.id === id ? { ...x, pinned } : x))
  }

  async function toggleHideCuenta(id: string, isHidden: boolean) {
    await toggleHiddenCuenta(id, isHidden)
    setCuentas(prev => prev.map(x => x.id === id ? { ...x, isHidden } : x))
  }

  async function agregarHistorial(data: Omit<HistorialMensual, 'id' | 'creadoEn' | 'actualizadoEn'>) {
    const ahora = new Date().toISOString()
    const nuevo: HistorialMensual = { ...data, id: uuid(), creadoEn: ahora, actualizadoEn: ahora }
    await guardarHistorial(nuevo)
    setHistorial(prev => [...prev, nuevo].sort((a, b) => a.fecha.localeCompare(b.fecha)))
    showUndo(`Historial "${nuevo.periodo}" creado`, async () => {
      await eliminarHistorial(nuevo.id)
      setHistorial(prev => prev.filter(x => x.id !== nuevo.id))
    })
  }

  async function actualizarHistorial(h: HistorialMensual) {
    const anterior = historial.find(x => x.id === h.id)
    const updated = { ...h, actualizadoEn: new Date().toISOString() }
    await guardarHistorial(updated)
    setHistorial(prev => prev.map(x => x.id === updated.id ? updated : x))
    if (anterior) {
      showUndo(`Historial "${updated.periodo}" actualizado`, async () => {
        await guardarHistorial(anterior)
        setHistorial(prev => prev.map(x => x.id === anterior.id ? anterior : x))
      })
    }
  }

  async function borrarHistorial(id: string) {
    const snapshot = historial.find(x => x.id === id)
    await eliminarHistorial(id)
    setHistorial(prev => prev.filter(x => x.id !== id))
    if (snapshot) {
      showUndo(`Historial "${snapshot.periodo}" eliminado`, async () => {
        await guardarHistorial(snapshot)
        setHistorial(prev => [...prev, snapshot].sort((a, b) => a.fecha.localeCompare(b.fecha)))
      })
    }
  }

  return (
    <PatrimonyContext.Provider value={{
      cuentas, historial, loading,
      agregarCuenta, actualizarCuenta, borrarCuenta, togglePinCuenta, toggleHideCuenta, obtenerLogCuenta,
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
