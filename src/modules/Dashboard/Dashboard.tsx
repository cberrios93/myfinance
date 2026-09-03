import { useMemo, useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { usePatrimony } from '../../data/PatrimonyContext'
import { useFinanceData } from '../../data/FinanceDataContext'
import { useScenario } from '../../data/ScenarioContext'
import { useConfig } from '../../config/ConfigContext'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import { formatAbrev } from '../../lib/formatMonto'

const CAT_COLORES: Record<string, string> = {
  'Savings': '#3B82F6',
  'Investment (Stock Exchange)': '#8B5CF6',
  'Investment (Fintech)': '#F59E0B',
  'Investment (Business)': '#10B981',
  'Asset': '#6B7280',
  'Liability': '#EF4444',
}
const CAT_LABELS: Record<string, string> = {
  'Savings': 'Ahorros',
  'Investment (Stock Exchange)': 'ETFs / Bolsa',
  'Investment (Fintech)': 'Fintech',
  'Investment (Business)': 'Negocios',
  'Asset': 'Activos',
  'Liability': 'Pasivos',
}
const FALLBACK_COLOR = '#64748B'

function fmtPct(n: number) { return `${n.toFixed(1)}%` }
function fmtVenc(iso?: string) {
  if (!iso) return '—'
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return 'Vencida'
  if (diff === 0) return 'Hoy'
  if (diff <= 7) return `${diff}d`
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}
function vencOrden(iso?: string) { return iso ? new Date(iso).getTime() : 9999999999999 }

const CARD: React.CSSProperties = { background: 'var(--color-card)', border: '1px solid var(--color-borde)', borderRadius: 12 }
const INNER: React.CSSProperties = { background: 'var(--color-fondo)', border: '1px solid var(--color-borde)', borderRadius: 8 }
const LABEL: React.CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 8 }

export default function Dashboard() {
  const { cuentas, historial } = usePatrimony()
  const { flujoCaja, suscripciones, rendimientos } = useFinanceData()
  const { escenarioActivo, resultadoActivo } = useScenario()
  const { acento, config } = useConfig()
  const { tc } = useTipoCambio()
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
    if (anioRetiro) hitosData.push({ label: 'Retiro', edad: edadRetiro, capital: anioRetiro.total, color: '#EF4444' })
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

  if (cuentas.length === 0 && flujoCaja.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
        <div className="text-4xl">📊</div>
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-texto)' }}>Sin datos aún</h2>
        <p className="text-sm max-w-xs" style={{ color: 'var(--color-muted)' }}>
          Agrega cuentas en Patrimonio y ítems en Flujo de Caja para ver tu resumen aquí.
        </p>
      </div>
    )
  }

  const fondoColor = fondoEmergencia.meses >= 6 ? '#22C55E' : fondoEmergencia.meses >= 3 ? '#F59E0B' : '#EF4444'
  const ahorroColor = tasaAhorro >= 20 ? '#22C55E' : tasaAhorro >= 10 ? '#F59E0B' : '#EF4444'
  const baseDonut = composicionDonut.filter(x => x.cat !== 'Liability').reduce((s, x) => s + x.valor, 0)


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, height: '100%', minHeight: 0 }}>

      {/* ── Fila 1: 5 KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, flexShrink: 0 }}>
        <Kpi label="Patrimonio neto" value={formatAbrev(patrimonioNeto, config)}
          sub={cambioMes !== null ? (
            <>
              <span style={{ color: cambioMes >= 0 ? '#22C55E' : '#EF4444' }}>{cambioMes >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(cambioMes))} mes</span>
              {cambioAnio !== null && (
                <> · <span style={{ color: cambioAnio >= 0 ? '#22C55E' : '#EF4444' }}>{cambioAnio >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(cambioAnio))} año</span></>
              )}
            </>
          ) : `TC S/${tcCompra.toFixed(2)}`}
        />
        <Kpi label="Flujo neto / mes" value={formatAbrev(flujoNeto, config)} valueColor={flujoNeto >= 0 ? '#22C55E' : '#EF4444'}
          sub={`Ing. ${formatAbrev(ingresosMensuales, config)} · Egr. ${formatAbrev(egresosMensuales, config)}`} />
        <Kpi label="Tasa de ahorro" value={fmtPct(tasaAhorro)} valueColor={ahorroColor}
          sub={<span style={{ color: ahorroColor }}>{tasaAhorro >= 20 ? 'Sobre objetivo' : tasaAhorro >= 10 ? 'Bajo objetivo' : 'Crítico'}</span>} />
        <Kpi label="Fondo emergencia"
          value={`${fondoEmergencia.meses.toFixed(1)} meses`}
          valueColor={fondoColor}
          sub={<span style={{ color: fondoColor }}>{formatAbrev(fondoEmergencia.efectivo, config)} en Savings</span>} />
        {proyeccion
          ? <Kpi label={`Retiro a los ${proyeccion.edadRetiro} años`} value={formatAbrev(proyeccion.capital, config)} valueColor={acento}
              sub={`${formatAbrev(proyeccion.ingresoMensual, config)}/mes · Faltan ${proyeccion.aniosRestantes} años`} />
          : <Kpi label="Proyección retiro" value="—" sub="Sin escenario activo" />}
      </div>

      {/* ── Filas 2 y 3: grid 3×2 compartido — crece para llenar el espacio disponible ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: '1.1fr 1fr', gap: 10, flex: 1, minHeight: 0 }}>

        {/* Evolución real */}
        <div style={{ ...CARD, padding: '12px 14px 8px', display: 'flex', flexDirection: 'column' }}>
          <p style={LABEL}>Evolución del patrimonio</p>
          {historialChart.length >= 2 ? (
            <ResponsiveContainer width="100%" style={{ flex: 1, minHeight: 0 }}>
              <LineChart data={historialChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
                <XAxis dataKey="periodo" tick={{ fill: 'var(--color-muted)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickFormatter={v => formatAbrev(v, config)} width={36} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', borderRadius: 8, color: 'var(--color-texto)', fontSize: 11 }}
                  formatter={(v, name) => [formatAbrev(v as number, config), name === 'total' ? 'Total' : name === 'pen' ? 'S/ directo' : 'USD en S/']}
                />
                <Legend wrapperStyle={{ fontSize: 10, color: 'var(--color-muted)', paddingTop: 2 }}
                  formatter={(v: string) => v === 'total' ? 'Total' : v === 'pen' ? 'S/ directo' : 'USD en S/'} />
                <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="pen" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="4 2" dot={false} activeDot={{ r: 3 }} />
                <Line type="monotone" dataKey="usd" stroke="#22C55E" strokeWidth={1.5} strokeDasharray="4 2" dot={false} activeDot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 11, color: 'var(--color-muted)', textAlign: 'center' }}>
              Registra al menos 2 meses en Historial para ver la evolución
            </div>
          )}
        </div>

        {/* Proyección escenario */}
        <div style={{ ...CARD, padding: '12px 14px 8px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ ...LABEL, marginBottom: 0 }}>Proyección · escenario activo</p>
            {proyeccion && (
              <span style={{ fontSize: 10, color: acento, background: `${acento}18`, padding: '2px 7px', borderRadius: 4, fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {proyeccion.nombre}
              </span>
            )}
          </div>
          {proyeccionChart.length > 0 && proyeccion ? (
            <>
              <ResponsiveContainer width="100%" style={{ flex: 1, minHeight: 0 }}>
                <AreaChart data={proyeccionChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
                  <XAxis dataKey="edad" tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
                    tickFormatter={v => `${v}`} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickFormatter={v => formatAbrev(v, config)} width={36} />
                  <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', borderRadius: 8, color: 'var(--color-texto)', fontSize: 11 }}
                    formatter={(v) => [formatAbrev(v as number, config), 'Capital']}
                    labelFormatter={l => `Edad: ${l}`} />
                  {/* Posición actual */}
                  <ReferenceLine x={proyeccion.edadActual} stroke="var(--color-muted)" strokeDasharray="3 3" strokeWidth={1.5}
                    label={{ value: `Hoy (${proyeccion.edadActual}a)`, fill: 'var(--color-muted)', fontSize: 9, position: 'top' }} />
                  {/* Hitos de metas — solo los que no son Retiro */}
                  {hitos.filter(h => h.label !== 'Retiro').map(h => (
                    <ReferenceLine key={h.label} x={h.edad} stroke={acento} strokeDasharray="4 2" strokeWidth={1}
                      label={{ value: `${h.label.slice(0, 8)} (${h.edad}a)`, fill: acento, fontSize: 9, position: 'insideTopLeft' }} />
                  ))}
                  {/* Retiro */}
                  <ReferenceLine x={proyeccion.edadRetiro} stroke="#EF4444" strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: `Retiro (${proyeccion.edadRetiro}a)`, fill: '#EF4444', fontSize: 9, position: 'top' }} />
                  <Area type="monotone" dataKey="total" stroke="#22C55E" strokeWidth={2} fill="url(#gradProj)"
                    dot={false} activeDot={{ r: 4, fill: '#22C55E' }} />
                </AreaChart>
              </ResponsiveContainer>
              {/* Hitos compactos */}
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {hitos.map(h => (
                  <div key={h.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--color-muted)' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: h.color, flexShrink: 0 }} />
                    <span style={{ color: h.color, fontWeight: 600 }}>{h.edad}a</span>
                    <span>{formatAbrev(h.capital, config)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 11, color: 'var(--color-muted)', textAlign: 'center' }}>
              Activa un escenario en Simulación para ver la proyección
            </div>
          )}
        </div>

        {/* Composición — barra horizontal tipo Mac storage */}
        <ComposicionBar donut={composicionDonut} base={baseDonut} />

      {/* ── Fila 3: Suscripciones + Cuentas + Rendimientos YTD (mismo grid) ── */}

        {/* Suscripciones */}
        <div style={{ ...CARD, padding: '12px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <p style={LABEL}>Suscripciones activas</p>
          {suscripcionesActivas.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, flex: 1, alignContent: 'start' }}>
              {suscripcionesActivas.map(s => {
                const mensual = s.periodicidad === 'Mensual' ? s.montoTotal : s.montoTotal / 12
                const dias = s.vencimiento ? Math.ceil((new Date(s.vencimiento).getTime() - Date.now()) / 86_400_000) : null
                const urgente = dias !== null && dias <= 7
                return (
                  <div key={s.id} style={{ ...INNER, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, background: urgente ? '#F59E0B22' : 'var(--color-borde)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: urgente ? '#F59E0B' : 'var(--color-muted)', flexShrink: 0 }}>
                        {s.nombre[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.nombre}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, color: urgente ? '#F59E0B' : 'var(--color-muted)' }}>
                        {dias !== null ? fmtVenc(s.vencimiento) : s.periodicidad}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', fontVariantNumeric: 'tabular-nums' }}>
                        {s.moneda === 'PEN' ? 'S/' : '$'}{mensual.toFixed(0)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 12, color: 'var(--color-muted)' }}>Sin suscripciones activas</div>
          )}
        </div>

        {/* Cuentas */}
        <div style={{ ...CARD, padding: '12px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <p style={LABEL}>
            {cuentasTop.some(c => c.pinned) ? 'Cuentas destacadas' : 'Cuentas principales'}
          </p>
          {cuentasTop.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cuentasTop.map(c => {
                const pct = patrimonioNeto > 0 ? (c.valPEN / patrimonioNeto) * 100 : 0
                const color = CAT_COLORES[c.categoria] ?? FALLBACK_COLOR
                return (
                  <div key={c.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                        <div style={{ width: 3, height: 12, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--color-texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-texto)', fontVariantNumeric: 'tabular-nums', marginLeft: 8, flexShrink: 0 }}>
                        {c.montoUSD != null && c.montoPEN == null ? `$${c.montoUSD.toLocaleString('es-PE', { maximumFractionDigits: 0 })}` : formatAbrev(c.valPEN, config)}
                      </span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'var(--color-borde)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(pct, 100)}%`, background: color, opacity: 0.65 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 12, color: 'var(--color-muted)' }}>Sin cuentas en Patrimonio</div>
          )}
        </div>

        {/* Rendimientos YTD */}
        <div style={{ ...CARD, padding: '12px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ ...LABEL, marginBottom: 0 }}>Rendimientos {new Date().getFullYear()}</p>
            {rendimientosYTD.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: gananciaTotalPEN >= 0 ? '#22C55E' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
                {gananciaTotalPEN >= 0 ? '+' : ''}{formatAbrev(gananciaTotalPEN, config)}
              </span>
            )}
          </div>
          {rendimientosYTD.length > 0 ? (
            <>
              {rentabilidadProm !== 0 && (
                <p style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 8 }}>
                  Rentabilidad prom.{' '}
                  <span style={{ color: rentabilidadProm >= 0 ? '#22C55E' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
                    {rentabilidadProm >= 0 ? '+' : ''}{fmtPct(rentabilidadProm)}
                  </span>
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rendPorInstrumento.map(r => (
                  <div key={r.nombre} style={{ ...INNER, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.nombre}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: r.ganancia >= 0 ? '#22C55E' : '#EF4444', fontVariantNumeric: 'tabular-nums', marginLeft: 8, flexShrink: 0 }}>
                      {r.ganancia >= 0 ? '+' : ''}{formatAbrev(r.ganancia, config)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 12, color: 'var(--color-muted)', textAlign: 'center' }}>
              Sin rendimientos registrados este año
            </div>
          )}
        </div>

      </div>

      {/* ── Barra de estado: 4 chips ── */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'stretch' }}>

        {/* TC live */}
        <div style={{ ...CARD, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>TC Rextie</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-texto)', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: '#22C55E' }}>C </span>S/{(tc?.compra ?? 3.70).toFixed(3)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-texto)', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: '#EF4444' }}>V </span>S/{(tc?.venta ?? 3.75).toFixed(3)}
          </span>
        </div>

        {/* Próximo vencimiento */}
        {(() => {
          const prox = suscripciones.filter(s => s.activa && s.vencimiento).sort((a, b) => vencOrden(a.vencimiento) - vencOrden(b.vencimiento))[0]
          const dias = prox ? Math.ceil((new Date(prox.vencimiento!).getTime() - Date.now()) / 86_400_000) : null
          const color = dias !== null ? (dias <= 3 ? '#EF4444' : dias <= 7 ? '#F59E0B' : '#22C55E') : 'var(--color-muted)'
          return (
            <div style={{ ...CARD, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>Próx. vencimiento</span>
              {prox ? (
                <>
                  <span style={{ fontSize: 12, color: 'var(--color-texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{prox.nombre}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {dias === 0 ? 'Hoy' : dias! < 0 ? 'Vencida' : `${dias}d`}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Sin vencimientos</span>
              )}
            </div>
          )
        })()}

        {/* Alerta historial */}
        <div style={{ ...CARD, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, flex: 1, borderColor: faltaHistorial ? '#F59E0B55' : undefined }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>Historial</span>
          {faltaHistorial ? (
            <>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#F59E0B', flex: 1 }}>Falta registrar este período</span>
            </>
          ) : (
            <>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#22C55E' }}>Al día</span>
            </>
          )}
        </div>

        {/* Score de salud financiera */}
        {(() => {
          const color = scoreSalud >= 80 ? '#22C55E' : scoreSalud >= 60 ? '#F59E0B' : '#EF4444'
          const label = scoreSalud >= 80 ? 'Excelente' : scoreSalud >= 60 ? 'Aceptable' : 'Mejorable'
          return (
            <div style={{ ...CARD, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>Salud financiera</span>
              <span style={{ fontSize: 18, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{scoreSalud}</span>
              <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--color-borde)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${scoreSalud}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}

type DonutEntry = { cat: string; valor: number; color: string; label: string }

function ComposicionBar({ donut, base }: { donut: DonutEntry[]; base: number }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const { config } = useConfig()
  return (
    <div style={{ ...CARD, padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
      <p style={LABEL}>Composición</p>
      {donut.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
          {/* Barra horizontal */}
          <div style={{ position: 'relative', height: 28, borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
            {donut.map((e, i) => {
              const pct = base > 0 ? (e.valor / base) * 100 : 0
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width: `${pct}%`,
                    background: e.color,
                    opacity: hovered === null || hovered === i ? 1 : 0.4,
                    transition: 'opacity 0.15s',
                    cursor: 'default',
                    position: 'relative',
                  }}
                >
                  {hovered === i && (
                    <div style={{
                      position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--color-card)', border: '1px solid var(--color-borde)',
                      borderRadius: 6, padding: '5px 9px', whiteSpace: 'nowrap', zIndex: 10,
                      fontSize: 11, color: 'var(--color-texto)', pointerEvents: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    }}>
                      <span style={{ fontWeight: 600, color: e.color }}>{e.label}</span>
                      <span style={{ color: 'var(--color-muted)', marginLeft: 6 }}>{pct.toFixed(1)}% · {formatAbrev(e.valor, config)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Leyenda en 2 columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 12px' }}>
            {donut.map((e, i) => {
              const pct = base > 0 ? (e.valor / base) * 100 : 0
              return (
                <div key={i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'default', opacity: hovered === null || hovered === i ? 1 : 0.4, transition: 'opacity 0.15s' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--color-texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{e.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{pct.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 11, color: 'var(--color-muted)', textAlign: 'center' }}>
          Agrega cuentas en Patrimonio
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, sub, valueColor }: {
  label: string
  value: string
  sub?: React.ReactNode
  valueColor?: string
}) {
  return (
    <div style={{ ...CARD, padding: '13px 16px' }}>
      <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 5, lineHeight: 1.3 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: valueColor ?? 'var(--color-texto)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      {sub != null && (
        <p style={{ fontSize: 11, marginTop: 5, lineHeight: 1.4, color: 'var(--color-muted)' }}>{sub}</p>
      )}
    </div>
  )
}
