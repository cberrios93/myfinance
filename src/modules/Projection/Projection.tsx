import { useMemo, useState } from 'react'
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { AlertTriangle, TrendingUp, Landmark, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useScenario } from '../../data/ScenarioContext'
import { usePatrimony } from '../../data/PatrimonyContext'
import { useFinanceData } from '../../data/FinanceDataContext'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import { simular } from '../../engine/calculator'
import type { Carrera, EventoVida } from '../../data/types'

// ── Helpers del motor ─────────────────────────────────────────────────────────

function computeAporteBase(carrera: Carrera, t: number): number {
  const saltos = carrera.saltos.filter(s => s.anioT <= t).sort((a, b) => b.anioT - a.anioT)
  if (saltos.length > 0) {
    const s = saltos[0]
    return s.nuevoAporteAnual * Math.pow(1 + carrera.crecimientoRealAnual, t - s.anioT)
  }
  return carrera.aporteAnualBase * Math.pow(1 + carrera.crecimientoRealAnual, t - 1)
}

function computeGastosRecAnuales(eventosVida: EventoVida[], t: number): number {
  let total = 0
  for (const ev of eventosVida) {
    if (ev.gastoRecurrente) {
      const { anioInicioT, anioFinT, montoMensual } = ev.gastoRecurrente
      if (t >= anioInicioT && t <= anioFinT) total += montoMensual * 12
    }
  }
  return total
}

function computeRetirosPuntuales(eventosVida: EventoVida[], t: number): number {
  return eventosVida
    .filter(ev => ev.retiroUnico && ev.retiroUnico.anioT === t)
    .reduce((s, ev) => s + ev.retiroUnico!.monto, 0)
}

// ── Formato ───────────────────────────────────────────────────────────────────

function fmtM(n: number) {
  if (n >= 1_000_000) return `S/${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `S/${(n / 1_000).toFixed(0)}k`
  return `S/${n.toFixed(0)}`
}

function fmtNum(n: number) {
  return n.toLocaleString('es-PE', { maximumFractionDigits: 0 })
}

// ── Tooltip personalizado ─────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 text-sm shadow-xl"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}>
      <p className="font-semibold mb-2">{label} años</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-6">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono">
            {p.dataKey === 'patrimonio'
              ? fmtM(p.value)
              : p.dataKey === 'pctComprometido'
                ? `${p.value.toFixed(1)}%`
                : `S/ ${fmtNum(p.value)}`}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Projection() {
  const { escenarioActivo } = useScenario()
  const { cuentas } = usePatrimony()
  const { recibos } = useFinanceData()
  const { tc: tcData } = useTipoCambio()
  const [tablaAbierta, setTablaAbierta] = useState(false)

  const tc = tcData?.venta ?? 3.80

  const mesAjuste = escenarioActivo?.general.mesAjusteSalarial ?? 4

  // Ingreso base: promedio de (sueldoBasico + comisiones) desde el último ajuste de compensación
  // El ciclo va desde [mes ajuste del año en curso o anterior] hasta hoy, máx 12 meses
  const sueldoBaseHaberes = useMemo(() => {
    if (!recibos.length) return 0
    const hoy = new Date()
    const anioActual = hoy.getFullYear()
    const mesActual = hoy.getMonth() + 1  // 1-12

    // Fecha de inicio del ciclo actual: si ya pasó el mes de ajuste este año, usar este año; si no, el anterior
    const anioInicioAjuste = mesActual >= mesAjuste ? anioActual : anioActual - 1
    const fechaInicioAjuste = `${anioInicioAjuste}-${String(mesAjuste).padStart(2, '0')}`

    const sorted = [...recibos].sort((a, b) => b.fecha.localeCompare(a.fecha))
    // Recibos desde el inicio del ciclo actual, sin gratificación, hasta 12 meses
    const delCiclo = sorted.filter(r => r.fecha >= fechaInicioAjuste && r.gratificacion === 0)
    const muestra = delCiclo.length > 0 ? delCiclo : sorted.filter(r => r.gratificacion === 0).slice(0, 12)
    if (!muestra.length) return 0
    const promedio = muestra.reduce((s, r) => s + r.sueldoBasico + r.comisionesAnioActual, 0) / muestra.length
    return Math.round(promedio)
  }, [recibos, mesAjuste])

  // Todos los useMemo deben ir antes de cualquier return condicional
  const resultado = useMemo(
    () => escenarioActivo ? simular(escenarioActivo) : null,
    [escenarioActivo]
  )

  const cuentasEnlazadas = useMemo(() => {
    return new Set(
      (escenarioActivo?.instrumentos ?? [])
        .map(i => i.cuentaPatrimonioId)
        .filter(Boolean) as string[]
    )
  }, [escenarioActivo?.instrumentos])

  const patrimonioNoInvertido = useMemo(() => {
    return cuentas
      .filter(c => !cuentasEnlazadas.has(c.id))
      .reduce((s, c) => s + (c.montoPEN ?? 0) + (c.montoUSD ?? 0) * tc, 0)
  }, [cuentas, cuentasEnlazadas, tc])

  const tasaNoInv = escenarioActivo?.general.tasaPatrimonioNoInvertido ?? 0.03

  const incrementoSalarial = escenarioActivo?.general.incrementoSalarialAnual ?? 0.03

  const rows = useMemo(() => {
    if (!resultado || !escenarioActivo) return []
    const { carrera, eventosVida } = escenarioActivo
    return resultado.anios.slice(1).map((anio, idx) => {
      const aporteBase = computeAporteBase(carrera, anio.anioT)
      const gastosRecAnuales = computeGastosRecAnuales(eventosVida, anio.anioT)
      const retirosPuntuales = computeRetirosPuntuales(eventosVida, anio.anioT)
      const aporteNeto = Math.max(aporteBase - gastosRecAnuales, 0)

      // Sueldo proyectado: sueldo base de haberes creciendo al incremento configurado
      const sueldoMensual = sueldoBaseHaberes > 0
        ? Math.round(sueldoBaseHaberes * Math.pow(1 + incrementoSalarial, idx + 1))
        : Math.round(aporteBase / 12)  // fallback: aporteBase si no hay recibos

      // Rendimiento del portafolio ese año = delta total - aporteNeto + retirosPuntuales
      const totalAnterior = resultado.anios[idx]?.total ?? 0  // anios[0] es año 0, slice(1) empieza en idx=0 → año 1
      const rendimientoAnual = Math.max(0, anio.total - totalAnterior - aporteNeto + retirosPuntuales)
      const rendimientoMensual = Math.round(rendimientoAnual / 12)

      // Total disponible = sueldo activo + rendimiento portafolio
      const totalDisponibleMensual = sueldoMensual + rendimientoMensual
      const gastosRecMensual = Math.round(gastosRecAnuales / 12)
      const pctComprometido = totalDisponibleMensual > 0 ? (gastosRecMensual / totalDisponibleMensual) * 100 : 0
      const flujoNegativo = gastosRecMensual > totalDisponibleMensual

      return {
        ...anio,
        aporteBase,
        aporteBaseMensual: Math.round(aporteBase / 12),
        sueldoMensual,
        rendimientoMensual,
        totalDisponibleMensual,
        gastosRecMensual,
        retirosPuntuales: Math.round(retirosPuntuales),
        aporteNetoMensual: Math.round(aporteNeto / 12),
        pctComprometido: Math.round(pctComprometido * 10) / 10,
        flujoNegativo,
      }
    })
  }, [resultado, escenarioActivo, sueldoBaseHaberes, incrementoSalarial])

  // Early return después de todos los hooks
  if (!escenarioActivo || !resultado) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--color-muted)' }}>
        <p>No hay escenario activo.</p>
      </div>
    )
  }

  const { general } = escenarioActivo
  const edadRetiro = general.edadRetiro

  // KPIs
  const patrimonioRetiroPortafolio = resultado.postRetiro?.capitalRetiro ?? 0
  const aniosHastaRetiro = rows.findIndex(r => r.edad === edadRetiro) + 1
  const noInvAlRetiro = Math.round(patrimonioNoInvertido * Math.pow(1 + tasaNoInv, aniosHastaRetiro > 0 ? aniosHastaRetiro : rows.length))
  const patrimonioRetiro = patrimonioRetiroPortafolio + noInvAlRetiro
  const retiroAnualSWR = resultado.postRetiro?.retiroAnualFijo ?? 0
  const agotadoEnEdad = resultado.postRetiro?.agotadoEnEdad
  const aniosSobrevivencia = resultado.postRetiro?.aniosSupervivencia ?? 0
  const aniosFlujoCritico = rows.filter(r => r.pctComprometido > 80 && !r.flujoNegativo).length
  const aniosFlujoNegativo = rows.filter(r => r.flujoNegativo).length

  // Datos para Chart 1: Patrimonio (portafolio invertido + no-invertido proyectado)
  const chartPatrimonio = rows.map((r, idx) => {
    const noInv = Math.round(patrimonioNoInvertido * Math.pow(1 + tasaNoInv, idx + 1))
    return {
      edad: r.edad,
      portafolio: Math.round(r.total),
      noInvertido: noInv,
      patrimonioTotal: Math.round(r.total) + noInv,
    }
  })

  // Datos para Chart 2: Ingreso total vs carga de eventos
  const chartFlujo = rows.map(r => ({
    edad: r.edad,
    sueldoActivo: r.sueldoMensual,
    rendimientoPortafolio: r.rendimientoMensual,
    cargaEventos: r.gastosRecMensual,
    pctComprometido: r.pctComprometido,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Proyección</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Crecimiento del patrimonio vs. carga de eventos de vida · Escenario: <strong>{escenarioActivo.nombre}</strong>
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Landmark size={14} style={{ color: 'var(--color-acento)' }} />
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Patrimonio al retiro</p>
          </div>
          <p className="text-xl font-bold font-mono" style={{ color: 'var(--color-acento)' }}>{fmtM(patrimonioRetiro)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
            {fmtM(patrimonioRetiroPortafolio)} inv. + {fmtM(noInvAlRetiro)} no inv.
          </p>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} style={{ color: '#10B981' }} />
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Renta pasiva al retiro</p>
          </div>
          <p className="text-xl font-bold font-mono" style={{ color: '#10B981' }}>S/ {fmtNum(Math.round(retiroAnualSWR / 12))}/mes</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>SWR {(general.swr * 100).toFixed(1)}% · S/ {fmtNum(Math.round(retiroAnualSWR))}/año</p>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} style={{ color: agotadoEnEdad ? '#E24C4C' : '#10B981' }} />
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Fondo post-retiro</p>
          </div>
          <p className="text-xl font-bold font-mono" style={{ color: agotadoEnEdad ? '#E24C4C' : '#10B981' }}>
            {agotadoEnEdad ? `Se agota a los ${agotadoEnEdad}a` : 'Sobrevive toda la vida'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{aniosSobrevivencia} años de supervivencia</p>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: `1px solid ${aniosFlujoNegativo > 0 ? '#E24C4C' : aniosFlujoCritico > 0 ? '#F59E0B' : 'var(--color-borde)'}` }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} style={{ color: aniosFlujoNegativo > 0 ? '#E24C4C' : aniosFlujoCritico > 0 ? '#F59E0B' : 'var(--color-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Años con flujo crítico</p>
          </div>
          <p className="text-xl font-bold font-mono" style={{ color: aniosFlujoNegativo > 0 ? '#E24C4C' : aniosFlujoCritico > 0 ? '#F59E0B' : 'var(--color-texto)' }}>
            {aniosFlujoNegativo > 0 ? `${aniosFlujoNegativo} negativo${aniosFlujoNegativo > 1 ? 's' : ''}` : aniosFlujoCritico > 0 ? `${aniosFlujoCritico} al límite` : 'Ninguno'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
            {aniosFlujoNegativo > 0 ? 'Eventos superan ingreso activo' : aniosFlujoCritico > 0 ? '+80% del ingreso comprometido' : 'Todos los años son sostenibles'}
          </p>
        </div>
      </div>

      {/* Chart 1: Patrimonio proyectado */}
      <div className="rounded-xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Patrimonio total proyectado</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              Portafolio invertido + patrimonio no enlazado a instrumentos (creciendo a {(tasaNoInv * 100).toFixed(1)}%/año)
            </p>
          </div>
          {patrimonioNoInvertido > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>No invertido detectado</p>
              <p className="text-sm font-mono font-semibold" style={{ color: '#10B981' }}>{fmtM(patrimonioNoInvertido)}</p>
            </div>
          )}
        </div>
        <div className="flex gap-4 text-xs mb-3">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 rounded" style={{ background: 'var(--color-acento)' }} /> Portafolio invertido</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 rounded" style={{ background: '#10B981' }} /> Patrimonio no invertido</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartPatrimonio} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
            <XAxis
              dataKey="edad"
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              tickFormatter={v => `${v}a`}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              tickFormatter={v => fmtM(v)}
              width={72}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine
              x={edadRetiro}
              stroke="var(--color-acento)"
              strokeDasharray="5 3"
              label={{ value: 'Retiro', position: 'top', fontSize: 10, fill: 'var(--color-acento)' }}
            />
            <Area
              type="monotone"
              dataKey="portafolio"
              name="Portafolio invertido"
              stroke="var(--color-acento)"
              fill="color-mix(in srgb, var(--color-acento) 25%, transparent)"
              strokeWidth={2}
              stackId="total"
            />
            <Area
              type="monotone"
              dataKey="noInvertido"
              name="No invertido"
              stroke="#10B981"
              fill="color-mix(in srgb, #10B981 20%, transparent)"
              strokeWidth={2}
              stackId="total"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Flujo activo vs carga eventos */}
      <div className="rounded-xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Ingreso total vs. carga de eventos</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              Sueldo + comisiones (de Haberes) + rendimiento portafolio · vs. eventos de vida mensuales
            </p>
          </div>
          {sueldoBaseHaberes > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Sueldo base detectado</p>
              <p className="text-sm font-mono font-semibold" style={{ color: '#10B981' }}>S/ {fmtNum(sueldoBaseHaberes)}/mes</p>
            </div>
          )}
        </div>
        <div className="flex gap-4 text-xs mb-3">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 rounded" style={{ background: '#10B981' }} /> Sueldo activo</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 rounded" style={{ background: 'var(--color-acento)' }} /> Rendimiento portafolio</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 rounded" style={{ background: '#F97316' }} /> Eventos/mes</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartFlujo} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
            <XAxis dataKey="edad" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} tickFormatter={v => `${v}a`} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted)' }} tickFormatter={v => `S/${(v / 1000).toFixed(0)}k`} width={64} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine x={edadRetiro} stroke="var(--color-acento)" strokeDasharray="5 3" />
            <Area type="monotone" dataKey="sueldoActivo" name="Sueldo activo/mes" stroke="#10B981"
              fill="color-mix(in srgb, #10B981 15%, transparent)" strokeWidth={2} stackId="ingreso" />
            <Area type="monotone" dataKey="rendimientoPortafolio" name="Rendimiento portafolio/mes" stroke="var(--color-acento)"
              fill="color-mix(in srgb, var(--color-acento) 15%, transparent)" strokeWidth={2} stackId="ingreso" />
            <Bar dataKey="cargaEventos" name="Eventos/mes" fill="#F97316" opacity={0.85} radius={[2, 2, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Panel post-retiro */}
      {resultado.postRetiro && (
        <div className="rounded-xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-texto)' }}>Fase post-retiro</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Capital al retiro</p>
              <p className="text-base font-bold font-mono" style={{ color: 'var(--color-texto)' }}>{fmtM(patrimonioRetiro)}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Retiro anual (SWR)</p>
              <p className="text-base font-bold font-mono" style={{ color: 'var(--color-texto)' }}>S/ {fmtNum(Math.round(retiroAnualSWR))}/año</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>= S/ {fmtNum(Math.round(retiroAnualSWR / 12))}/mes</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Supervivencia del fondo</p>
              <p className="text-base font-bold font-mono" style={{ color: agotadoEnEdad ? '#E24C4C' : '#10B981' }}>
                {aniosSobrevivencia} años
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                Hasta los {agotadoEnEdad ?? general.edadVidaEstimada} años
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Tasa real ponderada</p>
              <p className="text-base font-bold font-mono" style={{ color: 'var(--color-texto)' }}>
                {(resultado.postRetiro.tasaPromedioPonderada * 100).toFixed(2)}%
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>promedio del portafolio</p>
            </div>
          </div>

          {/* Mini-chart post-retiro */}
          {resultado.postRetiro.anios.length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-borde)' }}>
              <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>Capital disponible en retiro (S/)</p>
              <ResponsiveContainer width="100%" height={100}>
                <ComposedChart
                  data={resultado.postRetiro.anios.map(a => ({ edad: a.edad, capital: a.capital }))}
                  margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
                >
                  <XAxis dataKey="edad" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} tickFormatter={v => `${v}a`} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted)' }} tickFormatter={v => fmtM(v)} width={64} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="capital"
                    name="Capital"
                    stroke={agotadoEnEdad ? '#E24C4C' : '#10B981'}
                    fill={agotadoEnEdad ? 'color-mix(in srgb, #E24C4C 15%, transparent)' : 'color-mix(in srgb, #10B981 15%, transparent)'}
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Tabla año a año */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-borde)' }}>
        <button
          onClick={() => setTablaAbierta(p => !p)}
          className="w-full flex items-center justify-between px-5 py-4"
          style={{ background: 'var(--color-card)' }}
        >
          <div>
            <p className="text-sm font-semibold text-left" style={{ color: 'var(--color-texto)' }}>Tabla año a año</p>
            <p className="text-xs mt-0.5 text-left" style={{ color: 'var(--color-muted)' }}>
              Detalle completo de patrimonio, flujo y eventos por cada año del horizonte
            </p>
          </div>
          {tablaAbierta ? <ChevronUp size={16} style={{ color: 'var(--color-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-muted)' }} />}
        </button>

        {tablaAbierta && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-fondo)', borderBottom: '1px solid var(--color-borde)' }}>
                  {['Año', 'Edad', 'Patrimonio', 'Sueldo/mes', 'Rendimiento/mes', 'Total disp.', 'Eventos/mes', '% Comprometido', 'Retiros únicos'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-semibold" style={{ color: 'var(--color-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const alerta = r.flujoNegativo ? 'negativo' : r.pctComprometido > 80 ? 'critico' : 'ok'
                  const esRetiro = r.edad === edadRetiro
                  return (
                    <tr
                      key={r.anioT}
                      style={{
                        background: esRetiro
                          ? 'color-mix(in srgb, var(--color-acento) 8%, transparent)'
                          : alerta === 'negativo'
                            ? 'color-mix(in srgb, #E24C4C 6%, transparent)'
                            : alerta === 'critico'
                              ? 'color-mix(in srgb, #F59E0B 5%, transparent)'
                              : i % 2 === 0 ? 'var(--color-fondo)' : 'transparent',
                        borderBottom: '1px solid var(--color-borde)',
                      }}
                    >
                      <td className="px-4 py-2 font-mono" style={{ color: 'var(--color-muted)' }}>{r.anioCalendario}</td>
                      <td className="px-4 py-2 font-semibold" style={{ color: esRetiro ? 'var(--color-acento)' : 'var(--color-texto)' }}>
                        {r.edad}a {esRetiro ? '🎯' : ''}
                      </td>
                      <td className="px-4 py-2 font-mono font-semibold" style={{ color: 'var(--color-texto)' }}>{fmtM(r.total)}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: 'var(--color-texto)' }}>S/ {fmtNum(r.sueldoMensual)}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: 'var(--color-acento)' }}>S/ {fmtNum(r.rendimientoMensual)}</td>
                      <td className="px-4 py-2 font-mono font-semibold" style={{ color: 'var(--color-texto)' }}>S/ {fmtNum(r.totalDisponibleMensual)}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: r.gastosRecMensual > 0 ? '#F97316' : 'var(--color-muted)' }}>
                        {r.gastosRecMensual > 0 ? `S/ ${fmtNum(r.gastosRecMensual)}` : '—'}
                      </td>
                      <td className="px-4 py-2 font-mono font-semibold" style={{
                        color: alerta === 'negativo' ? '#E24C4C' : alerta === 'critico' ? '#F59E0B' : '#10B981'
                      }}>
                        {r.gastosRecMensual > 0 ? `${r.pctComprometido.toFixed(0)}%` : '—'}
                        {alerta === 'negativo' && ' ⚠️'}
                      </td>
                      <td className="px-4 py-2 font-mono" style={{ color: r.retirosPuntuales > 0 ? '#8B5CF6' : 'var(--color-muted)' }}>
                        {r.retirosPuntuales > 0 ? `S/ ${fmtNum(r.retirosPuntuales)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
