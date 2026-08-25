import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import { useAuth } from '../auth/AuthContext'
import type {
  FlujoCajaItem, Rendimiento, ReciboHaberes,
  Suscripcion, GastoFamilia, DeudaPendiente, Nota,
} from './types'
import {
  listarFlujoCaja, guardarFlujoCajaItem, eliminarFlujoCajaItem,
  listarRendimientos, guardarRendimiento, eliminarRendimiento,
  listarRecibos, guardarRecibo, eliminarRecibo,
  listarSuscripciones, guardarSuscripcion, eliminarSuscripcion,
  listarGastosFamilia, guardarGastoFamilia, eliminarGastoFamilia,
  listarDeudas, guardarDeuda, eliminarDeuda,
  listarNotas, guardarNota, eliminarNota,
} from '../lib/supabase/finance'

type Omitido<T> = Omit<T, 'id' | 'creadoEn' | 'actualizadoEn'>

interface FinanceDataContextValue {
  loading: boolean
  flujoCaja: FlujoCajaItem[]
  rendimientos: Rendimiento[]
  recibos: ReciboHaberes[]
  suscripciones: Suscripcion[]
  gastosFamilia: GastoFamilia[]
  deudas: DeudaPendiente[]
  notas: Nota[]
  // Flujo de caja
  agregarFlujo: (d: Omitido<FlujoCajaItem>) => Promise<void>
  actualizarFlujo: (item: FlujoCajaItem) => Promise<void>
  borrarFlujo: (id: string) => Promise<void>
  // Rendimientos
  agregarRendimiento: (d: Omitido<Rendimiento>) => Promise<void>
  actualizarRendimiento: (r: Rendimiento) => Promise<void>
  borrarRendimiento: (id: string) => Promise<void>
  // Recibos
  agregarRecibo: (d: Omitido<ReciboHaberes>) => Promise<void>
  actualizarRecibo: (r: ReciboHaberes) => Promise<void>
  borrarRecibo: (id: string) => Promise<void>
  recargarRecibos: () => Promise<void>
  // Suscripciones
  agregarSuscripcion: (d: Omitido<Suscripcion>) => Promise<void>
  actualizarSuscripcion: (s: Suscripcion) => Promise<void>
  borrarSuscripcion: (id: string) => Promise<void>
  // Gastos familia
  agregarGastoFamilia: (d: Omitido<GastoFamilia>) => Promise<void>
  actualizarGastoFamilia: (g: GastoFamilia) => Promise<void>
  borrarGastoFamilia: (id: string) => Promise<void>
  // Deudas
  agregarDeuda: (d: Omitido<DeudaPendiente>) => Promise<void>
  actualizarDeuda: (d: DeudaPendiente) => Promise<void>
  borrarDeuda: (id: string) => Promise<void>
  // Notas
  agregarNota: (d: Omitido<Nota>) => Promise<void>
  actualizarNota: (n: Nota) => Promise<void>
  borrarNota: (id: string) => Promise<void>
}

const Ctx = createContext<FinanceDataContextValue | null>(null)

function ahora() { return new Date().toISOString() }
function nuevo<T extends { id: string; creadoEn: string; actualizadoEn: string }>(
  data: Omitido<T>
): T { return { ...data, id: uuid(), creadoEn: ahora(), actualizadoEn: ahora() } as unknown as T }

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [flujoCaja, setFlujoCaja] = useState<FlujoCajaItem[]>([])
  const [rendimientos, setRendimientos] = useState<Rendimiento[]>([])
  const [recibos, setRecibos] = useState<ReciboHaberes[]>([])
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([])
  const [gastosFamilia, setGastosFamilia] = useState<GastoFamilia[]>([])
  const [deudas, setDeudas] = useState<DeudaPendiente[]>([])
  const [notas, setNotas] = useState<Nota[]>([])

  const recargar = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [fc, rend, rec, sus, gf, deu, not] = await Promise.all([
        listarFlujoCaja(), listarRendimientos(), listarRecibos(),
        listarSuscripciones(), listarGastosFamilia(), listarDeudas(), listarNotas(),
      ])
      setFlujoCaja(fc); setRendimientos(rend); setRecibos(rec)
      setSuscripciones(sus); setGastosFamilia(gf); setDeudas(deu); setNotas(not)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) recargar()
    else {
      setFlujoCaja([]); setRendimientos([]); setRecibos([])
      setSuscripciones([]); setGastosFamilia([]); setDeudas([]); setNotas([])
      setLoading(false)
    }
  }, [user])

  // Generic CRUD factory
  function makeCRUD<T extends { id: string; actualizadoEn: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    saveFn: (item: T) => Promise<void>,
    deleteFn: (id: string) => Promise<void>,
  ) {
    return {
      agregar: async (data: Omitido<T>) => {
        const item = nuevo<T>(data as Omitido<T>)
        await saveFn(item)
        setter(prev => [...prev, item])
      },
      actualizar: async (item: T) => {
        const updated = { ...item, actualizadoEn: ahora() }
        await saveFn(updated)
        setter(prev => prev.map(x => x.id === updated.id ? updated : x))
      },
      borrar: async (id: string) => {
        await deleteFn(id)
        setter(prev => prev.filter(x => x.id !== id))
      },
    }
  }

  const fc = makeCRUD(setFlujoCaja, guardarFlujoCajaItem, eliminarFlujoCajaItem)
  const rend = makeCRUD(setRendimientos, guardarRendimiento, eliminarRendimiento)
  const rec = makeCRUD(setRecibos, guardarRecibo, eliminarRecibo)
  const gf = makeCRUD(setGastosFamilia, guardarGastoFamilia, eliminarGastoFamilia)
  const deu = makeCRUD(setDeudas, guardarDeuda, eliminarDeuda)
  const not = makeCRUD(setNotas, guardarNota, eliminarNota)

  // Convierte una Suscripcion en los datos del FlujoCajaItem mensual equivalente
  function susToFlujoData(s: Suscripcion, suscripcionId: string): Omitido<FlujoCajaItem> {
    const mensual = s.periodicidad === 'Mensual' ? s.montoTotal : s.montoTotal / 12
    return {
      nombre: s.nombre,
      tipo: 'Expense',
      categoria: 'Suscripciones/Membresías',
      montoPEN: s.moneda === 'PEN' ? mensual : undefined,
      montoUSD: s.moneda === 'USD' ? mensual : undefined,
      activo: s.activa,
      orden: 999,
      suscripcionId,
    }
  }

  // CRUD de suscripciones con sync automático a Flujo de Caja
  const sus = {
    agregar: async (data: Omitido<Suscripcion>) => {
      const sus: Suscripcion = { ...data, id: uuid(), creadoEn: ahora(), actualizadoEn: ahora() }
      // Crear FlujoCajaItem vinculado
      const fcItem: FlujoCajaItem = { ...susToFlujoData(sus, sus.id), id: uuid(), creadoEn: ahora(), actualizadoEn: ahora() }
      await guardarFlujoCajaItem(fcItem)
      setFlujoCaja(prev => [...prev, fcItem])
      // Guardar suscripción con referencia al item
      const susConLink: Suscripcion = { ...sus, flujoCajaItemId: fcItem.id }
      await guardarSuscripcion(susConLink)
      setSuscripciones(prev => [...prev, susConLink])
    },
    actualizar: async (s: Suscripcion) => {
      const updated: Suscripcion = { ...s, actualizadoEn: ahora() }
      await guardarSuscripcion(updated)
      setSuscripciones(prev => prev.map(x => x.id === updated.id ? updated : x))
      // Sincronizar FlujoCajaItem vinculado
      if (updated.flujoCajaItemId) {
        const fcUpdated: FlujoCajaItem = {
          ...susToFlujoData(updated, updated.id),
          id: updated.flujoCajaItemId,
          creadoEn: ahora(),
          actualizadoEn: ahora(),
        }
        await guardarFlujoCajaItem(fcUpdated)
        setFlujoCaja(prev => prev.map(x => x.id === fcUpdated.id ? fcUpdated : x))
      }
    },
    borrar: async (id: string) => {
      // Buscar el flujoCajaItemId antes de borrar
      setSuscripciones(prev => {
        const sus = prev.find(x => x.id === id)
        if (sus?.flujoCajaItemId) {
          eliminarFlujoCajaItem(sus.flujoCajaItemId).then(() => {
            setFlujoCaja(fc => fc.filter(x => x.id !== sus.flujoCajaItemId))
          })
        }
        return prev.filter(x => x.id !== id)
      })
      await eliminarSuscripcion(id)
    },
  }

  return (
    <Ctx.Provider value={{
      loading, flujoCaja, rendimientos, recibos, suscripciones, gastosFamilia, deudas, notas,
      agregarFlujo: fc.agregar, actualizarFlujo: fc.actualizar, borrarFlujo: fc.borrar,
      agregarRendimiento: rend.agregar, actualizarRendimiento: rend.actualizar, borrarRendimiento: rend.borrar,
      agregarRecibo: rec.agregar, actualizarRecibo: rec.actualizar, borrarRecibo: rec.borrar,
      recargarRecibos: async () => { setRecibos(await listarRecibos()) },
      agregarSuscripcion: sus.agregar, actualizarSuscripcion: sus.actualizar, borrarSuscripcion: sus.borrar,
      agregarGastoFamilia: gf.agregar, actualizarGastoFamilia: gf.actualizar, borrarGastoFamilia: gf.borrar,
      agregarDeuda: deu.agregar, actualizarDeuda: deu.actualizar, borrarDeuda: deu.borrar,
      agregarNota: not.agregar, actualizarNota: not.actualizar, borrarNota: not.borrar,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useFinanceData() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useFinanceData must be used within FinanceDataProvider')
  return ctx
}
