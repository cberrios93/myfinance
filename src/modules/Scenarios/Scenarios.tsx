import { useState } from 'react'
import { Plus, Trash2, Copy, GitCompare, Edit2, Check, X, Settings2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useScenario } from '../../data/ScenarioContext'
import { simular } from '../../engine/calculator'
import rawSemilla from '../../../seed/cesar-2026.json'
import { normalizeSeed } from '../../data/seedUtils'
const cesarSemilla = normalizeSeed(rawSemilla)

const COMPARE_COLORS = ['#3B82F6', '#10B981', '#F59E0B']

function fmt(n: number) {
  if (n >= 1_000_000) return `S/${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `S/${(n / 1_000).toFixed(1)}k`
  return `S/${n.toFixed(0)}`
}

export default function Scenarios() {
  const { escenarios, escenarioActivo, seleccionarEscenario, actualizarEscenario, crearEscenario, duplicarEscenario, borrarEscenario, cargarSemilla } = useScenario()
  const navigate = useNavigate()
  const [nuevonombre, setNuevoNombre] = useState('')
  const [creando, setCreando] = useState(false)
  const [comparando, setComparando] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  async function handleRename(esc: typeof escenarios[0]) {
    const nombre = renameValue.trim()
    if (!nombre || nombre === esc.nombre) { setRenamingId(null); return }
    await actualizarEscenario({ ...esc, nombre })
    setRenamingId(null)
  }

  function startRename(esc: typeof escenarios[0]) {
    setRenamingId(esc.id)
    setRenameValue(esc.nombre)
  }

  function handleEditarParametros(id: string) {
    seleccionarEscenario(id)
    navigate('/parametros')
  }

  async function handleCrear() {
    if (!nuevonombre.trim()) return
    setLoading(true)
    try {
      await crearEscenario(nuevonombre.trim())
      setNuevoNombre('')
      setCreando(false)
    } finally {
      setLoading(false)
    }
  }

  function toggleComparar(id: string) {
    setComparando(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  const escenariosCompara = comparando.map(id => escenarios.find(e => e.id === id)).filter(Boolean) as typeof escenarios

  const chartDataCompara = (() => {
    if (escenariosCompara.length === 0) return []
    const result = simular(escenariosCompara[0]).anios
    return result.map(a => {
      const row: Record<string, number | string> = { edad: a.edad }
      escenariosCompara.forEach((esc, i) => {
        const res = simular(esc)
        const anio = res.anios.find(x => x.edad === a.edad)
        row[`esc${i}`] = anio?.total ?? 0
      })
      return row
    })
  })()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Escenarios</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            {escenarios.length} escenario{escenarios.length !== 1 ? 's' : ''} guardados
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => cargarSemilla(cesarSemilla as Parameters<typeof cargarSemilla>[0])}
            className="px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--color-borde)', color: 'var(--color-muted)' }}>
            Cargar ejemplo
          </button>
          <button onClick={() => setCreando(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--color-acento)' }}>
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      {creando && (
        <div className="rounded-xl p-4 flex gap-3 items-center" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
          <input
            value={nuevonombre}
            onChange={e => setNuevoNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCrear()}
            autoFocus
            placeholder="Nombre del escenario"
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }}
          />
          <button onClick={handleCrear} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--color-acento)' }}>
            Crear
          </button>
          <button onClick={() => setCreando(false)} className="px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--color-muted)' }}>
            Cancelar
          </button>
        </div>
      )}

      <div className="space-y-3">
        {escenarios.map(esc => {
          const isActivo = escenarioActivo?.id === esc.id
          const isComparando = comparando.includes(esc.id)
          const isRenaming = renamingId === esc.id
          const resumen = simular(esc)
          const retiro = resumen.anios.find(a => a.edad === esc.general.edadRetiro)
          return (
            <div key={esc.id} className="rounded-xl p-4 transition-all" style={{
              background: 'var(--color-card)',
              border: isActivo ? '2px solid var(--color-acento)' : '1px solid var(--color-borde)',
            }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(esc); if (e.key === 'Escape') setRenamingId(null) }}
                        className="flex-1 px-2 py-1 rounded-lg text-sm font-semibold outline-none"
                        style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-acento)' }}
                      />
                      <button onClick={() => handleRename(esc)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-acento)' }}><Check size={14} /></button>
                      <button onClick={() => setRenamingId(null)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => seleccionarEscenario(esc.id)}>
                      <span className="font-semibold text-sm" style={{ color: 'var(--color-texto)' }}>{esc.nombre}</span>
                      {isActivo && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-acento)20', color: 'var(--color-acento)' }}>Activo</span>}
                    </div>
                  )}
                  <div className="flex gap-4 mt-1 text-xs flex-wrap" style={{ color: 'var(--color-muted)' }}>
                    <span>{esc.general.edadActual} → {esc.general.edadRetiro} años</span>
                    {retiro && <span>Capital: {fmt(retiro.total)}</span>}
                    {retiro && <span>Ingreso: S/{Math.round(retiro.ingresoMensual).toLocaleString()}/mes</span>}
                    <button
                      onClick={() => handleEditarParametros(esc.id)}
                      className="flex items-center gap-1 hover:opacity-80"
                      style={{ color: 'var(--color-acento)' }}
                    >
                      <Settings2 size={11} /> Editar parámetros
                    </button>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startRename(esc)} title="Renombrar" className="p-2 rounded-lg hover:opacity-70" style={{ color: 'var(--color-muted)' }}>
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => toggleComparar(esc.id)}
                    title="Comparar"
                    className="p-2 rounded-lg hover:opacity-70"
                    style={{ color: isComparando ? 'var(--color-acento)' : 'var(--color-muted)', background: isComparando ? 'var(--color-acento)15' : 'transparent' }}
                  >
                    <GitCompare size={15} />
                  </button>
                  <button onClick={() => duplicarEscenario(esc.id)} title="Duplicar" className="p-2 rounded-lg hover:opacity-70" style={{ color: 'var(--color-muted)' }}>
                    <Copy size={15} />
                  </button>
                  <button onClick={() => borrarEscenario(esc.id)} title="Eliminar" className="p-2 rounded-lg hover:opacity-70" style={{ color: 'var(--color-muted)' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparación */}
      {escenariosCompara.length > 1 && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-texto)' }}>
            Comparación: {escenariosCompara.map(e => e.nombre).join(' vs ')}
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartDataCompara} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
              <XAxis dataKey="edad" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} />
              <Tooltip
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', borderRadius: 8, color: 'var(--color-texto)' }}
                formatter={(v, key) => {
                  const idx = parseInt(String(key).replace('esc', ''))
                  return [fmt(Number(v)), escenariosCompara[idx]?.nombre ?? String(key)]
                }}
              />
              <Legend formatter={(key) => {
                const idx = parseInt(key.replace('esc', ''))
                return escenariosCompara[idx]?.nombre ?? key
              }} />
              {escenariosCompara.map((_, i) => (
                <Area key={i} type="monotone" dataKey={`esc${i}`} stroke={COMPARE_COLORS[i]} fill={COMPARE_COLORS[i]} fillOpacity={0.3} />
              ))}
            </AreaChart>
          </ResponsiveContainer>

          {/* Tabla comparativa */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: 'var(--color-texto)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-borde)' }}>
                  <th className="text-left py-2 px-2" style={{ color: 'var(--color-muted)' }}>Métrica</th>
                  {escenariosCompara.map(e => <th key={e.id} className="text-right py-2 px-2" style={{ color: 'var(--color-muted)' }}>{e.nombre}</th>)}
                </tr>
              </thead>
              <tbody>
                {(['Capital objetivo', 'Ingreso mensual proyectado', 'SWR', 'Edad de retiro'] as const).map(metrica => (
                  <tr key={metrica} style={{ borderBottom: '1px solid var(--color-borde)' }}>
                    <td className="py-2 px-2" style={{ color: 'var(--color-muted)' }}>{metrica}</td>
                    {escenariosCompara.map(esc => {
                      const res = simular(esc)
                      const retiro = res.anios.find(a => a.edad === esc.general.edadRetiro)
                      let val = ''
                      if (metrica === 'Capital objetivo') val = fmt(retiro?.total ?? 0)
                      if (metrica === 'Ingreso mensual proyectado') val = `S/${Math.round(retiro?.ingresoMensual ?? 0).toLocaleString()}`
                      if (metrica === 'SWR') val = `${(esc.general.swr * 100).toFixed(2)}%`
                      if (metrica === 'Edad de retiro') val = `${esc.general.edadRetiro} años`
                      return <td key={esc.id} className="py-2 px-2 text-right font-mono">{val}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
