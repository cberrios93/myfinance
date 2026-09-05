import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import type { Escenario } from './types'
import { simular } from '../engine/calculator'
import type { ResultadoSimulacion } from './types'
import { listarEscenarios, guardarEscenario, eliminarEscenario } from '../lib/supabase/scenarios'
import { useAuth } from '../auth/AuthContext'
import { useUndo } from '../contexts/UndoContext'

interface ScenarioContextValue {
  escenarios: Escenario[]
  escenarioActivo: Escenario | null
  resultadoActivo: ResultadoSimulacion | null
  loading: boolean
  seleccionarEscenario: (id: string) => void
  actualizarEscenario: (escenario: Escenario) => Promise<void>
  crearEscenario: (nombre: string, base?: Partial<Escenario>) => Promise<Escenario>
  duplicarEscenario: (id: string) => Promise<void>
  borrarEscenario: (id: string) => Promise<void>
  cargarSemilla: (datos: Omit<Escenario, 'id' | 'nombre' | 'creadoEn' | 'actualizadoEn'>) => Promise<void>
  recargar: () => Promise<void>
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null)

const ESCENARIO_VACIO: Omit<Escenario, 'id' | 'nombre' | 'creadoEn' | 'actualizadoEn'> = {
  general: { edadActual: 30, edadRetiro: 65, edadVidaEstimada: 85, anioActual: new Date().getFullYear(), swr: 0.04, metas: [{ nombre: 'Meta 1', montoMensual: 30000 }] },
  instrumentos: [],
  movimientos: [],
  eventosVida: [],
  carrera: { aporteAnualBase: 0, crecimientoRealAnual: 0.02, saltos: [] },
}

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { showUndo } = useUndo()
  const [escenarios, setEscenarios] = useState<Escenario[]>([])
  const [escenarioActivoId, setEscenarioActivoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const recargar = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const lista = await listarEscenarios()
      setEscenarios(lista)
      if (lista.length > 0 && !escenarioActivoId) {
        setEscenarioActivoId(lista[0].id)
      }
    } finally {
      setLoading(false)
    }
  }, [user, escenarioActivoId])

  useEffect(() => {
    if (user) recargar()
    else { setEscenarios([]); setEscenarioActivoId(null); setLoading(false) }
  }, [user])

  const escenarioActivo = escenarios.find(e => e.id === escenarioActivoId) ?? null
  const resultadoActivo = escenarioActivo ? simular(escenarioActivo) : null

  async function actualizarEscenario(esc: Escenario) {
    const updated = { ...esc, actualizadoEn: new Date().toISOString() }
    setEscenarios(prev => prev.map(e => e.id === updated.id ? updated : e))
    await guardarEscenario(updated)
  }

  async function crearEscenario(nombre: string, base?: Partial<Escenario>): Promise<Escenario> {
    const ahora = new Date().toISOString()
    const nuevo: Escenario = {
      ...ESCENARIO_VACIO,
      ...base,
      id: uuid(),
      nombre,
      creadoEn: ahora,
      actualizadoEn: ahora,
    }
    await guardarEscenario(nuevo)
    setEscenarios(prev => [nuevo, ...prev])
    setEscenarioActivoId(nuevo.id)
    showUndo(`Escenario "${nuevo.nombre}" creado`, async () => {
      await eliminarEscenario(nuevo.id)
      setEscenarios(prev => {
        const restantes = prev.filter(e => e.id !== nuevo.id)
        setEscenarioActivoId(restantes[0]?.id ?? null)
        return restantes
      })
    })
    return nuevo
  }

  async function duplicarEscenario(id: string) {
    const original = escenarios.find(e => e.id === id)
    if (!original) return
    await crearEscenario(`${original.nombre} (copia)`, {
      general: original.general,
      instrumentos: original.instrumentos,
      movimientos: original.movimientos,
      eventosVida: original.eventosVida,
      carrera: original.carrera,
    })
  }

  async function borrarEscenario(id: string) {
    const snapshot = escenarios.find(e => e.id === id)
    const prevActivoId = escenarioActivoId
    await eliminarEscenario(id)
    const nuevos = escenarios.filter(e => e.id !== id)
    setEscenarios(nuevos)
    if (escenarioActivoId === id) {
      setEscenarioActivoId(nuevos[0]?.id ?? null)
    }
    if (snapshot) {
      showUndo(`Escenario "${snapshot.nombre}" eliminado`, async () => {
        await guardarEscenario(snapshot)
        setEscenarios(prev => [snapshot, ...prev])
        setEscenarioActivoId(prevActivoId)
      })
    }
  }

  async function cargarSemilla(datos: Omit<Escenario, 'id' | 'nombre' | 'creadoEn' | 'actualizadoEn'>) {
    await crearEscenario('Ejemplo 2026', datos)
  }

  return (
    <ScenarioContext.Provider value={{
      escenarios, escenarioActivo, resultadoActivo, loading,
      seleccionarEscenario: setEscenarioActivoId,
      actualizarEscenario, crearEscenario, duplicarEscenario,
      borrarEscenario, cargarSemilla, recargar,
    }}>
      {children}
    </ScenarioContext.Provider>
  )
}

export function useScenario() {
  const ctx = useContext(ScenarioContext)
  if (!ctx) throw new Error('useScenario must be used within ScenarioProvider')
  return ctx
}
