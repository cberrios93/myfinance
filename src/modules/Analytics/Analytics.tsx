import { useState, useMemo, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell,
} from 'recharts'
import { Sparkles, Copy, Check, X as XIcon } from 'lucide-react'
import { usePatrimony } from '../../data/PatrimonyContext'
import { useFinanceData } from '../../data/FinanceDataContext'
import { useConfig } from '../../config/ConfigContext'
import type { HistorialMensual, Rendimiento, FlujoCajaItem } from '../../data/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 0) {
  return n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function totalEnPEN(h: HistorialMensual) {
  return h.totalPEN + h.totalUSD * h.tipoCambio
}
function periodoToYearMonth(p: string): { year: number; month: number } {
  const [mm, yyyy] = p.split(' - ')
  return { year: parseInt(yyyy), month: parseInt(mm) }
}
function cagr(start: number, end: number, years: number): number {
  if (start <= 0 || years <= 0) return 0
  return (Math.pow(end / start, 1 / years) - 1) * 100
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'patrimonio' | 'flujo-real' | 'rendimientos'
type Granularity = 'mensual' | 'anual'

// ─── Shared stat card ────────────────────────────────────────────────────────

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  const subColor = positive === undefined ? 'var(--color-muted)' : positive ? '#22c55e' : '#ef4444'
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
      <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label}</p>
      <p className="text-xl font-bold font-mono" style={{ color: 'var(--color-texto)' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5 font-mono" style={{ color: subColor }}>{sub}</p>}
    </div>
  )
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 text-sm shadow-lg" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}>
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-6">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono">S/ {fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Dual range slider ───────────────────────────────────────────────────────

function DualRangeSlider({
  count, fromIdx, toIdx, labels, onChange,
}: {
  count: number
  fromIdx: number
  toIdx: number
  labels: string[]
  onChange: (from: number, to: number) => void
}) {
  const max = count - 1
  function pct(v: number) { return max > 0 ? (v / max) * 100 : 0 }

  const yearTicks = useMemo(() => {
    const ticks: { idx: number; year: string }[] = []
    let lastYear = ''
    labels.forEach((lbl, i) => {
      const year = lbl.split(' - ')[1] ?? ''
      if (year !== lastYear) { ticks.push({ idx: i, year }); lastYear = year }
    })
    return ticks
  }, [labels])

  return (
    <div className="w-full select-none">
      {/* Slider */}
      <div style={{ padding: '0 9px' }}>
        {/*
          El contenedor tiene la misma altura que el thumb (20px).
          Ambos inputs lo llenan completamente — así Webkit centra el thumb
          automáticamente sin margin-top extra.
          La pista visual es un div independiente, no el track del input.
        */}
        <div className="relative" style={{ height: 20 }}>
          {/* Pista base */}
          <div
            style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
              left: 0, right: 0, height: 6, borderRadius: 3,
              background: 'var(--color-borde)', pointerEvents: 'none',
            }}
          />
          {/* Relleno del rango activo */}
          <div
            style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
              left: `${pct(fromIdx)}%`,
              width: `${Math.max(0, pct(toIdx) - pct(fromIdx))}%`,
              height: 6, borderRadius: 3,
              background: 'linear-gradient(90deg, var(--color-acento), #60a5fa)',
              pointerEvents: 'none',
            }}
          />
          {/* Input FROM */}
          <input
            type="range" min={0} max={max} value={fromIdx}
            onChange={e => onChange(Math.min(parseInt(e.target.value), toIdx), toIdx)}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%', margin: 0, padding: 0,
              appearance: 'none', WebkitAppearance: 'none',
              background: 'transparent', outline: 'none', border: 'none',
              pointerEvents: 'none',
              zIndex: fromIdx >= toIdx ? 5 : 3,
            }}
          />
          {/* Input TO */}
          <input
            type="range" min={0} max={max} value={toIdx}
            onChange={e => onChange(fromIdx, Math.max(parseInt(e.target.value), fromIdx))}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%', margin: 0, padding: 0,
              appearance: 'none', WebkitAppearance: 'none',
              background: 'transparent', outline: 'none', border: 'none',
              pointerEvents: 'none',
              zIndex: fromIdx >= toIdx ? 3 : 5,
            }}
          />
        </div>

        {/* Ticks de años con línea vertical */}
        <div className="relative mt-1" style={{ height: 16 }}>
          {yearTicks.map(({ idx, year }) => (
            <div
              key={year}
              style={{
                position: 'absolute',
                left: `${pct(idx)}%`,
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                pointerEvents: 'none',
              }}
            >
              <div style={{ width: 1, height: 4, background: 'var(--color-borde)' }} />
              <span style={{ fontSize: 9, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{year}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1: Patrimonio
// ════════════════════════════════════════════════════════════════════════════

const ALL_LINES = ['Total (S/)', 'PEN (S/)', 'USD→PEN'] as const
type LineName = typeof ALL_LINES[number]

function PatrimonioTab() {
  const { historial } = usePatrimony()
  const { config } = useConfig()
  const inflacionAnual = config.inflacionAnual ?? 6

  const valid = useMemo(
    () => [...historial].filter(h => !h.nota).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [historial]
  )

  const periodOptions = useMemo(() => valid.map(h => h.periodo), [valid])

  const [fromIdx, setFromIdx] = useState(0)
  const [toIdx, setToIdx] = useState(0)
  const [granularity, setGranularity] = useState<Granularity>('mensual')
  const [activeLines, setActiveLines] = useState<Set<LineName>>(new Set(['Total (S/)', 'PEN (S/)', 'USD→PEN']))

  const maxIdx = Math.max(0, valid.length - 1)

  useEffect(() => {
    setToIdx(prev => prev === 0 ? maxIdx : Math.min(prev, maxIdx))
  }, [maxIdx])

  const filtered = useMemo(() => {
    if (!valid.length) return []
    return valid.slice(fromIdx, toIdx + 1)
  }, [valid, fromIdx, toIdx])

  // Chart data con línea de inflación
  const chartData = useMemo(() => {
    if (!filtered.length) return []
    if (granularity === 'mensual') {
      return filtered.map((h, i) => ({
        label: h.periodo,
        'Total (S/)': Math.round(totalEnPEN(h)),
        'PEN (S/)': Math.round(h.totalPEN),
        'USD→PEN': Math.round(h.totalUSD * h.tipoCambio),
        _prev: i > 0 ? Math.round(totalEnPEN(filtered[i - 1])) : null,
      }))
    }
    const byYear: Record<number, HistorialMensual[]> = {}
    for (const h of filtered) {
      const { year } = periodoToYearMonth(h.periodo)
      if (!byYear[year]) byYear[year] = []
      byYear[year].push(h)
    }
    const entries = Object.entries(byYear).sort(([a], [b]) => parseInt(a) - parseInt(b))
    return entries.map(([year, records], i) => {
      const h = records[records.length - 1]
      const prevRecords = i > 0 ? Object.values(byYear)[i - 1] : null
      const prevH = prevRecords ? prevRecords[prevRecords.length - 1] : null
      return {
        label: year,
        'Total (S/)': Math.round(totalEnPEN(h)),
        'PEN (S/)': Math.round(h.totalPEN),
        'USD→PEN': Math.round(h.totalUSD * h.tipoCambio),
        _prev: prevH ? Math.round(totalEnPEN(prevH)) : null,
      }
    })
  }, [filtered, granularity, inflacionAnual])

  // Stats del período seleccionado
  const stats = useMemo(() => {
    if (filtered.length < 2) return null
    const first = filtered[0]
    const last = filtered[filtered.length - 1]
    const startVal = totalEnPEN(first)
    const endVal = totalEnPEN(last)
    const diff = endVal - startVal
    const pct = startVal > 0 ? (diff / startVal) * 100 : 0
    const { year: y1, month: m1 } = periodoToYearMonth(first.periodo)
    const { year: y2, month: m2 } = periodoToYearMonth(last.periodo)
    const months = (y2 - y1) * 12 + (m2 - m1)
    const years = months / 12
    const cagrVal = cagr(startVal, endVal, years)
    return { startVal, endVal, diff, pct, cagrVal, years: parseFloat(years.toFixed(1)), first: first.periodo, last: last.periodo }
  }, [filtered])

  // Variación MoM sobre el rango filtrado
  const growthData = useMemo(() => {
    if (filtered.length < 2) return []
    return filtered.slice(1).map((h, i) => {
      const prev = filtered[i]
      const cur = totalEnPEN(h)
      const prv = totalEnPEN(prev)
      const pct = prv > 0 ? ((cur - prv) / prv) * 100 : 0
      return { label: h.periodo, '% cambio': parseFloat(pct.toFixed(2)) }
    })
  }, [filtered])

  // Racha actual — sobre todos los registros válidos (no depende del rango)
  const racha = useMemo(() => {
    if (valid.length < 2) return null
    const changes: boolean[] = []
    for (let i = 1; i < valid.length; i++) {
      const cur = totalEnPEN(valid[i])
      const prv = totalEnPEN(valid[i - 1])
      changes.push(cur >= prv)
    }
    const lastSign = changes[changes.length - 1]
    let count = 0
    for (let i = changes.length - 1; i >= 0; i--) {
      if (changes[i] === lastSign) count++
      else break
    }
    return { count, positive: lastSign }
  }, [valid])

  // Aceleración — últimos 12m vs 12m anteriores (sobre todos los válidos)
  const aceleracion = useMemo(() => {
    if (valid.length < 3) return null
    const last12 = valid.slice(-13)
    const prev12 = valid.length >= 25 ? valid.slice(-25, -12) : valid.slice(0, Math.max(2, valid.length - 12))
    const rate = (records: HistorialMensual[]) => {
      if (records.length < 2) return null
      const s = totalEnPEN(records[0])
      const e = totalEnPEN(records[records.length - 1])
      return s > 0 ? ((e - s) / s) * 100 : null
    }
    const r1 = rate(last12)
    const r2 = rate(prev12)
    if (r1 === null || r2 === null) return null
    return { last12: r1, prev12: r2, delta: r1 - r2 }
  }, [valid])

  // Interpretación CAGR
  function cagrLabel(c: number): { text: string; color: string } {
    if (c >= 10) return { text: 'Por encima del objetivo', color: '#22c55e' }
    if (c >= 6)  return { text: 'Por encima de inflación', color: '#86efac' }
    if (c >= 0)  return { text: 'Bajo inflación estimada', color: '#f59e0b' }
    return { text: 'Patrimonio en retroceso', color: '#ef4444' }
  }

  function toggleLine(name: LineName) {
    setActiveLines(prev => {
      const next = new Set(prev)
      if (next.has(name)) { if (next.size > 1) next.delete(name) }
      else next.add(name)
      return next
    })
  }

  if (!valid.length) {
    return (
      <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>
        No hay registros en Historial con datos reales. Agrega registros primero.
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Rango de análisis ── */}
      <div
        className="rounded-xl px-4 pt-3 pb-2"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)', fontSize: 10 }}>Rango</span>
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-texto)' }}>
              {periodOptions[fromIdx]}
            </span>
            <span style={{ color: 'var(--color-borde)', fontSize: 12 }}>→</span>
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-texto)' }}>
              {periodOptions[Math.min(toIdx, maxIdx)]}
            </span>
          </div>
          {(fromIdx > 0 || toIdx < maxIdx) && (
            <button
              onClick={() => { setFromIdx(0); setToIdx(maxIdx) }}
              className="text-xs px-2 py-0.5 rounded"
              style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}
            >
              Reset
            </button>
          )}
        </div>
        {periodOptions.length > 1 && (
          <DualRangeSlider
            count={periodOptions.length}
            fromIdx={fromIdx}
            toIdx={Math.min(toIdx, maxIdx)}
            labels={periodOptions}
            onChange={(f, t) => { setFromIdx(f); setToIdx(t) }}
          />
        )}
      </div>

      {/* ── 4 KPIs en fila única: Racha · Aceleración · Variación · CAGR ── */}
      {(racha || aceleracion || stats) && (
        <div className="grid grid-cols-4 gap-3">
          {racha && (
            <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Racha actual</p>
              <p className="text-2xl font-bold font-mono" style={{ color: racha.positive ? '#22c55e' : '#ef4444' }}>
                {racha.positive ? '▲' : '▼'} {racha.count} {racha.count === 1 ? 'mes' : 'meses'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                {racha.positive ? 'consecutivos en positivo' : 'consecutivos en negativo'}
              </p>
            </div>
          )}
          {aceleracion && (
            <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Aceleración patrimonial</p>
              <p className="text-2xl font-bold font-mono" style={{ color: aceleracion.delta >= 0 ? '#22c55e' : '#ef4444' }}>
                {aceleracion.delta >= 0 ? '+' : ''}{aceleracion.delta.toFixed(1)}%
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                Últimos 12m <span className="font-mono" style={{ color: 'var(--color-texto)' }}>{aceleracion.last12 >= 0 ? '+' : ''}{aceleracion.last12.toFixed(1)}%</span>
                {' vs '} 12m ant. <span className="font-mono" style={{ color: 'var(--color-texto)' }}>{aceleracion.prev12 >= 0 ? '+' : ''}{aceleracion.prev12.toFixed(1)}%</span>
              </p>
            </div>
          )}
          {stats && (
            <>
              <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Variación del período</p>
                <p className="text-2xl font-bold font-mono" style={{ color: stats.diff >= 0 ? '#22c55e' : '#ef4444' }}>
                  {stats.diff >= 0 ? '+' : ''}S/ {fmt(stats.diff)}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                  <span>Inicio </span>
                  <span className="font-mono" style={{ color: 'var(--color-texto)' }}>S/ {fmt(stats.startVal)}</span>
                  <span className="mx-1.5" style={{ color: 'var(--color-borde)' }}>·</span>
                  <span>Fin </span>
                  <span className="font-mono" style={{ color: 'var(--color-texto)' }}>S/ {fmt(stats.endVal)}</span>
                  <span className="font-mono font-semibold ml-1.5" style={{ color: stats.pct >= 0 ? '#22c55e' : '#ef4444' }}>
                    ({stats.pct >= 0 ? '+' : ''}{stats.pct.toFixed(1)}%)
                  </span>
                </p>
              </div>
              {(() => {
                const { text, color } = cagrLabel(stats.cagrVal)
                return (
                  <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>CAGR · {stats.years}a</p>
                    <p className="text-2xl font-bold font-mono" style={{ color }}>
                      {stats.cagrVal >= 0 ? '+' : ''}{stats.cagrVal.toFixed(2)}%
                    </p>
                    <p className="text-xs mt-1 font-semibold" style={{ color }}>{text}</p>
                  </div>
                )
              })()}
            </>
          )}
        </div>
      )}

      {/* ── Evolución del patrimonio + toggle ── */}
      <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Evolución del patrimonio (S/)</p>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-borde)' }}>
            {(['mensual', 'anual'] as Granularity[]).map(g => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className="px-3 py-1 text-xs capitalize"
                style={{
                  background: granularity === g ? 'var(--color-acento)' : 'transparent',
                  color: granularity === g ? '#fff' : 'var(--color-muted)',
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        {/* Checkboxes de líneas */}
        <div className="flex gap-4 mb-3 flex-wrap">
          {([
            { key: 'Total (S/)' as LineName, color: '#3b82f6', label: 'Total' },
            { key: 'PEN (S/)' as LineName, color: '#22c55e', label: 'PEN' },
            { key: 'USD→PEN' as LineName, color: '#f59e0b', label: 'USD→PEN' },
          ]).map(({ key, color, label }) => (
            <button
              key={key}
              onClick={() => toggleLine(key)}
              className="flex items-center gap-1.5 text-xs"
              style={{ opacity: activeLines.has(key) ? 1 : 0.35, color: 'var(--color-muted)' }}
            >
              <span style={{ width: 10, height: 3, borderRadius: 2, background: color, display: 'inline-block' }} />
              {label}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradPEN" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradUSD" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} interval="preserveStartEnd" />
            <YAxis tickFormatter={v => `S/${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} width={60} />
            <Tooltip
              contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', borderRadius: 8, color: 'var(--color-texto)', fontSize: 11 }}
              formatter={(value, name, props: any) => {
                const v = value as number
                const n = name as string
                const prev = props?.payload?._prev
                const delta = n === 'Total (S/)' && prev != null ? ` (${v - prev >= 0 ? '+' : ''}S/ ${fmt(v - prev)})` : ''
                return [`S/ ${fmt(v)}${delta}`, n]
              }}
            />
            {activeLines.has('Total (S/)') && <Area type="monotone" dataKey="Total (S/)" stroke="#3b82f6" strokeWidth={2} fill="url(#gradTotal)" dot={false} />}
            {activeLines.has('PEN (S/)') && <Area type="monotone" dataKey="PEN (S/)" stroke="#22c55e" strokeWidth={1.5} fill="url(#gradPEN)" dot={false} strokeDasharray="4 2" />}
            {activeLines.has('USD→PEN') && <Area type="monotone" dataKey="USD→PEN" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gradUSD)" dot={false} strokeDasharray="4 2" />}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Variación MoM/YoY — barras rojo/verde ── */}
      {growthData.length > 1 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-texto)' }}>
            Variación {granularity === 'mensual' ? 'mes a mes' : 'año a año'} (%)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={growthData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} interval="preserveStartEnd" />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} width={45} />
              <Tooltip
                formatter={(v: unknown) => [`${(v as number).toFixed(2)}%`, '% cambio']}
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 4 }}
                itemStyle={{ color: '#f1f5f9' }}
              />
              <ReferenceLine y={0} stroke="var(--color-borde)" />
              <Bar dataKey="% cambio" radius={[3, 3, 0, 0]}>
                {growthData.map((entry, i) => (
                  <Cell key={i} fill={entry['% cambio'] >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Heatmap con totales por año ── */}
      {(() => {
        const allValid = [...historial].filter(h => !h.nota).sort((a, b) => a.fecha.localeCompare(b.fecha))
        if (allValid.length < 2) return null
        type HeatCell = { pct: number | null }
        const map: Record<number, Record<number, HeatCell>> = {}
        const yearTotals: Record<number, { start: number; end: number }> = {}

        for (let i = 1; i < allValid.length; i++) {
          const cur = allValid[i], prev = allValid[i - 1]
          const { year, month } = periodoToYearMonth(cur.periodo)
          const curTotal = totalEnPEN(cur), prevTotal = totalEnPEN(prev)
          const pct = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : null
          if (!map[year]) map[year] = {}
          map[year][month] = { pct }
        }

        // Para totales de año: primer y último registro de cada año
        const byYear: Record<number, HistorialMensual[]> = {}
        for (const h of allValid) {
          const { year } = periodoToYearMonth(h.periodo)
          if (!byYear[year]) byYear[year] = []
          byYear[year].push(h)
        }
        for (const [y, records] of Object.entries(byYear)) {
          const yr = parseInt(y)
          yearTotals[yr] = {
            start: totalEnPEN(records[0]),
            end: totalEnPEN(records[records.length - 1]),
          }
        }

        const years = Object.keys(map).map(Number).sort()
        const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

        function heatColor(pct: number | null) {
          if (pct === null) return 'var(--color-borde)'
          if (pct > 5)  return '#16a34a'
          if (pct > 2)  return '#22c55e'
          if (pct > 0)  return '#86efac'
          if (pct > -2) return '#fca5a5'
          if (pct > -5) return '#ef4444'
          return '#b91c1c'
        }
        function heatText(pct: number | null) {
          if (pct === null) return ''
          return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}`
        }

        return (
          <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-texto)' }}>
              Heatmap de crecimiento mensual (%)
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs border-separate" style={{ borderSpacing: 3 }}>
                <thead>
                  <tr>
                    <th style={{ color: 'var(--color-muted)', width: 40 }} />
                    {MONTHS.map(m => (
                      <th key={m} className="text-center font-medium pb-1" style={{ color: 'var(--color-muted)', width: 44 }}>{m}</th>
                    ))}
                    <th className="text-right pl-3 font-medium pb-1" style={{ color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>Año</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map(year => {
                    return (
                      <tr key={year}>
                        <td className="text-right pr-2 font-semibold" style={{ color: 'var(--color-muted)' }}>{year}</td>
                        {Array.from({ length: 12 }, (_, mi) => {
                          const cell = map[year]?.[mi + 1]
                          const bg = heatColor(cell?.pct ?? null)
                          const text = heatText(cell?.pct ?? null)
                          return (
                            <td
                              key={mi}
                              className="text-center font-mono rounded"
                              title={cell?.pct != null ? `${cell.pct.toFixed(2)}%` : '—'}
                              style={{
                                background: bg,
                                color: cell?.pct == null ? 'transparent' : '#fff',
                                height: 28, width: 44,
                                fontSize: 9,
                                fontWeight: 600,
                              }}
                            >
                              {text}
                            </td>
                          )
                        })}
                        {(() => {
                          const yt = yearTotals[year]
                          const yearPct = yt && yt.start > 0 ? ((yt.end - yt.start) / yt.start) * 100 : null
                          return (
                            <td className="text-right pl-3 font-mono text-xs font-semibold" style={{ whiteSpace: 'nowrap', color: yearPct == null ? 'var(--color-muted)' : yearPct >= 0 ? '#22c55e' : '#ef4444' }}>
                              {yearPct != null ? `${yearPct >= 0 ? '+' : ''}${yearPct.toFixed(1)}%` : '—'}
                            </td>
                          )
                        })()}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Leyenda:</span>
              {[
                { bg: '#16a34a', label: '>+5%' },
                { bg: '#22c55e', label: '+2% a +5%' },
                { bg: '#86efac', label: '0% a +2%' },
                { bg: '#fca5a5', label: '0% a −2%' },
                { bg: '#ef4444', label: '−2% a −5%' },
                { bg: '#b91c1c', label: '<−5%' },
              ].map(({ bg, label }) => (
                <span key={label} className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                  <span className="inline-block rounded" style={{ width: 12, height: 12, background: bg }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )
      })()}

    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3: Flujo real vs. declarado
// ════════════════════════════════════════════════════════════════════════════

function FlujoRealTab() {
  const { historial } = usePatrimony()
  const { flujoCaja } = useFinanceData()

  const tc = useMemo(() => {
    const valid = [...historial].filter(h => !h.nota).sort((a, b) => b.fecha.localeCompare(a.fecha))
    return valid[0]?.tipoCambio ?? 3.7
  }, [historial])

  // Flujo neto declarado mensual (estático del módulo)
  const flujoDeclarado = useMemo(() => {
    const ingresos = flujoCaja.filter(f => f.tipo === 'Income' && f.activo)
    const egresos  = flujoCaja.filter(f => f.tipo === 'Expense' && f.activo)
    const ing = ingresos.reduce((s, f) => s + (f.montoPEN ?? 0) + (f.montoUSD ?? 0) * tc, 0)
    const egr = egresos.reduce((s, f)  => s + (f.montoPEN ?? 0) + (f.montoUSD ?? 0) * tc, 0)
    return ing - egr
  }, [flujoCaja, tc])

  // Serie mensual: Δ real del patrimonio
  const chartData = useMemo(() => {
    const valid = [...historial].filter(h => !h.nota).sort((a, b) => a.fecha.localeCompare(b.fecha))
    if (valid.length < 2) return []
    return valid.slice(1).map((h, i) => {
      const prev = valid[i]
      const deltaReal = totalEnPEN(h) - totalEnPEN(prev)
      const diff = deltaReal - flujoDeclarado
      return {
        label: h.periodo,
        'Δ real patrimonio': Math.round(deltaReal),
        'Flujo declarado': Math.round(flujoDeclarado),
        'Diferencia': Math.round(diff),
      }
    })
  }, [historial, flujoDeclarado])

  // Acumulado de diferencia
  const difAcum = chartData.reduce((s, d) => s + d['Diferencia'], 0)
  const mesesPositivos = chartData.filter(d => d['Diferencia'] >= 0).length
  const mesesNegativos = chartData.filter(d => d['Diferencia'] < 0).length

  if (!historial.filter(h => !h.nota).length || !flujoCaja.length) {
    return (
      <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>
        Necesitas registros en Historial y en Flujo de Caja para ver este análisis.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl p-4 text-sm"
        style={{ background: 'var(--color-acento)10', border: '1px solid var(--color-acento)40', color: 'var(--color-texto)' }}
      >
        <strong>Cómo leerlo:</strong> compara cuánto declara fluir tu presupuesto cada mes
        (ingresos activos − egresos activos = <strong>S/ {fmt(flujoDeclarado)}/mes</strong>) contra el
        cambio real del patrimonio. La diferencia revela si gastas más de lo presupuestado,
        recibes ingresos no registrados, o hay variaciones de mercado.
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Flujo declarado/mes" value={`S/ ${fmt(flujoDeclarado)}`} positive={flujoDeclarado >= 0} />
        <StatCard label="Diferencia acumulada" value={`S/ ${fmt(difAcum)}`} positive={difAcum >= 0}
          sub={difAcum >= 0 ? 'Creció más de lo declarado' : 'Creció menos de lo declarado'} />
        <StatCard label="Meses sobre presupuesto" value={`${mesesPositivos}`}
          sub={`de ${chartData.length} meses`} positive={true} />
        <StatCard label="Meses bajo presupuesto" value={`${mesesNegativos}`}
          sub={`de ${chartData.length} meses`} positive={false} />
      </div>

      {/* Gráfico principal */}
      <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-texto)' }}>
          Δ real del patrimonio vs. flujo declarado (S/)
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} interval="preserveStartEnd" />
            <YAxis tickFormatter={v => `S/${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="var(--color-borde)" />
            <Bar dataKey="Δ real patrimonio" fill="#3b82f6" radius={[3,3,0,0]} />
            <ReferenceLine y={flujoDeclarado} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={2}
              label={{ value: `Declarado S/${fmt(flujoDeclarado)}`, position: 'right', fontSize: 10, fill: '#f59e0b' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Diferencia mes a mes */}
      <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-texto)' }}>
          Diferencia mensual (real − declarado)
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-muted)' }}>
          Positivo = creció más de lo presupuestado · Negativo = creció menos
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} interval="preserveStartEnd" />
            <YAxis tickFormatter={v => `S/${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="var(--color-borde)" />
            <Bar dataKey="Diferencia" radius={[3,3,0,0]}
              fill="#22c55e"
              label={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2: Rendimientos
// ════════════════════════════════════════════════════════════════════════════

function RendimientosTab() {
  const { rendimientos } = useFinanceData()
  const [instrFiltro, setInstrFiltro] = useState<string>('todos')

  const instrumentos = useMemo(() => {
    const set = new Set(rendimientos.map(r => r.instrumentoNombre))
    return ['todos', ...Array.from(set).sort()]
  }, [rendimientos])

  const filtered = useMemo(
    () => {
      const sinTraspaso = rendimientos.filter(r => !r.esTraspaso)
      return instrFiltro === 'todos' ? sinTraspaso : sinTraspaso.filter(r => r.instrumentoNombre === instrFiltro)
    },
    [rendimientos, instrFiltro]
  )

  // Group by year for the bar chart
  const byYear = useMemo(() => {
    const map: Record<number, { pen: number; usd: number; count: number }> = {}
    for (const r of filtered) {
      if (!map[r.anio]) map[r.anio] = { pen: 0, usd: 0, count: 0 }
      map[r.anio].pen += r.gananciasPEN ?? 0
      map[r.anio].usd += r.gananciasUSD ?? 0
      map[r.anio].count++
    }
    return Object.entries(map)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([year, v]) => ({
        label: year,
        'Ganancias PEN': Math.round(v.pen),
        'Ganancias USD (×TC3.7)': Math.round(v.usd * 3.7),
        registros: v.count,
      }))
  }, [filtered])

  // Summary by instrument
  const byInstr = useMemo(() => {
    const map: Record<string, { pen: number; usd: number; anios: Set<number>; reinvertido: number }> = {}
    for (const r of rendimientos) {
      if (r.esTraspaso) continue
      if (!map[r.instrumentoNombre]) map[r.instrumentoNombre] = { pen: 0, usd: 0, anios: new Set(), reinvertido: 0 }
      map[r.instrumentoNombre].pen += r.gananciasPEN ?? 0
      map[r.instrumentoNombre].usd += r.gananciasUSD ?? 0
      map[r.instrumentoNombre].anios.add(r.anio)
      if (r.reinvertido) map[r.instrumentoNombre].reinvertido++
    }
    return Object.entries(map)
      .map(([nombre, v]) => ({
        nombre,
        pen: v.pen,
        usd: v.usd,
        total: v.pen + v.usd * 3.7,
        anios: v.anios.size,
        reinvertido: v.reinvertido,
      }))
      .sort((a, b) => b.total - a.total)
  }, [rendimientos])

  // Totals
  const totalPEN = filtered.reduce((s, r) => s + (r.gananciasPEN ?? 0), 0)
  const totalUSD = filtered.reduce((s, r) => s + (r.gananciasUSD ?? 0), 0)
  const totalGlobal = totalPEN + totalUSD * 3.7

  if (!rendimientos.length) {
    return (
      <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>
        No hay registros de rendimientos todavía.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Instrumento</label>
          <select
            value={instrFiltro}
            onChange={e => setInstrFiltro(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--color-card)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }}
          >
            {instrumentos.map(i => <option key={i} value={i}>{i === 'todos' ? 'Todos los instrumentos' : i}</option>)}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total ganancias PEN" value={`S/ ${fmt(totalPEN)}`} positive={totalPEN >= 0} />
        <StatCard label="Total ganancias USD" value={`$ ${fmt(totalUSD)}`} positive={totalUSD >= 0} />
        <StatCard label="Total consolidado (S/)" value={`S/ ${fmt(totalGlobal)}`} positive={totalGlobal >= 0} />
        <StatCard label="Registros" value={`${filtered.length}`} sub={`${byYear.length} año${byYear.length !== 1 ? 's' : ''}`} />
      </div>

      {/* Bar chart by year */}
      {byYear.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-texto)' }}>Ganancias por año (S/)</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byYear} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} />
              <YAxis tickFormatter={v => `S/${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Ganancias PEN" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Ganancias USD (×TC3.7)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Acumulado por instrumento */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-borde)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#1e3a5f', color: '#fff' }}>
              <th className="text-left px-3 py-2.5 font-semibold text-xs">Instrumento</th>
              <th className="text-right px-3 py-2.5 font-semibold text-xs">Ganancias PEN</th>
              <th className="text-right px-3 py-2.5 font-semibold text-xs">Ganancias USD</th>
              <th className="text-right px-3 py-2.5 font-semibold text-xs">Total (S/)</th>
              <th className="text-right px-3 py-2.5 font-semibold text-xs">Años</th>
              <th className="text-right px-3 py-2.5 font-semibold text-xs">Reinvertidos</th>
            </tr>
          </thead>
          <tbody>
            {byInstr.map(r => (
              <tr key={r.nombre} style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}>
                <td className="px-3 py-2.5 text-xs font-medium">{r.nombre}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">{r.pen > 0 ? `S/ ${fmt(r.pen)}` : '—'}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">{r.usd > 0 ? `$ ${fmt(r.usd)}` : '—'}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold" style={{ color: r.total >= 0 ? '#22c55e' : '#ef4444' }}>
                  S/ {fmt(r.total)}
                </td>
                <td className="px-3 py-2.5 text-right text-xs" style={{ color: 'var(--color-muted)' }}>{r.anios}</td>
                <td className="px-3 py-2.5 text-right text-xs" style={{ color: 'var(--color-muted)' }}>{r.reinvertido}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--color-fondo)', borderTop: '2px solid var(--color-borde)', color: 'var(--color-texto)' }}>
              <td className="px-3 py-2.5 text-xs font-bold">Total</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs font-bold">S/ {fmt(byInstr.reduce((s, r) => s + r.pen, 0))}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs font-bold">$ {fmt(byInstr.reduce((s, r) => s + r.usd, 0))}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs font-bold" style={{ color: '#22c55e' }}>S/ {fmt(byInstr.reduce((s, r) => s + r.total, 0))}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Concentración de rendimientos — donut */}
      {byInstr.length > 0 && instrFiltro === 'todos' && (() => {
        const totalPos = byInstr.filter(r => r.total > 0).reduce((s, r) => s + r.total, 0)
        if (totalPos <= 0) return null
        const PIE_COLORS = ['#3b82f6','#22c55e','#f59e0b','#a78bfa','#f87171','#34d399','#fb923c','#60a5fa']
        const pieData = byInstr
          .filter(r => r.total > 0)
          .map((r, i) => ({ name: r.nombre, value: r.total, color: PIE_COLORS[i % PIE_COLORS.length] }))
        return (
          <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-texto)' }}>
              Concentración de rendimientos (acumulado histórico)
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-muted)' }}>
              % de tus ganancias totales que viene de cada instrumento
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <PieChart width={200} height={200}>
                <Pie data={pieData} cx={100} cy={100} innerRadius={55} outerRadius={90}
                  dataKey="value" stroke="none">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(v: unknown) => { const n = v as number; return [`S/ ${fmt(n)} (${((n / totalPos) * 100).toFixed(1)}%)`, ''] }}
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
              <div className="flex flex-col gap-2 flex-1">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="rounded-full shrink-0" style={{ width: 10, height: 10, background: d.color }} />
                    <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-texto)' }}>{d.name}</span>
                    <span className="text-xs font-mono font-semibold" style={{ color: d.color }}>
                      {((d.value / totalPos) * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                      S/ {fmt(d.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Rentabilidad line chart — only if rentabilidad field exists */}
      {(() => {
        const withRent = filtered.filter(r => r.rentabilidad !== undefined && r.rentabilidad !== null)
        if (withRent.length < 2) return null
        const rentData = withRent.map(r => ({
          label: `${r.instrumentoNombre} ${r.anio}`,
          Rentabilidad: parseFloat((r.rentabilidad! * 100).toFixed(2)),
        }))
        return (
          <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-texto)' }}>Rentabilidad % por registro</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={rentData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--color-muted)' }} interval={0} angle={-30} textAnchor="end" height={45} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} width={45} />
                <Tooltip formatter={(v: unknown) => [`${(v as number).toFixed(2)}%`, 'Rentabilidad']} contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine y={0} stroke="var(--color-borde)" />
                <Line type="monotone" dataKey="Rentabilidad" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      })()}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Prompt generator
// ════════════════════════════════════════════════════════════════════════════

type Enfoque = 'general' | 'optimizacion' | 'proyeccion' | 'riesgo'

const ENFOQUES: { id: Enfoque; label: string; descripcion: string }[] = [
  { id: 'general', label: 'Análisis general', descripcion: 'Visión holística de mi situación financiera, qué va bien y qué no.' },
  { id: 'optimizacion', label: 'Optimización', descripcion: 'Cómo mejorar la asignación de activos y rentabilidad.' },
  { id: 'proyeccion', label: 'Proyección', descripcion: 'Si estoy en la trayectoria correcta para mis metas de largo plazo.' },
  { id: 'riesgo', label: 'Riesgo', descripcion: 'Exposición a riesgos, diversificación y puntos de quiebre.' },
]

function buildPrompt(
  historial: HistorialMensual[],
  rendimientos: Rendimiento[],
  flujoCaja: FlujoCajaItem[],
  enfoque: Enfoque,
  tc: number,
): string {
  const valid = [...historial].filter(h => !h.nota).sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Patrimonio actual
  const ultimo = valid[valid.length - 1]
  const primero = valid[0]
  const totalActual = ultimo ? ultimo.totalPEN + ultimo.totalUSD * ultimo.tipoCambio : 0
  const totalInicio = primero ? primero.totalPEN + primero.totalUSD * primero.tipoCambio : 0

  // CAGR
  let cagrStr = '—'
  if (primero && ultimo && primero.fecha !== ultimo.fecha) {
    const { year: y1, month: m1 } = periodoToYearMonth(primero.periodo)
    const { year: y2, month: m2 } = periodoToYearMonth(ultimo.periodo)
    const years = ((y2 - y1) * 12 + (m2 - m1)) / 12
    if (years > 0 && totalInicio > 0) {
      cagrStr = `${cagr(totalInicio, totalActual, years).toFixed(2)}%`
    }
  }

  // Evolución anual (último registro de cada año)
  const byYear: Record<number, HistorialMensual> = {}
  for (const h of valid) {
    const { year } = periodoToYearMonth(h.periodo)
    byYear[year] = h
  }
  const evAnual = Object.entries(byYear)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([year, h]) => {
      const t = h.totalPEN + h.totalUSD * h.tipoCambio
      return `  ${year}: S/ ${fmt(t)} (PEN: S/ ${fmt(h.totalPEN)} | USD: $${fmt(h.totalUSD)} × ${h.tipoCambio.toFixed(3)} = S/ ${fmt(h.totalUSD * h.tipoCambio)})`
    })
    .join('\n')

  // Últimos 6 meses
  const ultimos6 = valid.slice(-6).map(h => {
    const t = h.totalPEN + h.totalUSD * h.tipoCambio
    return `  ${h.periodo}: S/ ${fmt(t)}`
  }).join('\n')

  // Rendimientos por instrumento
  const byInstr: Record<string, { pen: number; usd: number; count: number }> = {}
  for (const r of rendimientos) {
    if (r.esTraspaso) continue
    if (!byInstr[r.instrumentoNombre]) byInstr[r.instrumentoNombre] = { pen: 0, usd: 0, count: 0 }
    byInstr[r.instrumentoNombre].pen += r.gananciasPEN ?? 0
    byInstr[r.instrumentoNombre].usd += r.gananciasUSD ?? 0
    byInstr[r.instrumentoNombre].count++
  }
  const rendStr = Object.entries(byInstr)
    .sort(([, a], [, b]) => (b.pen + b.usd * tc) - (a.pen + a.usd * tc))
    .map(([nombre, v]) => {
      const total = v.pen + v.usd * tc
      return `  ${nombre}: S/ ${fmt(total)} (${v.count} registro${v.count !== 1 ? 's' : ''})`
    })
    .join('\n') || '  Sin registros'

  // Rendimientos por año
  const rendByYear: Record<number, number> = {}
  for (const r of rendimientos) {
    if (r.esTraspaso) continue
    rendByYear[r.anio] = (rendByYear[r.anio] ?? 0) + (r.gananciasPEN ?? 0) + (r.gananciasUSD ?? 0) * tc
  }
  const rendAnualStr = Object.entries(rendByYear)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([y, v]) => `  ${y}: S/ ${fmt(v)}`)
    .join('\n') || '  Sin datos'

  // Flujo de caja
  const ingresos = flujoCaja.filter(f => f.tipo === 'Income' && f.activo)
  const egresos = flujoCaja.filter(f => f.tipo === 'Expense' && f.activo)
  const totalIngPEN = ingresos.reduce((s, f) => s + (f.montoPEN ?? 0) + (f.montoUSD ?? 0) * tc, 0)
  const totalEgrPEN = egresos.reduce((s, f) => s + (f.montoPEN ?? 0) + (f.montoUSD ?? 0) * tc, 0)
  const flujoNeto = totalIngPEN - totalEgrPEN
  const tasaAhorro = totalIngPEN > 0 ? (flujoNeto / totalIngPEN * 100) : 0

  const ingresosStr = ingresos.map(f => {
    const m = (f.montoPEN ?? 0) + (f.montoUSD ?? 0) * tc
    return `  - ${f.nombre}: S/ ${fmt(m)}/mes`
  }).join('\n') || '  Sin datos'

  const egresosStr = egresos.map(f => {
    const m = (f.montoPEN ?? 0) + (f.montoUSD ?? 0) * tc
    return `  - ${f.nombre}${f.categoria ? ` [${f.categoria}]` : ''}: S/ ${fmt(m)}/mes`
  }).join('\n') || '  Sin datos'

  // Enfoque-specific question
  const preguntaMap: Record<Enfoque, string> = {
    general: `Con toda esta información, dame un análisis holístico de mi situación financiera actual:
- ¿Qué está funcionando bien?
- ¿Cuáles son mis principales debilidades o riesgos?
- ¿Qué 3 acciones concretas me recomiendas priorizar?`,
    optimizacion: `Con esta información, ayúdame a optimizar mi portafolio:
- ¿Mi asignación actual entre PEN y USD es óptima dado mi perfil?
- ¿Qué instrumentos tienen mejor relación retorno/riesgo?
- ¿Dónde debería reasignar capital para maximizar rendimiento?
- ¿Mi tasa de ahorro es adecuada? ¿Dónde recortar?`,
    proyeccion: `Analiza si voy en la trayectoria correcta hacia mis metas:
- Con mi CAGR histórico, ¿a dónde llego en 10, 20 y 25 años?
- ¿Qué tasa de ahorro/inversión necesito para retirarme a los 55 con independencia financiera?
- ¿Estoy acumulando lo suficiente por año dado mi nivel de ingresos?
- Dame escenarios: conservador, base y optimista.`,
    riesgo: `Evalúa los riesgos de mi situación financiera:
- ¿Qué tan concentrado está mi portafolio?
- ¿Cuál es mi exposición cambiaria PEN/USD y es adecuada?
- ¿Cuánto tiempo podría sostener mis gastos si pierdo mis ingresos laborales?
- ¿Qué eventos adversos podrían destruir mi plan? ¿Cómo mitigarlos?`,
  }

  const enfoqueLabel = ENFOQUES.find(e => e.id === enfoque)?.label ?? ''

  return `# Contexto financiero personal — ${new Date().toLocaleDateString('es-PE')}

## PATRIMONIO ACTUAL
- Período: ${ultimo?.periodo ?? '—'}
- Total en PEN: S/ ${fmt(totalActual)}
  - PEN directo: S/ ${fmt(ultimo?.totalPEN ?? 0)}
  - USD convertido: $${fmt(ultimo?.totalUSD ?? 0)} × ${(ultimo?.tipoCambio ?? tc).toFixed(3)} = S/ ${fmt((ultimo?.totalUSD ?? 0) * (ultimo?.tipoCambio ?? tc))}
- TC referencia (Rextie): ${tc.toFixed(3)}
- Período de seguimiento: ${primero?.periodo ?? '—'} → ${ultimo?.periodo ?? '—'}
- CAGR histórico: ${cagrStr}

## EVOLUCIÓN ANUAL (último registro de cada año)
${evAnual || '  Sin datos'}

## ÚLTIMOS 6 MESES
${ultimos6 || '  Sin datos'}

## RENDIMIENTOS DE INVERSIONES

Por instrumento (acumulado histórico):
${rendStr}

Por año:
${rendAnualStr}

## FLUJO DE CAJA MENSUAL

Ingresos activos (S/ ${fmt(totalIngPEN)}/mes):
${ingresosStr}

Egresos activos (S/ ${fmt(totalEgrPEN)}/mes):
${egresosStr}

Flujo neto: S/ ${fmt(flujoNeto)}/mes
Tasa de ahorro: ${tasaAhorro.toFixed(1)}%

---

## SOLICITUD — ${enfoqueLabel.toUpperCase()}

${preguntaMap[enfoque]}

Responde en español. Sé directo y específico — no genérico. Usa los números reales del contexto para fundamentar cada punto.`
}

// ─── Prompt Modal ────────────────────────────────────────────────────────────

function PromptModal({
  historial,
  rendimientos,
  flujoCaja,
  onClose,
}: {
  historial: HistorialMensual[]
  rendimientos: Rendimiento[]
  flujoCaja: FlujoCajaItem[]
  onClose: () => void
}) {
  const [enfoque, setEnfoque] = useState<Enfoque>('general')
  const [copied, setCopied] = useState(false)

  const tc = useMemo(() => {
    const valid = historial.filter(h => !h.nota).sort((a, b) => b.fecha.localeCompare(a.fecha))
    return valid[0]?.tipoCambio ?? 3.7
  }, [historial])

  const prompt = useMemo(
    () => buildPrompt(historial, rendimientos, flujoCaja, enfoque, tc),
    [historial, rendimientos, flujoCaja, enfoque, tc]
  )

  function handleCopy() {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col"
        style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-borde)' }}>
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: 'var(--color-acento)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--color-texto)' }}>Prompt para IA</span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-muted)' }} className="hover:opacity-70">
            <XIcon size={18} />
          </button>
        </div>

        {/* Enfoque selector */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-borde)' }}>
          <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>¿Qué tipo de análisis quieres?</p>
          <div className="grid grid-cols-2 gap-2">
            {ENFOQUES.map(e => (
              <button
                key={e.id}
                onClick={() => setEnfoque(e.id)}
                className="text-left px-3 py-2.5 rounded-xl text-sm"
                style={{
                  background: enfoque === e.id ? 'var(--color-acento)20' : 'var(--color-card)',
                  border: `1px solid ${enfoque === e.id ? 'var(--color-acento)' : 'var(--color-borde)'}`,
                  color: enfoque === e.id ? 'var(--color-acento)' : 'var(--color-texto)',
                }}
              >
                <span className="font-medium block">{e.label}</span>
                <span className="text-xs mt-0.5 block opacity-70">{e.descripcion}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt preview */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <pre
            className="text-xs leading-relaxed whitespace-pre-wrap font-mono rounded-xl p-4"
            style={{ background: 'var(--color-card)', color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}
          >
            {prompt}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-borde)' }}>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Pégalo en ChatGPT, Claude o cualquier IA
          </p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: copied ? '#22c55e' : 'var(--color-acento)' }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copiado' : 'Copiar prompt'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Main Analytics component
// ════════════════════════════════════════════════════════════════════════════

const TABS: { id: Tab; label: string }[] = [
  { id: 'patrimonio', label: 'Patrimonio' },
  { id: 'flujo-real', label: 'Flujo real' },
  { id: 'rendimientos', label: 'Rendimientos' },
]

export default function Analytics() {
  const [tab, setTab] = useState<Tab>('patrimonio')
  const [showPrompt, setShowPrompt] = useState(false)
  const { historial } = usePatrimony()
  const { rendimientos, flujoCaja } = useFinanceData()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Análisis</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Reportería y gráficos sobre tu historial financiero
          </p>
        </div>
        <button
          onClick={() => setShowPrompt(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--color-acento)20', color: 'var(--color-acento)', border: '1px solid var(--color-acento)' }}
        >
          <Sparkles size={15} />
          Generar prompt para IA
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: tab === t.id ? 'var(--color-acento)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--color-muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'patrimonio'   && <PatrimonioTab />}
      {tab === 'flujo-real'   && <FlujoRealTab />}
      {tab === 'rendimientos' && <RendimientosTab />}

      {showPrompt && (
        <PromptModal
          historial={historial}
          rendimientos={rendimientos}
          flujoCaja={flujoCaja}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </div>
  )
}
