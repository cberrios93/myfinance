import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Flame, Target, Anchor, Zap } from 'lucide-react'
import { useScenario } from '../../data/ScenarioContext'
import { usePatrimony } from '../../data/PatrimonyContext'
import { useFinanceData } from '../../data/FinanceDataContext'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import { simular } from '../../engine/calculator'
import { FinancialTerm } from '../../components/common/FinancialTerm'

function fmtM(n: number) {
  if (n >= 1_000_000) return `S/ ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `S/ ${(n / 1_000).toFixed(0)}k`
  return `S/ ${Math.round(n).toLocaleString('es-PE')}`
}

function fmtPct(n: number) {
  return `${Math.round(n)}%`
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.min(pct, 100)
  return (
    <div className="w-full rounded-full h-2 mt-2" style={{ background: 'var(--color-borde)' }}>
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 text-sm shadow-xl"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}>
      <p className="font-semibold mb-2">Edad {label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-6">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono">{fmtM(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function IndFinanciera() {
  const { escenarioActivo } = useScenario()
  const { cuentas } = usePatrimony()
  const { flujoCaja } = useFinanceData()
  const { tc: tcData } = useTipoCambio()

  const tc = tcData?.venta ?? 3.80

  const resultado = useMemo(
    () => escenarioActivo ? simular(escenarioActivo) : null,
    [escenarioActivo]
  )

  const cuentasEnlazadas = useMemo(() => new Set(
    (escenarioActivo?.instrumentos ?? [])
      .map(i => i.cuentaPatrimonioId)
      .filter(Boolean) as string[]
  ), [escenarioActivo?.instrumentos])

  const patrimonioNoInvertido = useMemo(() =>
    cuentas
      .filter(c => !cuentasEnlazadas.has(c.id))
      .reduce((s, c) => s + (c.montoPEN ?? 0) + (c.montoUSD ?? 0) * tc, 0),
    [cuentas, cuentasEnlazadas, tc]
  )

  const metrics = useMemo(() => {
    if (!escenarioActivo || !resultado) return null
    const { general } = escenarioActivo
    const { swr, edadActual, edadRetiro } = general

    // Patrimonio total actual
    const total0 = resultado.anios[0]?.total ?? 0
    const patrimonioTotal = total0 + patrimonioNoInvertido

    // Egresos anuales reales desde Flujo de Caja
    const egresosAnuales = flujoCaja
      .filter(i => i.tipo === 'Expense' && i.activo)
      .reduce((s, i) => s + (i.montoPEN ?? 0) + (i.montoUSD ?? 0) * tc, 0) * 12

    if (egresosAnuales === 0) return null

    // FI Number: capital necesario para vivir de rentas
    const fiNumber = egresosAnuales / swr

    // FI Ratio
    const fiRatio = (patrimonioTotal / fiNumber) * 100

    // Work Optional Age: primera edad donde el portafolio >= FI Number
    const workOptionalRow = resultado.anios.find(r => r.total + patrimonioNoInvertido >= fiNumber)
    const workOptionalAge = workOptionalRow?.edad ?? null
    const aniosParaFI = workOptionalAge != null ? workOptionalAge - edadActual : null

    // Coast FIRE: lo que necesitas hoy para llegar a FI Number sin aportar más
    const avgRate = resultado.postRetiro?.tasaPromedioPonderada ?? 0.07
    const yearsToRetirement = edadRetiro - edadActual
    const coastFireNumber = fiNumber / Math.pow(1 + avgRate, yearsToRetirement)
    const isCoastAlready = patrimonioTotal >= coastFireNumber
    const coastPct = (patrimonioTotal / coastFireNumber) * 100

    // Lean / Fat FIRE
    const leanFireNumber = (egresosAnuales * 0.7) / swr
    const fatFireNumber = (egresosAnuales * 1.5) / swr
    const leanPct = (patrimonioTotal / leanFireNumber) * 100
    const fatPct = (patrimonioTotal / fatFireNumber) * 100

    // Chart: proyección total con línea FI Number
    const tasaNoInv = general.tasaPatrimonioNoInvertido ?? 0.03
    const chartData = resultado.anios.map((anio, idx) => {
      const noInv = Math.round(patrimonioNoInvertido * Math.pow(1 + tasaNoInv, idx))
      return {
        edad: anio.edad,
        total: Math.round(anio.total + noInv),
        portafolio: Math.round(anio.total),
      }
    })

    return {
      egresosAnuales,
      fiNumber,
      fiRatio,
      workOptionalAge,
      aniosParaFI,
      coastFireNumber,
      isCoastAlready,
      coastPct,
      leanFireNumber,
      fatFireNumber,
      leanPct,
      fatPct,
      chartData,
      swr,
      edadActual,
      edadRetiro,
      patrimonioTotal,
    }
  }, [escenarioActivo, resultado, patrimonioNoInvertido, flujoCaja, tc])

  if (!escenarioActivo || !resultado) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--color-muted)' }}>
        <p>No hay escenario activo.</p>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-20 space-y-2" style={{ color: 'var(--color-muted)' }}>
        <Flame size={32} className="mx-auto mb-3" style={{ color: 'var(--color-acento)' }} />
        <p className="font-medium">Registra tus egresos en Flujo de Caja para calcular tu FI Number.</p>
        <p className="text-sm">El FI Number se calcula desde tus gastos mensuales reales.</p>
      </div>
    )
  }

  const {
    egresosAnuales, fiNumber, fiRatio, workOptionalAge, aniosParaFI,
    coastFireNumber, isCoastAlready, coastPct,
    leanFireNumber, fatFireNumber, leanPct, fatPct,
    chartData, swr, edadActual, edadRetiro, patrimonioTotal,
  } = metrics

  const teal = '#00C9A7'
  const amber = '#F59E0B'
  const red = '#EF4444'

  const ratioColor = fiRatio >= 100 ? teal : fiRatio >= 50 ? amber : 'var(--color-acento)'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-texto)' }}>
          <Flame size={22} style={{ color: teal }} />
          Independencia Financiera
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Escenario: <strong>{escenarioActivo.nombre}</strong> · <FinancialTerm term="swr">SWR</FinancialTerm> {(swr * 100).toFixed(1)}% · Egresos reales: {fmtM(egresosAnuales)}/año
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* FI Number */}
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} style={{ color: teal }} />
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>FI Number</p>
          </div>
          <p className="text-xl font-bold font-mono" style={{ color: 'var(--color-acento)' }}>{fmtM(fiNumber)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
            Capital para vivir de rentas
          </p>
        </div>

        {/* FI Ratio */}
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Flame size={14} style={{ color: ratioColor }} />
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>FI Ratio</p>
          </div>
          <p className="text-xl font-bold font-mono" style={{ color: ratioColor }}>
            {fmtPct(fiRatio)}
          </p>
          <ProgressBar pct={fiRatio} color={ratioColor} />
          <p className="text-xs mt-1.5" style={{ color: 'var(--color-muted)' }}>
            {fmtM(patrimonioTotal)} de {fmtM(fiNumber)}
          </p>
        </div>

        {/* Work Optional Age */}
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} style={{ color: amber }} />
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Work Optional</p>
          </div>
          {workOptionalAge != null ? (
            <>
              <p className="text-xl font-bold font-mono" style={{ color: 'var(--color-texto)' }}>
                {workOptionalAge} años
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                {aniosParaFI != null && aniosParaFI > 0
                  ? `En ${aniosParaFI} años`
                  : 'Ya alcanzado'}
                {edadRetiro && workOptionalAge < edadRetiro
                  ? ` · ${edadRetiro - workOptionalAge}a antes del retiro`
                  : ''}
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold font-mono" style={{ color: 'var(--color-muted)' }}>—</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>No alcanzado en horizonte</p>
            </>
          )}
        </div>

        {/* Coast FIRE */}
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: `1px solid ${isCoastAlready ? teal + '55' : 'var(--color-borde)'}` }}>
          <div className="flex items-center gap-2 mb-2">
            <Anchor size={14} style={{ color: isCoastAlready ? teal : 'var(--color-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Coast FIRE</p>
          </div>
          <p className="text-xl font-bold font-mono" style={{ color: isCoastAlready ? teal : 'var(--color-texto)' }}>
            {fmtM(coastFireNumber)}
          </p>
          <p className="text-xs mt-1" style={{ color: isCoastAlready ? teal : 'var(--color-muted)' }}>
            {isCoastAlready
              ? '✓ Ya puedes costear sin aportar'
              : `${fmtPct(coastPct)} — faltan ${fmtM(coastFireNumber - patrimonioTotal)}`}
          </p>
        </div>
      </div>

      {/* Escenarios Lean / Standard / Fat */}
      <div className="rounded-xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-texto)' }}>
          Escenarios FIRE
        </h2>
        <div className="space-y-4">
          {[
            { label: 'Lean FIRE', sublabel: '70% de tus gastos actuales', number: leanFireNumber, pct: leanPct, color: teal },
            { label: 'Standard FIRE', sublabel: '100% — tu estilo de vida actual', number: fiNumber, pct: fiRatio, color: 'var(--color-acento)', highlight: true },
            { label: 'Fat FIRE', sublabel: '150% — holgura total', number: fatFireNumber, pct: fatPct, color: amber },
          ].map(({ label, sublabel, number, pct, color, highlight }) => (
            <div key={label} className={`rounded-lg p-3 ${highlight ? 'ring-1' : ''}`}
              style={{ background: highlight ? 'var(--color-fondo)' : 'transparent', ringColor: teal }}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-texto)' }}>{label}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--color-muted)' }}>{sublabel}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono" style={{ color }}>{fmtM(number)}</span>
                  <span className="text-xs ml-2 font-mono" style={{ color: 'var(--color-muted)' }}>{fmtPct(Math.min(pct, 100))}</span>
                </div>
              </div>
              <ProgressBar pct={pct} color={pct >= 100 ? teal : color} />
            </div>
          ))}
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--color-muted)' }}>
          Basado en egresos reales de Flujo de Caja: {fmtM(egresosAnuales / 12)}/mes · SWR {(swr * 100).toFixed(1)}%
        </p>
      </div>

      {/* Chart: Trayectoria hacia FI Number */}
      <div className="rounded-xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-texto)' }}>
          Trayectoria hacia tu FI Number
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-muted)' }}>
          Patrimonio total proyectado vs. capital objetivo de independencia
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={teal} stopOpacity={0.25} />
                <stop offset="95%" stopColor={teal} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
            <XAxis dataKey="edad" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
            <YAxis
              tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1_000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              width={52}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine
              y={fiNumber}
              stroke={amber}
              strokeDasharray="6 3"
              label={{ value: 'FI Number', position: 'insideTopRight', fontSize: 11, fill: amber }}
            />
            {workOptionalAge != null && (
              <ReferenceLine
                x={workOptionalAge}
                stroke={teal}
                strokeDasharray="4 3"
                label={{ value: `WO ${workOptionalAge}a`, position: 'insideTopLeft', fontSize: 11, fill: teal }}
              />
            )}
            <Area
              type="monotone"
              dataKey="total"
              name="Patrimonio total"
              stroke={teal}
              strokeWidth={2}
              fill="url(#gradTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3 text-xs" style={{ color: 'var(--color-muted)' }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5" style={{ background: teal }} /> Patrimonio total
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 border-t border-dashed" style={{ borderColor: amber }} /> FI Number
          </span>
          {workOptionalAge != null && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 border-t border-dashed" style={{ borderColor: teal }} /> Work Optional
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
