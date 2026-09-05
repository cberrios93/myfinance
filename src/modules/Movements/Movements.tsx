import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useScenario } from '../../data/ScenarioContext'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import type { Movimiento } from '../../data/types'

const EMPTY: Omit<Movimiento, 'id'> = {
  anioT: 1,
  desdeInstrumentoId: null,
  haciaInstrumentoId: null,
  monto: 0,
}

export default function Movements() {
  const { escenarioActivo, actualizarEscenario } = useScenario()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Movimiento | null>(null)
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState<Movimiento>({ id: '', ...EMPTY })

  if (!escenarioActivo) return <Empty />

  const { anioActual, edadActual, edadRetiro } = escenarioActivo.general
  const tToAnio = (t: number) => anioActual + t
  const tToEdad = (t: number) => edadActual + t
  const anioMaximo = anioActual + (edadRetiro - edadActual)
  const aniosDisponibles = Array.from(
    { length: anioMaximo - anioActual },
    (_, i) => anioActual + i + 1
  )

  const { movimientos, instrumentos } = escenarioActivo

  function instNombre(id: string | null) {
    if (!id) return '(externo)'
    return instrumentos.find(i => i.id === id)?.nombre ?? id
  }

  function montoLabel(m: number | 'todo') {
    if (m === 'todo') return 'Todo el saldo'
    return `S/${m.toLocaleString()}`
  }

  async function save(lista: Movimiento[]) {
    await actualizarEscenario({ ...escenarioActivo!, movimientos: lista })
  }

  async function saveEdit() {
    if (!draft) return
    await save(movimientos.map(m => m.id === draft.id ? draft : m))
    setEditingId(null); setDraft(null)
  }

  async function del(id: string) {
    await save(movimientos.filter(m => m.id !== id))
  }

  async function confirmAdd() {
    if (!newDraft) return
    await save([...movimientos, { ...newDraft, id: uuid() }])
    setAdding(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Movimientos de capital</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Reasignaciones entre instrumentos en un año específico.
          </p>
        </div>
        <button onClick={() => { setNewDraft({ id: '', ...EMPTY }); setAdding(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--color-acento)' }}>
          <Plus size={16} /> Agregar
        </button>
      </div>

      {movimientos.length === 0 && !adding && (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No hay movimientos definidos. Los movimientos permiten redirigir capital entre instrumentos en un año específico.</p>
        </div>
      )}

      <div className="space-y-3">
        {movimientos.sort((a, b) => a.anioT - b.anioT).map(mov => (
          <div key={mov.id} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            {editingId === mov.id && draft ? (
              <MovimientoForm value={draft} onChange={setDraft} instrumentos={instrumentos} onSave={saveEdit} onCancel={() => { setEditingId(null); setDraft(null) }} anioActual={anioActual} edadActual={edadActual} aniosDisponibles={aniosDisponibles} />
            ) : (
              <div className="flex items-center gap-3">
                <div style={{ minWidth: 80 }}>
                  <span className="text-sm font-mono font-bold" style={{ color: 'var(--color-acento)' }}>{tToAnio(mov.anioT)}</span>
                  <span className="text-xs ml-1.5" style={{ color: 'var(--color-muted)' }}>{tToEdad(mov.anioT)} años</span>
                </div>
                <div className="flex-1 text-sm" style={{ color: 'var(--color-texto)' }}>
                  {instNombre(mov.desdeInstrumentoId)} → {instNombre(mov.haciaInstrumentoId)} · {montoLabel(mov.monto)}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(mov.id); setDraft({ ...mov }) }} className="p-1.5 hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Edit2 size={14} /></button>
                  <button onClick={() => del(mov.id)} className="p-1.5 hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            )}
          </div>
        ))}

        {adding && (
          <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-texto)' }}>Nuevo movimiento</p>
            <MovimientoForm value={newDraft} onChange={setNewDraft} instrumentos={instrumentos} onSave={confirmAdd} onCancel={() => setAdding(false)} anioActual={anioActual} edadActual={edadActual} aniosDisponibles={aniosDisponibles} />
          </div>
        )}
      </div>
    </div>
  )
}

function MovimientoForm({ value, onChange, instrumentos, onSave, onCancel, anioActual, edadActual, aniosDisponibles }: {
  value: Movimiento
  onChange: (v: Movimiento) => void
  instrumentos: { id: string; nombre: string }[]
  onSave: () => void
  onCancel: () => void
  anioActual: number
  edadActual: number
  aniosDisponibles: number[]
}) {
  useSubmitOnCmdEnter(onSave)
  const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }
  const esMontoTodo = value.monto === 'todo'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Año</label>
          <select
            value={anioActual + value.anioT}
            onChange={e => onChange({ ...value, anioT: parseInt(e.target.value) - anioActual })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          >
            {aniosDisponibles.map(anio => (
              <option key={anio} value={anio}>{anio} — {edadActual + (anio - anioActual)} años</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Monto (S/) o "Todo"</label>
          <div className="flex gap-2">
            <input type="number" min={0} value={esMontoTodo ? '' : value.monto as number}
              disabled={esMontoTodo}
              onChange={e => onChange({ ...value, monto: parseFloat(e.target.value) || 0 })}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none font-mono" style={{ ...inputStyle, opacity: esMontoTodo ? 0.4 : 1 }} />
            <label className="flex items-center gap-1 text-xs cursor-pointer whitespace-nowrap" style={{ color: 'var(--color-texto)' }}>
              <input type="checkbox" checked={esMontoTodo} onChange={e => onChange({ ...value, monto: e.target.checked ? 'todo' : 0 })} />
              Todo
            </label>
          </div>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Desde</label>
          <select value={value.desdeInstrumentoId ?? ''} onChange={e => onChange({ ...value, desdeInstrumentoId: e.target.value || null })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            <option value="">Capital externo (no resta)</option>
            {instrumentos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Hacia</label>
          <select value={value.haciaInstrumentoId ?? ''} onChange={e => onChange({ ...value, haciaInstrumentoId: e.target.value || null })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            <option value="">Retiro del sistema (no suma)</option>
            {instrumentos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: 'var(--color-acento)' }}><Check size={14} /> Guardar</button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}><X size={14} /> Cancelar</button>
      </div>
    </div>
  )
}

function Empty() {
  return <div className="text-center py-20" style={{ color: 'var(--color-muted)' }}><p>No hay escenario activo.</p></div>
}
