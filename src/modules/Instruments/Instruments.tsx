import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, Link2, RefreshCw } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useScenario } from '../../data/ScenarioContext'
import { usePatrimony } from '../../data/PatrimonyContext'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import TipoCambioWidget from '../../components/TipoCambioWidget'
import type { Instrumento } from '../../data/types'

const CATEGORIAS_PRESET = ['Alto riesgo', 'Diversificado', 'Efectivo/pool', 'Inmobiliario', 'Renta fija', 'Otro']
const CAT_COLORES: Record<string, string> = {
  'Alto riesgo': '#EF4444',
  'Diversificado': '#3B82F6',
  'Efectivo/pool': '#10B981',
  'Inmobiliario': '#F59E0B',
  'Renta fija': '#8B5CF6',
  'Otro': '#94A3B8',
}

function catColor(cat: string) {
  return CAT_COLORES[cat] ?? '#94A3B8'
}

const EMPTY_INST: Omit<Instrumento, 'id'> = {
  nombre: '',
  montoInicial: 0,
  tasaReal: 0.05,
  categoria: 'Diversificado',
  esPool: false,
}

export default function Instruments() {
  const { escenarioActivo, actualizarEscenario } = useScenario()
  const { cuentas } = usePatrimony()
  const { tc: tcRextie } = useTipoCambio()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Instrumento | null>(null)
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState<Instrumento>({ id: '', ...EMPTY_INST })

  // TC: live de Rextie si disponible, fallback 3.7
  const tc = tcRextie?.compra ?? 3.7

  if (!escenarioActivo) return <Empty />

  const instrumentos = escenarioActivo.instrumentos

  function montoDesdePatrimonio(cuentaId: string): number {
    const c = cuentas.find(x => x.id === cuentaId)
    if (!c) return 0
    return (c.montoPEN ?? 0) + (c.montoUSD ?? 0) * tc
  }

  function startEdit(inst: Instrumento) {
    setEditingId(inst.id)
    setDraft({ ...inst })
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(null)
  }

  async function saveEdit() {
    if (!draft || !escenarioActivo) return
    const updated = instrumentos.map(i => i.id === draft.id ? draft : i)
    await actualizarEscenario({ ...escenarioActivo, instrumentos: updated })
    cancelEdit()
  }

  async function deleteInst(id: string) {
    if (!escenarioActivo) return
    const updated = instrumentos.filter(i => i.id !== id)
    await actualizarEscenario({ ...escenarioActivo, instrumentos: updated })
  }

  function startAdd() {
    setNewDraft({ id: uuid(), ...EMPTY_INST })
    setAdding(true)
  }

  async function confirmAdd() {
    if (!escenarioActivo || !newDraft.nombre.trim()) return
    await actualizarEscenario({ ...escenarioActivo, instrumentos: [...instrumentos, newDraft] })
    setAdding(false)
  }

  const totalInicial = instrumentos.reduce((s, i) => {
    const monto = i.cuentaPatrimonioId ? montoDesdePatrimonio(i.cuentaPatrimonioId) : i.montoInicial
    return s + monto
  }, 0)

  const hayVinculados = instrumentos.some(i => i.cuentaPatrimonioId)
  const hayDesync = instrumentos.some(i =>
    i.cuentaPatrimonioId && Math.abs(montoDesdePatrimonio(i.cuentaPatrimonioId) - i.montoInicial) > 1
  )

  async function sincronizarDesdePatrimonio() {
    if (!escenarioActivo) return
    const actualizados = instrumentos.map(i => {
      if (!i.cuentaPatrimonioId) return i
      return { ...i, montoInicial: montoDesdePatrimonio(i.cuentaPatrimonioId) }
    })
    await actualizarEscenario({ ...escenarioActivo, instrumentos: actualizados })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Instrumentos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            {instrumentos.length} instrumento{instrumentos.length !== 1 ? 's' : ''} · Total inicial: S/{Math.round(totalInicial).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <TipoCambioWidget autoFetch={false} />
          {hayVinculados && (
            <button
              onClick={sincronizarDesdePatrimonio}
              title="Actualiza los montos de instrumentos vinculados con los valores actuales de Patrimonio"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                border: `1px solid ${hayDesync ? '#F59E0B' : 'var(--color-borde)'}`,
                color: hayDesync ? '#F59E0B' : 'var(--color-muted)',
                background: hayDesync ? '#F59E0B10' : 'transparent',
              }}
            >
              <RefreshCw size={14} /> Sincronizar{hayDesync ? ' ⚠' : ''}
            </button>
          )}
          <button
            onClick={startAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--color-acento)' }}
          >
            <Plus size={16} /> Agregar
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {adding && (
          <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-texto)' }}>Nuevo instrumento</p>
            <InstrumentoForm
              value={newDraft}
              onChange={setNewDraft}
              onSave={confirmAdd}
              onCancel={() => setAdding(false)}
              cuentas={cuentas}
              tc={tc}
              montoDesdePatrimonio={montoDesdePatrimonio}
            />
          </div>
        )}

        {instrumentos.map(inst => {
          const montoEfectivo = inst.cuentaPatrimonioId
            ? montoDesdePatrimonio(inst.cuentaPatrimonioId)
            : inst.montoInicial
          const cuentaVinculada = inst.cuentaPatrimonioId
            ? cuentas.find(c => c.id === inst.cuentaPatrimonioId)
            : null

          return (
            <div key={inst.id} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
              {editingId === inst.id && draft ? (
                <InstrumentoForm
                  value={draft}
                  onChange={setDraft}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                  cuentas={cuentas}
                  tc={tc}
                  montoDesdePatrimonio={montoDesdePatrimonio}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: catColor(inst.categoria) }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate" style={{ color: 'var(--color-texto)' }}>{inst.nombre}</span>
                      {inst.esPool && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-acento)20', color: 'var(--color-acento)' }}>Pool</span>
                      )}
                      {cuentaVinculada && (
                        <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ background: '#10B98115', color: '#10B981' }}>
                          <Link2 size={10} /> {cuentaVinculada.nombre}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-0.5 text-xs flex-wrap" style={{ color: 'var(--color-muted)' }}>
                      <span className={cuentaVinculada ? 'font-semibold' : ''} style={cuentaVinculada ? { color: '#10B981' } : {}}>
                        S/{Math.round(montoEfectivo).toLocaleString()}
                        {cuentaVinculada ? ' (desde Patrimonio)' : ''}
                      </span>
                      <span>{(inst.tasaReal * 100).toFixed(1)}% real anual</span>
                      <span>{inst.categoria}</span>
                      {inst.cambioTasa && (
                        <span>→ {(inst.cambioTasa.nuevaTasa * 100).toFixed(1)}% desde año {inst.cambioTasa.anioT}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(inst)} className="p-1.5 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Edit2 size={14} /></button>
                    <button onClick={() => deleteInst(inst.id)} className="p-1.5 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InstrumentoForm({
  value, onChange, onSave, onCancel, cuentas, tc, montoDesdePatrimonio
}: {
  value: Instrumento
  onChange: (v: Instrumento) => void
  onSave: () => void
  onCancel: () => void
  cuentas: import('../../data/types').CuentaPatrimonio[]
  tc: number
  montoDesdePatrimonio: (id: string) => number
}) {
  useSubmitOnCmdEnter(onSave)
  const inputStyle = {
    background: 'var(--color-fondo)',
    color: 'var(--color-texto)',
    border: '1px solid var(--color-borde)',
  }

  const isVinculado = !!value.cuentaPatrimonioId
  const montoVinculado = isVinculado ? montoDesdePatrimonio(value.cuentaPatrimonioId!) : null

  function handleVincular(cuentaId: string) {
    if (!cuentaId) {
      onChange({ ...value, cuentaPatrimonioId: undefined })
      return
    }
    const cuenta = cuentas.find(c => c.id === cuentaId)
    const monto = montoDesdePatrimonio(cuentaId)
    onChange({
      ...value,
      cuentaPatrimonioId: cuentaId,
      nombre: value.nombre || (cuenta?.nombre ?? ''),
      montoInicial: monto,
    })
  }

  return (
    <div className="space-y-3">
      {/* Vinculación a Patrimonio */}
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>
          Vincular a cuenta de Patrimonio <span style={{ color: 'var(--color-acento)' }}>(opcional)</span>
        </label>
        <select
          value={value.cuentaPatrimonioId ?? ''}
          onChange={e => handleVincular(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
        >
          <option value="">Sin vincular</option>
          {cuentas.map(c => {
            const monto = montoDesdePatrimonio(c.id)
            const montoLabel = c.montoPEN != null && c.montoUSD != null
              ? `S/${Math.round(c.montoPEN).toLocaleString()} + $${Math.round(c.montoUSD).toLocaleString()} × TC`
              : c.montoPEN != null
              ? `S/${Math.round(c.montoPEN).toLocaleString()}`
              : c.montoUSD != null
              ? `$${Math.round(c.montoUSD).toLocaleString()} → S/${Math.round(monto).toLocaleString()}`
              : ''
            return (
              <option key={c.id} value={c.id}>{c.nombre} {montoLabel ? `· ${montoLabel}` : ''}</option>
            )
          })}
        </select>
        {isVinculado && montoVinculado != null && (
          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#10B981' }}>
            <Link2 size={11} /> Monto tomado de Patrimonio: S/{Math.round(montoVinculado).toLocaleString()}
            {' '}(TC: {tc.toFixed(2)})
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Nombre</label>
          <input
            value={value.nombre}
            onChange={e => onChange({ ...value, nombre: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            placeholder="Ej. Schwab ETF"
          />
        </div>
        <div>
          <label className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
            Monto inicial (S/)
            {isVinculado && <span className="px-1 rounded text-xs" style={{ background: '#10B98120', color: '#10B981' }}>sincronizado</span>}
          </label>
          <input
            type="number" min={0}
            value={isVinculado ? (montoVinculado ?? 0) : value.montoInicial}
            onChange={e => !isVinculado && onChange({ ...value, montoInicial: parseFloat(e.target.value) || 0 })}
            readOnly={isVinculado}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
            style={{ ...inputStyle, opacity: isVinculado ? 0.6 : 1, cursor: isVinculado ? 'not-allowed' : 'auto' }}
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Tasa real anual (%)</label>
          <input
            type="number" min={-20} max={50} step={0.1}
            value={parseFloat((value.tasaReal * 100).toFixed(3))}
            onChange={e => onChange({ ...value, tasaReal: (parseFloat(e.target.value) || 0) / 100 })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Categoría</label>
          <select
            value={value.categoria}
            onChange={e => onChange({ ...value, categoria: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          >
            {CATEGORIAS_PRESET.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-texto)' }}>
          <input
            type="checkbox"
            checked={value.esPool}
            onChange={e => onChange({ ...value, esPool: e.target.checked })}
          />
          Es el Pool (recibe aportes y absorbe pagos)
        </label>
      </div>

      <details>
        <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-muted)' }}>Cambio de tasa (opcional)</summary>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>A partir del año T</label>
            <input
              type="number" min={1}
              value={value.cambioTasa?.anioT ?? ''}
              onChange={e => {
                const v = parseInt(e.target.value)
                onChange({ ...value, cambioTasa: v ? { anioT: v, nuevaTasa: value.cambioTasa?.nuevaTasa ?? 0 } : undefined })
              }}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
              style={inputStyle}
              placeholder="Ej. 4"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Nueva tasa (%)</label>
            <input
              type="number" min={-20} max={50} step={0.1}
              value={value.cambioTasa ? parseFloat((value.cambioTasa.nuevaTasa * 100).toFixed(3)) : ''}
              onChange={e => {
                const v = parseFloat(e.target.value) / 100
                onChange({ ...value, cambioTasa: value.cambioTasa ? { ...value.cambioTasa, nuevaTasa: v } : undefined })
              }}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
              style={inputStyle}
              placeholder="Ej. 12"
            />
          </div>
        </div>
      </details>

      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: 'var(--color-acento)' }}>
          <Check size={14} /> Guardar
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
          <X size={14} /> Cancelar
        </button>
      </div>
    </div>
  )
}

function Empty() {
  return (
    <div className="text-center py-20" style={{ color: 'var(--color-muted)' }}>
      <p>No hay escenario activo.</p>
    </div>
  )
}
