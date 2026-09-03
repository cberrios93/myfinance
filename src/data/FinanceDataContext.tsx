import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import { useAuth } from '../auth/AuthContext'
import { useUndo } from '../contexts/UndoContext'
import type {
  FlujoCajaItem, Rendimiento, ReciboHaberes,
  Suscripcion, GastoFamilia, DeudaPendiente, Nota, FlujoCapital,
} from './types'
import {
  listarFlujoCaja, guardarFlujoCajaItem, eliminarFlujoCajaItem,
  listarRendimientos, guardarRendimiento, eliminarRendimiento,
  listarRecibos, guardarRecibo, eliminarRecibo,
  listarSuscripciones, guardarSuscripcion, eliminarSuscripcion,
  listarGastosFamilia, guardarGastoFamilia, eliminarGastoFamilia,
  listarDeudas, guardarDeuda, eliminarDeuda,
  listarNotas, guardarNota, eliminarNota,
  listarFlujosCapital, guardarFlujoCapital, eliminarFlujoCapital,
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
  flujosCapital: FlujoCapital[]
  // Flujos de capital
  agregarFlujoCapital: (d: Omitido<FlujoCapital>) => Promise<void>
  actualizarFlujoCapital: (f: FlujoCapital) => Promise<void>
  borrarFlujoCapital: (id: string) => Promise<void>
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
  const { showUndo } = useUndo()
  const [loading, setLoading] = useState(true)
  const [flujoCaja, setFlujoCaja] = useState<FlujoCajaItem[]>([])
  const [rendimientos, setRendimientos] = useState<Rendimiento[]>([])
  const [recibos, setRecibos] = useState<ReciboHaberes[]>([])
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([])
  const [gastosFamilia, setGastosFamilia] = useState<GastoFamilia[]>([])
  const [deudas, setDeudas] = useState<DeudaPendiente[]>([])
  const [notas, setNotas] = useState<Nota[]>([])
  const [flujosCapital, setFlujosCapital] = useState<FlujoCapital[]>([])

  // Refs para acceder al estado actual sin stale closures en funciones de undo
  const fcRef = useRef(flujoCaja); fcRef.current = flujoCaja
  const rendRef = useRef(rendimientos); rendRef.current = rendimientos
  const recRef = useRef(recibos); recRef.current = recibos
  const susRef = useRef(suscripciones); susRef.current = suscripciones
  const gfRef = useRef(gastosFamilia); gfRef.current = gastosFamilia
  const deuRef = useRef(deudas); deuRef.current = deudas
  const notRef = useRef(notas); notRef.current = notas
  const fkRef = useRef(flujosCapital); fkRef.current = flujosCapital

  const recargar = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [fc, rend, rec, sus, gf, deu, not, fk] = await Promise.all([
        listarFlujoCaja(), listarRendimientos(), listarRecibos(),
        listarSuscripciones(), listarGastosFamilia(), listarDeudas(), listarNotas(),
        listarFlujosCapital(),
      ])
      const susMap = new Map(sus.filter(s => s.flujoCajaItemId).map(s => [s.flujoCajaItemId!, s.id]))
      const gfMap = new Map(gf.filter(g => g.flujoCajaItemId).map(g => [g.flujoCajaItemId!, g.id]))
      const fcAnotado = fc.map(item => ({
        ...item,
        suscripcionId: susMap.get(item.id) ?? item.suscripcionId,
        gastoFamiliaId: gfMap.get(item.id) ?? item.gastoFamiliaId,
      }))
      setFlujoCaja(fcAnotado); setRendimientos(rend); setRecibos(rec)
      setSuscripciones(sus); setGastosFamilia(gf); setDeudas(deu); setNotas(not); setFlujosCapital(fk)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) recargar()
    else {
      setFlujoCaja([]); setRendimientos([]); setRecibos([])
      setSuscripciones([]); setGastosFamilia([]); setDeudas([]); setNotas([]); setFlujosCapital([])
      setLoading(false)
    }
  }, [user])

  // Fábrica CRUD genérica con soporte de undo
  function makeCRUD<T extends { id: string; creadoEn: string; actualizadoEn: string }>(
    stateRef: React.MutableRefObject<T[]>,
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    saveFn: (item: T) => Promise<void>,
    deleteFn: (id: string) => Promise<void>,
    entityName: string,
    getLabel: (item: T) => string,
  ) {
    return {
      agregar: async (data: Omitido<T>) => {
        const item = nuevo<T>(data as Omitido<T>)
        await saveFn(item)
        setter(prev => [...prev, item])
        showUndo(`${entityName} "${getLabel(item)}" creado`, async () => {
          await deleteFn(item.id)
          setter(prev => prev.filter(x => x.id !== item.id))
        })
      },
      actualizar: async (item: T) => {
        const anterior = stateRef.current.find(x => x.id === item.id)
        const updated = { ...item, actualizadoEn: ahora() }
        await saveFn(updated)
        setter(prev => prev.map(x => x.id === updated.id ? updated : x))
        if (anterior) {
          showUndo(`${entityName} "${getLabel(updated)}" actualizado`, async () => {
            await saveFn(anterior)
            setter(prev => prev.map(x => x.id === anterior.id ? anterior : x))
          })
        }
      },
      borrar: async (id: string) => {
        const snapshot = stateRef.current.find(x => x.id === id)
        await deleteFn(id)
        setter(prev => prev.filter(x => x.id !== id))
        if (snapshot) {
          showUndo(`${entityName} "${getLabel(snapshot)}" eliminado`, async () => {
            await saveFn(snapshot)
            setter(prev => [...prev, snapshot])
          })
        }
      },
    }
  }

  const fc = makeCRUD(fcRef, setFlujoCaja, guardarFlujoCajaItem, eliminarFlujoCajaItem,
    'Flujo', (i) => i.nombre)
  const fk = makeCRUD(fkRef, setFlujosCapital, guardarFlujoCapital, eliminarFlujoCapital,
    'Flujo de capital', (f) => `${f.tipo === 'aporte' ? 'Aporte' : 'Retiro'} ${f.moneda} ${f.monto}`)
  const rend = makeCRUD(rendRef, setRendimientos, guardarRendimiento, eliminarRendimiento,
    'Rendimiento', (r) => r.instrumentoNombre)
  const rec = makeCRUD(recRef, setRecibos, guardarRecibo, eliminarRecibo,
    'Recibo', (r) => r.fecha)
  const deu = makeCRUD(deuRef, setDeudas, guardarDeuda, eliminarDeuda,
    'Deuda', (d) => `${d.deudor} — ${d.concepto}`)
  const not = makeCRUD(notRef, setNotas, guardarNota, eliminarNota,
    'Nota', (n) => n.titulo)

  // --- Suscripciones (con cascade a FlujoCaja) ---
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

  const sus = {
    agregar: async (data: Omitido<Suscripcion>) => {
      const s: Suscripcion = { ...data, id: uuid(), creadoEn: ahora(), actualizadoEn: ahora() }
      const fcItem: FlujoCajaItem = { ...susToFlujoData(s, s.id), id: uuid(), creadoEn: ahora(), actualizadoEn: ahora() }
      await guardarFlujoCajaItem(fcItem)
      setFlujoCaja(prev => [...prev, fcItem])
      const susConLink: Suscripcion = { ...s, flujoCajaItemId: fcItem.id }
      await guardarSuscripcion(susConLink)
      setSuscripciones(prev => [...prev, susConLink])
      showUndo(`Suscripción "${susConLink.nombre}" creada`, async () => {
        await eliminarFlujoCajaItem(fcItem.id)
        setFlujoCaja(prev => prev.filter(x => x.id !== fcItem.id))
        await eliminarSuscripcion(susConLink.id)
        setSuscripciones(prev => prev.filter(x => x.id !== susConLink.id))
      })
    },
    actualizar: async (s: Suscripcion) => {
      const anterior = susRef.current.find(x => x.id === s.id)
      const anteriorFc = anterior?.flujoCajaItemId ? fcRef.current.find(x => x.id === anterior.flujoCajaItemId) : undefined
      const updated: Suscripcion = { ...s, actualizadoEn: ahora() }
      await guardarSuscripcion(updated)
      setSuscripciones(prev => prev.map(x => x.id === updated.id ? updated : x))
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
      if (anterior) {
        showUndo(`Suscripción "${updated.nombre}" actualizada`, async () => {
          await guardarSuscripcion(anterior)
          setSuscripciones(prev => prev.map(x => x.id === anterior.id ? anterior : x))
          if (anteriorFc) {
            await guardarFlujoCajaItem(anteriorFc)
            setFlujoCaja(prev => prev.map(x => x.id === anteriorFc.id ? anteriorFc : x))
          }
        })
      }
    },
    borrar: async (id: string) => {
      const susSnapshot = susRef.current.find(x => x.id === id)
      const fcSnapshot = susSnapshot?.flujoCajaItemId ? fcRef.current.find(x => x.id === susSnapshot.flujoCajaItemId) : undefined
      if (susSnapshot?.flujoCajaItemId) {
        await eliminarFlujoCajaItem(susSnapshot.flujoCajaItemId)
        setFlujoCaja(prev => prev.filter(x => x.id !== susSnapshot.flujoCajaItemId))
      }
      await eliminarSuscripcion(id)
      setSuscripciones(prev => prev.filter(x => x.id !== id))
      if (susSnapshot) {
        showUndo(`Suscripción "${susSnapshot.nombre}" eliminada`, async () => {
          if (fcSnapshot) {
            await guardarFlujoCajaItem(fcSnapshot)
            setFlujoCaja(prev => [...prev, fcSnapshot])
          }
          await guardarSuscripcion(susSnapshot)
          setSuscripciones(prev => [...prev, susSnapshot])
        })
      }
    },
  }

  // --- Gastos Familia (con cascade a FlujoCaja) ---
  function gfToFlujoData(g: GastoFamilia, gastoFamiliaId: string): Omitido<FlujoCajaItem> {
    const mensual = g.periodicidad === 'Mensual' ? (g.montoPEN ?? 0) : (g.montoPEN ?? 0) / 12
    const mensualUSD = g.periodicidad === 'Mensual' ? (g.montoUSD ?? 0) : (g.montoUSD ?? 0) / 12
    return {
      nombre: `${g.beneficiario} — ${g.descripcion}`,
      tipo: 'Expense',
      categoria: 'Gastos Familia',
      montoPEN: g.montoPEN != null ? mensual : undefined,
      montoUSD: g.montoUSD != null ? mensualUSD : undefined,
      activo: g.activo,
      orden: 998,
      gastoFamiliaId,
    }
  }

  const gf = {
    agregar: async (data: Omitido<GastoFamilia>) => {
      const g: GastoFamilia = { ...data, id: uuid(), creadoEn: ahora(), actualizadoEn: ahora() }
      const fcItem: FlujoCajaItem = { ...gfToFlujoData(g, g.id), id: uuid(), creadoEn: ahora(), actualizadoEn: ahora() }
      await guardarFlujoCajaItem(fcItem)
      setFlujoCaja(prev => [...prev, fcItem])
      const gConLink: GastoFamilia = { ...g, flujoCajaItemId: fcItem.id }
      await guardarGastoFamilia(gConLink)
      setGastosFamilia(prev => [...prev, gConLink])
      showUndo(`Gasto "${gConLink.descripcion}" creado`, async () => {
        await eliminarFlujoCajaItem(fcItem.id)
        setFlujoCaja(prev => prev.filter(x => x.id !== fcItem.id))
        await eliminarGastoFamilia(gConLink.id)
        setGastosFamilia(prev => prev.filter(x => x.id !== gConLink.id))
      })
    },
    actualizar: async (g: GastoFamilia) => {
      const anterior = gfRef.current.find(x => x.id === g.id)
      const anteriorFc = anterior?.flujoCajaItemId ? fcRef.current.find(x => x.id === anterior.flujoCajaItemId) : undefined
      const updated: GastoFamilia = { ...g, actualizadoEn: ahora() }
      await guardarGastoFamilia(updated)
      setGastosFamilia(prev => prev.map(x => x.id === updated.id ? updated : x))
      if (updated.flujoCajaItemId) {
        const fcUpdated: FlujoCajaItem = {
          ...gfToFlujoData(updated, updated.id),
          id: updated.flujoCajaItemId,
          creadoEn: ahora(),
          actualizadoEn: ahora(),
        }
        await guardarFlujoCajaItem(fcUpdated)
        setFlujoCaja(prev => prev.map(x => x.id === fcUpdated.id ? fcUpdated : x))
      }
      if (anterior) {
        showUndo(`Gasto "${updated.descripcion}" actualizado`, async () => {
          await guardarGastoFamilia(anterior)
          setGastosFamilia(prev => prev.map(x => x.id === anterior.id ? anterior : x))
          if (anteriorFc) {
            await guardarFlujoCajaItem(anteriorFc)
            setFlujoCaja(prev => prev.map(x => x.id === anteriorFc.id ? anteriorFc : x))
          }
        })
      }
    },
    borrar: async (id: string) => {
      const gSnapshot = gfRef.current.find(x => x.id === id)
      const fcSnapshot = gSnapshot?.flujoCajaItemId ? fcRef.current.find(x => x.id === gSnapshot.flujoCajaItemId) : undefined
      if (gSnapshot?.flujoCajaItemId) {
        await eliminarFlujoCajaItem(gSnapshot.flujoCajaItemId)
        setFlujoCaja(prev => prev.filter(x => x.id !== gSnapshot.flujoCajaItemId))
      }
      await eliminarGastoFamilia(id)
      setGastosFamilia(prev => prev.filter(x => x.id !== id))
      if (gSnapshot) {
        showUndo(`Gasto "${gSnapshot.descripcion}" eliminado`, async () => {
          if (fcSnapshot) {
            await guardarFlujoCajaItem(fcSnapshot)
            setFlujoCaja(prev => [...prev, fcSnapshot])
          }
          await guardarGastoFamilia(gSnapshot)
          setGastosFamilia(prev => [...prev, gSnapshot])
        })
      }
    },
  }

  return (
    <Ctx.Provider value={{
      loading, flujoCaja, rendimientos, recibos, suscripciones, gastosFamilia, deudas, notas, flujosCapital,
      agregarFlujoCapital: fk.agregar, actualizarFlujoCapital: fk.actualizar, borrarFlujoCapital: fk.borrar,
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
