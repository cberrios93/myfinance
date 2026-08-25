import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'
import { useScenario } from '../../data/ScenarioContext'
import { useConfig } from '../../config/ConfigContext'
import { normalizeSeed } from '../../data/seedUtils'
import rawSemilla from '../../../seed/cesar-2026.json'
const cesarSemilla = normalizeSeed(rawSemilla)

const CATEGORIA_COLORES = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
]

function fmt(n: number) {
  if (n >= 1_000_000) return `S/${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `S/${(n / 1_000).toFixed(1)}k`
  return `S/${n.toFixed(0)}`
}

function fmtMensual(n: number) {
  return `S/${n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`
}

export default function Dashboard() {
  const { escenarioActivo, resultadoActivo, cargarSemilla } = useScenario()
  const { acento } = useConfig()

  const categorias = useMemo(() => {
    if (!escenarioActivo) return []
    const cats = [...new Set(escenarioActivo.instrumentos.map(i => i.categoria))]
    return cats
  }, [escenarioActivo])

  const chartData = useMemo(() => {
    if (!resultadoActivo) return []
    return resultadoActivo.anios.map(a => {
      const row: Record<string, number | string> = {
        edad: a.edad,
        total: Math.round(a.total),
        ingresoMensual: Math.round(a.ingresoMensual),
      }
      // Agrupar balances por categoría
      if (escenarioActivo) {
        for (const cat of categorias) {
          const instsCat = escenarioActivo.instrumentos.filter(i => i.categoria === cat)
          row[cat] = Math.round(instsCat.reduce((s, i) => s + (a.balances[i.id] ?? 0), 0))
        }
      }
      return row
    })
  }, [resultadoActivo, escenarioActivo, categorias])

  if (!escenarioActivo || !resultadoActivo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
        <div className="text-5xl">📊</div>
        <div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-texto)' }}>Sin escenarios</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
            No hay ningún escenario activo. Crea uno o carga el ejemplo para comenzar.
          </p>
        </div>
        <button
          onClick={() => cargarSemilla(cesarSemilla as Parameters<typeof cargarSemilla>[0])}
          className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white"
          style={{ background: acento }}
        >
          Cargar datos de ejemplo
        </button>
      </div>
    )
  }

  const anioObjetivo = resultadoActivo.anios.find(a => a.edad === escenarioActivo.general.edadRetiro)
  const capitalHoy = resultadoActivo.anios[0]?.total ?? 0
  const capitalRetiro = anioObjetivo?.total ?? 0
  const ingresoRetiro = anioObjetivo?.ingresoMensual ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>
            {escenarioActivo.nombre}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Objetivo a los {escenarioActivo.general.edadRetiro} años · SWR {(escenarioActivo.general.swr * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Métricas clave */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Capital hoy" value={fmt(capitalHoy)} sub={`${escenarioActivo.general.edadActual} años`} />
        <MetricCard label={`Capital objetivo (${escenarioActivo.general.edadRetiro} años)`} value={fmt(capitalRetiro)} />
        <MetricCard label="Ingreso mensual proyectado" value={fmtMensual(ingresoRetiro)} />
        {escenarioActivo.general.metas.map(meta => {
          const edadAlcanzada = resultadoActivo.metasAlcanzadas[meta.nombre]
          return (
            <MetricCard
              key={meta.nombre}
              label={meta.nombre}
              value={edadAlcanzada ? `${edadAlcanzada} años` : 'No alcanzada'}
              sub={`${fmtMensual(meta.montoMensual)}/mes`}
              highlight={!!edadAlcanzada}
            />
          )
        })}
      </div>

      {/* Gráfico de patrimonio */}
      <div className="rounded-xl p-4 lg:p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-texto)' }}>
          Evolución del patrimonio por categoría
        </h2>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
            <XAxis dataKey="edad" tick={{ fill: 'var(--color-muted)', fontSize: 12 }} label={{ value: 'Edad', position: 'insideBottom', offset: -2, fill: 'var(--color-muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} />
            <Tooltip
              contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', borderRadius: 8, color: 'var(--color-texto)' }}
              formatter={(value) => [fmt(Number(value)), '']}
              labelFormatter={(label) => `Edad: ${label}`}
            />
            <Legend wrapperStyle={{ color: 'var(--color-muted)', fontSize: 12 }} />
            {categorias.map((cat, i) => (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                stackId="1"
                stroke={CATEGORIA_COLORES[i % CATEGORIA_COLORES.length]}
                fill={CATEGORIA_COLORES[i % CATEGORIA_COLORES.length]}
                fillOpacity={0.7}
              />
            ))}
            {/* Líneas de referencia para metas */}
            {escenarioActivo.general.metas.map((meta) => {
              const edadAlcanzada = resultadoActivo.metasAlcanzadas[meta.nombre]
              if (!edadAlcanzada) return null
              return (
                <ReferenceLine
                  key={meta.nombre}
                  x={edadAlcanzada}
                  stroke={acento}
                  strokeDasharray="4 4"
                  label={{ value: meta.nombre, fill: acento, fontSize: 10, position: 'top' }}
                />
              )
            })}
            <ReferenceLine
              x={escenarioActivo.general.edadRetiro}
              stroke="#EF4444"
              strokeDasharray="6 2"
              label={{ value: 'Objetivo', fill: '#EF4444', fontSize: 10, position: 'top' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla resumen */}
      <div className="rounded-xl p-4 lg:p-6 overflow-x-auto" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-texto)' }}>
          Proyección año a año
        </h2>
        <table className="w-full text-sm" style={{ color: 'var(--color-texto)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-borde)' }}>
              <th className="text-left py-2 px-2" style={{ color: 'var(--color-muted)' }}>Edad</th>
              <th className="text-left py-2 px-2" style={{ color: 'var(--color-muted)' }}>Año</th>
              <th className="text-right py-2 px-2" style={{ color: 'var(--color-muted)' }}>Capital total</th>
              <th className="text-right py-2 px-2" style={{ color: 'var(--color-muted)' }}>Ingreso mensual</th>
            </tr>
          </thead>
          <tbody>
            {resultadoActivo.anios.map(a => (
              <tr key={a.anioT} className="border-b transition-colors hover:opacity-80" style={{ borderColor: 'var(--color-borde)' }}>
                <td className="py-1.5 px-2 font-medium">{a.edad}</td>
                <td className="py-1.5 px-2" style={{ color: 'var(--color-muted)' }}>{a.anioCalendario}</td>
                <td className="py-1.5 px-2 text-right font-mono">{fmt(a.total)}</td>
                <td className="py-1.5 px-2 text-right font-mono" style={{ color: 'var(--color-acento)' }}>{fmtMensual(a.ingresoMensual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
      <p className="text-xs mb-1 truncate" style={{ color: 'var(--color-muted)' }}>{label}</p>
      <p className={`text-xl font-bold font-mono`} style={{ color: highlight ? 'var(--color-acento)' : 'var(--color-texto)' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{sub}</p>}
    </div>
  )
}
