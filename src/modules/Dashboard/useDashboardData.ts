import { useMemo } from 'react'
import { usePatrimony } from '../../data/PatrimonyContext'
import { useFinanceData } from '../../data/FinanceDataContext'
import { useScenario } from '../../data/ScenarioContext'
import { useConfig } from '../../config/ConfigContext'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import { useIsMobile } from '../../hooks/useIsMobile'
import { CAT_COLORES, CAT_LABELS, FALLBACK_COLOR, vencOrden } from './tiles/shared'

// Todo el cómputo del Dashboard en un solo lugar. Los tiles reciben este objeto
// por prop y son puramente presentacionales. Extraído de Dashboard.tsx sin cambios
// de lógica (Etapa 2 — paridad visual).

export function useDashboardData() {
  const { cuentas, historial } = usePatrimony()
  const { flujoCaja, suscripciones, rendimientos } = useFinanceData()
  const { escenarioActivo, resultadoActivo } = useScenario()
  const { acento, config } = useConfig()
  const { tc } = useTipoCambio()
  const isMobile = useIsMobile()
  const tcCompra = tc?.compra ?? 3.7

  // ── Patrimonio ──
  const { patrimonioNeto, composicionDonut } = useMemo(() => {
    let neto = 0
    const grupos: Record<string, number> = {}
    for (const c of cuentas) {
      const val = (c.montoPEN ?? 0) + (c.montoUSD ?? 0) * tcCompra
      grupos[c.categoria] = (grupos[c.categoria] ?? 0) + val
      if (c.categoria === 'Liability') neto -= val; else neto += val
    }
    const donut = Object.entries(grupos)
      .filter(([, v]) => v > 0)
      .map(([cat, valor]) => ({ cat, valor, color: CAT_COLORES[cat] ?? FALLBACK_COLOR, label: CAT_LABELS[cat] ?? cat }))
      .sort((a, b) => b.valor - a.valor)
    return { patrimonioNeto: neto, composicionDonut: donut }
  }, [cuentas, tcCompra])

  // ── Flujo ──
  const { ingresosMensuales, egresosMensuales, flujoNeto, tasaAhorro } = useMemo(() => {
    let ing = 0, egr = 0
    for (const item of flujoCaja) {
      if (!item.activo) continue
      const val = (item.montoPEN ?? 0) + (item.montoUSD ?? 0) * tcCompra
      if (item.tipo === 'Income') ing += val; else egr += val
    }
    return { ingresosMensuales: ing, egresosMensuales: egr, flujoNeto: ing - egr, tasaAhorro: ing > 0 ? ((ing - egr) / ing) * 100 : 0 }
  }, [flujoCaja, tcCompra])

  // ── Fondo emergencia ──
  const fondoEmergencia = useMemo(() => {
    const efectivo = cuentas.filter(c => c.categoria === 'Savings')
      .reduce((s, c) => s + (c.montoPEN ?? 0) + (c.montoUSD ?? 0) * tcCompra, 0)
    return { efectivo, meses: egresosMensuales > 0 ? efectivo / egresosMensuales : 0 }
  }, [cuentas, egresosMensuales, tcCompra])

  // ── Historial chart + cambios ──
  const historialChart = useMemo(() =>
    [...historial]
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(-6)
      .map(h => {
        const tc = h.tipoCambio || tcCompra
        return {
          periodo: h.periodo.replace(' - ', '/'),
          pen: Math.round(h.totalPEN),
          usd: Math.round(h.totalUSD * tc),
          total: Math.round(h.totalPEN + h.totalUSD * tc),
        }
      })
  , [historial, tcCompra])

  const { cambioMes, cambioAnio } = useMemo(() => {
    const sorted = [...historial].sort((a, b) => a.fecha.localeCompare(b.fecha))
    if (sorted.length === 0) return { cambioMes: null, cambioAnio: null }
    const toVal = (h: typeof sorted[0]) => h.totalPEN + h.totalUSD * (h.tipoCambio || tcCompra)
    const current = toVal(sorted[sorted.length - 1])
    const mes = sorted.length >= 2
      ? (() => { const prev = toVal(sorted[sorted.length - 2]); return prev > 0 ? ((current - prev) / prev) * 100 : null })()
      : null
    // Entrada más cercana a hace 12 meses
    const target = Date.now() - 365 * 86_400_000
    const entry12m = sorted.length > 1
      ? sorted.slice(0, -1).reduce((best, h) =>
          Math.abs(new Date(h.fecha).getTime() - target) < Math.abs(new Date(best.fecha).getTime() - target) ? h : best
        )
      : null
    const anio = entry12m ? (() => { const v = toVal(entry12m); return v > 0 ? ((current - v) / v) * 100 : null })() : null
    return { cambioMes: mes, cambioAnio: anio }
  }, [historial, tcCompra])

  // ── Proyección escenario ──
  const { proyeccion, proyeccionChart, hitos } = useMemo(() => {
    if (!escenarioActivo || !resultadoActivo) return { proyeccion: null, proyeccionChart: [], hitos: [] }
    const edadRetiro = escenarioActivo.general.edadRetiro
    const anioRetiro = resultadoActivo.anios.find(a => a.edad === edadRetiro)

    // Muestrear puntos para no sobrecargar el chart (cada 2 años)
    const chart = resultadoActivo.anios
      .filter((_, i) => i % 2 === 0 || _.edad === edadRetiro || _.edad === escenarioActivo.general.edadActual)
      .map(a => ({ edad: a.edad, total: Math.round(a.total) }))

    // Hitos: metas alcanzadas + retiro
    const hitosData: { label: string; edad: number; capital: number; color: string }[] = []
    for (const [nombre, edad] of Object.entries(resultadoActivo.metasAlcanzadas)) {
      if (edad != null) {
        const anio = resultadoActivo.anios.find(a => a.edad === edad)
        hitosData.push({ label: nombre, edad, capital: anio?.total ?? 0, color: acento })
      }
    }
    if (anioRetiro) hitosData.push({ label: 'Retiro', edad: edadRetiro, capital: anioRetiro.total, color: '#E24C4C' })
    hitosData.sort((a, b) => a.edad - b.edad)

    return {
      proyeccion: {
        edadRetiro, capital: anioRetiro?.total ?? 0,
        ingresoMensual: anioRetiro?.ingresoMensual ?? 0,
        aniosRestantes: edadRetiro - escenarioActivo.general.edadActual,
        edadActual: escenarioActivo.general.edadActual,
        nombre: escenarioActivo.nombre,
      },
      proyeccionChart: chart,
      hitos: hitosData.slice(0, 3),
    }
  }, [escenarioActivo, resultadoActivo, acento])

  // ── Rendimientos YTD ──
  const { rendimientosYTD, gananciaTotalPEN, rentabilidadProm, rendPorInstrumento } = useMemo(() => {
    const anio = new Date().getFullYear()
    const ytd = rendimientos.filter(r => r.anio === anio)
    const ganTotal = ytd.reduce((s, r) => s + (r.gananciasPEN ?? 0) + (r.gananciasUSD ?? 0) * tcCompra, 0)
    const rents = ytd.filter(r => r.rentabilidad != null).map(r => r.rentabilidad!)
    const rentProm = rents.length > 0 ? rents.reduce((s, r) => s + r, 0) / rents.length : 0
    const map = new Map<string, number>()
    for (const r of ytd) {
      const gan = (r.gananciasPEN ?? 0) + (r.gananciasUSD ?? 0) * tcCompra
      map.set(r.instrumentoNombre, (map.get(r.instrumentoNombre) ?? 0) + gan)
    }
    const porInstrumento = [...map.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3).map(([nombre, ganancia]) => ({ nombre, ganancia }))
    return { rendimientosYTD: ytd, gananciaTotalPEN: ganTotal, rentabilidadProm: rentProm, rendPorInstrumento: porInstrumento }
  }, [rendimientos, tcCompra])

  // ── Suscripciones y cuentas ──
  const suscripcionesActivas = useMemo(() =>
    suscripciones.filter(s => s.activa).sort((a, b) => vencOrden(a.vencimiento) - vencOrden(b.vencimiento)).slice(0, 9)
  , [suscripciones])

  const cuentasTop = useMemo(() => {
    const conValor = [...cuentas]
      .filter(c => c.categoria !== 'Liability')
      .map(c => ({ ...c, valPEN: (c.montoPEN ?? 0) + (c.montoUSD ?? 0) * tcCompra }))
    const pinned = conValor.filter(c => c.pinned).slice(0, 5)
    if (pinned.length > 0) return pinned
    return conValor.sort((a, b) => b.valPEN - a.valPEN).slice(0, 5)
  }, [cuentas, tcCompra])

  // ── Barra estado: falta historial ──
  const faltaHistorial = useMemo(() => {
    const now = new Date()
    const day = now.getDate()
    let year = now.getFullYear()
    let month = now.getMonth() + 1
    if (day <= 10) { month -= 1; if (month === 0) { month = 12; year -= 1 } }
    return !historial.some(h => {
      const d = new Date(h.fecha)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
  }, [historial])

  // ── Barra estado: score de salud ──
  const scoreSalud = useMemo(() => {
    let s = 0
    if (fondoEmergencia.meses >= 6) s += 30; else if (fondoEmergencia.meses >= 3) s += 15
    if (tasaAhorro >= 20) s += 30; else if (tasaAhorro >= 10) s += 15
    if (cambioMes !== null) { if (cambioMes > 0) s += 20; else if (cambioMes === 0) s += 10 }
    const vencidas = suscripciones.filter(x => x.activa && x.vencimiento && new Date(x.vencimiento) < new Date()).length
    s += Math.max(0, 20 - vencidas * 5)
    return Math.min(s, 100)
  }, [fondoEmergencia, tasaAhorro, cambioMes, suscripciones])

  // ── Barra estado: próximo vencimiento ──
  const proxVencimiento = useMemo(() =>
    suscripciones.filter(s => s.activa && s.vencimiento).sort((a, b) => vencOrden(a.vencimiento) - vencOrden(b.vencimiento))[0] ?? null
  , [suscripciones])

  // ── Derivados de presentación ──
  const fondoColor = fondoEmergencia.meses >= 6 ? '#00C9A7' : fondoEmergencia.meses >= 3 ? '#F5A623' : '#E24C4C'
  const ahorroColor = tasaAhorro >= 20 ? '#00C9A7' : tasaAhorro >= 10 ? '#F5A623' : '#E24C4C'
  const baseDonut = composicionDonut.filter(x => x.cat !== 'Liability').reduce((s, x) => s + x.valor, 0)
  const isEmpty = cuentas.length === 0 && flujoCaja.length === 0

  return {
    config, acento, tc, tcCompra, isMobile, isEmpty,
    patrimonioNeto, composicionDonut, baseDonut,
    ingresosMensuales, egresosMensuales, flujoNeto, tasaAhorro,
    fondoEmergencia, fondoColor, ahorroColor,
    historialChart, cambioMes, cambioAnio,
    proyeccion, proyeccionChart, hitos,
    rendimientosYTD, gananciaTotalPEN, rentabilidadProm, rendPorInstrumento,
    suscripcionesActivas, cuentasTop,
    faltaHistorial, scoreSalud, proxVencimiento,
  }
}

export type DashboardData = ReturnType<typeof useDashboardData>
