import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useScenario } from '../../data/ScenarioContext'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import type { EventoVida } from '../../data/types'

const EMPTY: EventoVida = { id: '', nombre: '' }

export default function LifeEvents() {
  const { escenarioActivo, actualizarEscenario } = useScenario()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EventoVida | null>(null)
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState<EventoVida>({ ...EMPTY })

  if (!escenarioActivo) return <Empty />

  const { eventosVida } = escenarioActivo

  async function save(lista: EventoVida[]) {
    await actualizarEscenario({ ...escenarioActivo!, eventosVida: lista })
  }

  async function saveEdit() {
    if (!draft) return
    await save(eventosVida.map(e => e.id === draft.id ? draft : e))
    setEditingId(null); setDraft(null)
  }

  async function del(id: string) {
    await save(eventosVida.filter(e => e.id !== id))
  }

  async function confirmAdd() {
    await save([...eventosVida, { ...newDraft, id: uuid() }])
    setAdding(false)
  }

  function eventoResumen(ev: EventoVida) {
    const partes: string[] = []
    if (ev.retiroUnico) partes.push(`Retiro único año ${ev.retiroUnico.anioT}: S/${ev.retiroUnico.monto.toLocaleString()}`)
    if (ev.gastoRecurrente) partes.push(`Recurrente años ${ev.gastoRecurrente.anioInicioT}–${ev.gastoRecurrente.anioFinT}: S/${ev.gastoRecurrente.montoMensual.toLocaleString()}/mes`)
    return partes.join(' · ') || 'Sin detalle'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Eventos de vida</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Gastos puntuales o recurrentes asociados a eventos importantes.
          </p>
        </div>
        <button onClick={() => { setNewDraft({ id: '', nombre: '' }); setAdding(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--color-acento)' }}>
          <Plus size={16} /> Agregar
        </button>
      </div>

      {eventosVida.length === 0 && !adding && (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            No hay eventos definidos. Los eventos afectan el aporte neto del pool en los años indicados.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {eventosVida.map(ev => (
          <div key={ev.id} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            {editingId === ev.id && draft ? (
              <EventoForm value={draft} onChange={setDraft} onSave={saveEdit} onCancel={() => { setEditingId(null); setDraft(null) }} />
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-texto)' }}>{ev.nombre}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{eventoResumen(ev)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(ev.id); setDraft({ ...ev }) }} className="p-1.5 hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Edit2 size={14} /></button>
                  <button onClick={() => del(ev.id)} className="p-1.5 hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            )}
          </div>
        ))}

        {adding && (
          <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-texto)' }}>Nuevo evento</p>
            <EventoForm value={newDraft} onChange={setNewDraft} onSave={confirmAdd} onCancel={() => setAdding(false)} />
          </div>
        )}
      </div>
    </div>
  )
}

function EventoForm({ value, onChange, onSave, onCancel }: {
  value: EventoVida
  onChange: (v: EventoVida) => void
  onSave: () => void
  onCancel: () => void
}) {
  useSubmitOnCmdEnter(onSave)
  const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }
  const tieneRetiro = !!value.retiroUnico
  const tieneRecurrente = !!value.gastoRecurrente

  function toggleRetiro(on: boolean) {
    onChange({ ...value, retiroUnico: on ? { anioT: 1, monto: 0 } : undefined })
  }

  function toggleRecurrente(on: boolean) {
    onChange({ ...value, gastoRecurrente: on ? { anioInicioT: 1, anioFinT: 5, montoMensual: 0 } : undefined })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Nombre del evento</label>
        <input value={value.nombre} onChange={e => onChange({ ...value, nombre: e.target.value })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
          placeholder="Ej. Matrimonio, Nacimiento hijo 1..." />
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-texto)' }}>
          <input type="checkbox" checked={tieneRetiro} onChange={e => toggleRetiro(e.target.checked)} />
          Retiro único (egreso puntual en un año)
        </label>
        {tieneRetiro && value.retiroUnico && (
          <div className="grid grid-cols-2 gap-3 pl-6">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Año T</label>
              <input type="number" min={1} value={value.retiroUnico.anioT}
                onChange={e => onChange({ ...value, retiroUnico: { ...value.retiroUnico!, anioT: parseInt(e.target.value) || 1 } })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Monto (S/)</label>
              <input type="number" min={0} value={value.retiroUnico.monto}
                onChange={e => onChange({ ...value, retiroUnico: { ...value.retiroUnico!, monto: parseFloat(e.target.value) || 0 } })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-texto)' }}>
          <input type="checkbox" checked={tieneRecurrente} onChange={e => toggleRecurrente(e.target.checked)} />
          Gasto recurrente mensual (por rango de años)
        </label>
        {tieneRecurrente && value.gastoRecurrente && (
          <div className="grid grid-cols-3 gap-3 pl-6">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Año inicio</label>
              <input type="number" min={1} value={value.gastoRecurrente.anioInicioT}
                onChange={e => onChange({ ...value, gastoRecurrente: { ...value.gastoRecurrente!, anioInicioT: parseInt(e.target.value) || 1 } })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Año fin</label>
              <input type="number" min={1} value={value.gastoRecurrente.anioFinT}
                onChange={e => onChange({ ...value, gastoRecurrente: { ...value.gastoRecurrente!, anioFinT: parseInt(e.target.value) || 1 } })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>S/ mensual</label>
              <input type="number" min={0} value={value.gastoRecurrente.montoMensual}
                onChange={e => onChange({ ...value, gastoRecurrente: { ...value.gastoRecurrente!, montoMensual: parseFloat(e.target.value) || 0 } })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
            </div>
          </div>
        )}
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
