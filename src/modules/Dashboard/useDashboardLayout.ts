import { useCallback, useEffect, useRef, useState } from 'react'
import { DASHBOARD_LAYOUT_VERSION, type DashboardLayout } from '../../data/types'
import { obtenerDashboardLayout, setDashboardLayout, limpiarDashboardLayout } from '../../lib/supabase/preferences'

// Un layout guardado con otra versión de grilla se descarta (vuelve al default).
function valido(l: DashboardLayout | null | undefined): DashboardLayout | null {
  if (!l || l.version !== DASHBOARD_LAYOUT_VERSION || !Array.isArray(l.tiles)) return null
  return l
}

// Persistencia del layout del Dashboard personalizable.
// Fuente de verdad: user_profiles.dashboard_layout (Supabase, migración 018).
// Fallback: localStorage, para que el canvas siga usable si Supabase falla.

const LS_KEY = 'myfinance.dashboardLayout'

function readLocal(): DashboardLayout | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return valido(JSON.parse(raw) as DashboardLayout)
  } catch {
    return null
  }
}

function writeLocal(layout: DashboardLayout | null) {
  try {
    if (layout) localStorage.setItem(LS_KEY, JSON.stringify(layout))
    else localStorage.removeItem(LS_KEY)
  } catch {
    /* almacenamiento no disponible — se ignora, Supabase sigue siendo la fuente de verdad */
  }
}

interface UseDashboardLayout {
  layout: DashboardLayout
  /** true si el usuario ya personalizó (hay layout guardado en Supabase o localStorage). */
  isCustom: boolean
  loading: boolean
  error: string | null
  /** Actualiza el layout en memoria (drag/resize en curso). No persiste. */
  setLayout: (next: DashboardLayout) => void
  /** Persiste un layout en Supabase + espejo en localStorage. Marca isCustom. */
  save: (next?: DashboardLayout) => Promise<void>
  /** Borra la personalización: vuelve al layout por defecto (isCustom = false). */
  reset: () => Promise<void>
}

export function useDashboardLayout(defaultLayout: DashboardLayout): UseDashboardLayout {
  const [layout, setLayoutState] = useState<DashboardLayout>(defaultLayout)
  const [isCustom, setIsCustom] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    ;(async () => {
      try {
        const remote = valido(await obtenerDashboardLayout())
        if (!mounted.current) return
        const found = remote ?? readLocal()
        setLayoutState(found ?? defaultLayout)
        setIsCustom(found != null)
      } catch {
        if (!mounted.current) return
        const local = readLocal()
        setLayoutState(local ?? defaultLayout)
        setIsCustom(local != null)
      } finally {
        if (mounted.current) setLoading(false)
      }
    })()
    return () => { mounted.current = false }
    // defaultLayout es una constante de módulo; no se re-ejecuta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLayout = useCallback((next: DashboardLayout) => {
    setLayoutState(next)
  }, [])

  const save = useCallback(async (next?: DashboardLayout) => {
    const target = next ?? layout
    setError(null)
    writeLocal(target)
    setLayoutState(target)
    setIsCustom(true)
    try {
      await setDashboardLayout(target)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar en el servidor')
      throw e
    }
  }, [layout])

  const reset = useCallback(async () => {
    setError(null)
    writeLocal(null)
    setLayoutState(defaultLayout)
    setIsCustom(false)
    try {
      await limpiarDashboardLayout()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo restablecer en el servidor')
      throw e
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { layout, isCustom, loading, error, setLayout, save, reset }
}
