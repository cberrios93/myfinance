import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useFinanceData } from '../../data/FinanceDataContext'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import type { Suscripcion, PersonaSuscripcion } from '../../data/types'

function fmt(n: number) { return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

const EMPTY: Omit<Suscripcion, 'id' | 'creadoEn' | 'actualizadoEn'> = {
  nombre: '', montoTotal: 0, moneda: 'PEN', periodicidad: 'Mensual',
  personas: [], activa: true, vencimiento: undefined, notas: undefined,
}

function SusForm({ value, onChange, onSave, onCancel }: {
  value: Omit<Suscripcion, 'id' | 'creadoEn' | 'actualizadoEn'>
  onChange: (v: any) => void; onSave: () => void; onCancel: () => void
}) {
  useSubmitOnCmdEnter(onSave)
  function addPersona() {
    onChange({ ...value, personas: [...value.personas, { nombre: '', monto: 0 }] })
  }
  function updatePersona(i: number, p: PersonaSuscripcion) {
    const personas = [...value.personas]; personas[i] = p; onChange({ ...value, personas })
  }
  function removePersona(i: number) {
    onChange({ ...value, personas: value.personas.filter((_, idx) => idx !== i) })
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Nombre</label>
          <input value={value.nombre} onChange={e => onChange({ ...value, nombre: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Ej. Netflix" autoFocus />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Monto total</label>
          <input type="number" min={0} step={0.01} value={value.montoTotal || ''}
            onChange={e => onChange({ ...value, montoTotal: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Moneda</label>
          <select value={value.moneda} onChange={e => onChange({ ...value, moneda: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            <option>PEN</option><option>USD</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Periodicidad</label>
          <select value={value.periodicidad} onChange={e => onChange({ ...value, periodicidad: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            <option>Mensual</option><option>Anual</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Vencimiento</label>
          <input type="date" value={value.vencimiento ?? ''}
            onChange={e => onChange({ ...value, vencimiento: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </div>
        <div className="sm:col-span-2 flex items-end gap-3 pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-texto)' }}>
            <input type="checkbox" checked={value.activa} onChange={e => onChange({ ...value, activa: e.target.checked })} />
            Activa
          </label>
        </div>
      </div>

      {value.personas.length > 0 && (
        <div>
          <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>Split por persona</p>
          <div className="space-y-2">
            {value.personas.map((p, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={p.nombre} onChange={e => updatePersona(i, { ...p, nombre: e.target.value })}
                  className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Nombre" />
                <input type="number" min={0} step={0.01} value={p.monto || ''}
                  onChange={e => updatePersona(i, { ...p, monto: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-3 py-1.5 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} />
                <button onClick={() => removePersona(i)} style={{ color: 'var(--color-muted)' }}><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
      <button onClick={addPersona} className="text-xs hover:opacity-80" style={{ color: 'var(--color-acento)' }}>+ Agregar persona</button>

      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Notas</label>
        <input value={value.notas ?? ''} onChange={e => onChange({ ...value, notas: e.target.value || undefined })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Opcional" />
      </div>

      <div className="flex gap-2">
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

export default function Subscriptions() {
  const { suscripciones, loading, agregarSuscripcion, actualizarSuscripcion, borrarSuscripcion } = useFinanceData()
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState({ ...EMPTY })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Suscripcion | null>(null)

  const activas = suscripciones.filter(s => s.activa)
  const totalMensualPEN = activas.filter(s => s.moneda === 'PEN').reduce((sum, s) => sum + (s.periodicidad === 'Mensual' ? s.montoTotal : s.montoTotal / 12), 0)
  const totalMensualUSD = activas.filter(s => s.moneda === 'USD').reduce((sum, s) => sum + (s.periodicidad === 'Mensual' ? s.montoTotal : s.montoTotal / 12), 0)

  async function handleAdd() {
    if (!newDraft.nombre.trim()) return
    await agregarSuscripcion(newDraft)
    setAdding(false); setNewDraft({ ...EMPTY })
  }
  async function handleSaveEdit() {
    if (!editDraft) return
    await actualizarSuscripcion(editDraft)
    setEditingId(null); setEditDraft(null)
  }

  if (loading) return <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>Cargando…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Suscripciones</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            {activas.length} activa{activas.length !== 1 ? 's' : ''} · S/ {fmt(totalMensualPEN)}/mes{totalMensualUSD > 0 ? ` + $ ${fmt(totalMensualUSD)}/mes` : ''}
          </p>
        </div>
        <button onClick={() => { setAdding(true); setNewDraft({ ...EMPTY }) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--color-acento)' }}>
          <Plus size={16} /> Agregar
        </button>
      </div>

      {adding && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-texto)' }}>Nueva suscripción</p>
          <SusForm value={newDraft} onChange={setNewDraft} onSave={handleAdd} onCancel={() => { setAdding(false); setNewDraft({ ...EMPTY }) }} />
        </div>
      )}

      <div className="space-y-3">
        {suscripciones.map(s => {
          const mensual = s.periodicidad === 'Mensual' ? s.montoTotal : s.montoTotal / 12
          if (editingId === s.id && editDraft) {
            return (
              <div key={s.id} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
                <SusForm value={editDraft} onChange={setEditDraft} onSave={handleSaveEdit} onCancel={() => { setEditingId(null); setEditDraft(null) }} />
              </div>
            )
          }
          return (
            <div key={s.id} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', opacity: s.activa ? 1 : 0.5 }}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm" style={{ color: 'var(--color-texto)' }}>{s.nombre}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-fondo)', color: 'var(--color-muted)' }}>{s.periodicidad}</span>
                    {!s.activa && <span className="text-xs" style={{ color: '#ef4444' }}>Inactiva</span>}
                    {s.vencimiento && <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Vence: {s.vencimiento}</span>}
                  </div>
                  <p className="font-mono font-bold text-sm mt-1" style={{ color: 'var(--color-acento)' }}>
                    {s.moneda === 'PEN' ? 'S/' : '$'} {fmt(s.montoTotal)}{s.periodicidad === 'Anual' ? `/año · S/ ${fmt(mensual)}/mes` : '/mes'}
                  </p>
                  {s.personas.length > 0 && (
                    <div className="flex gap-3 mt-2 flex-wrap">
                      {s.personas.map((p, i) => (
                        <span key={i} className="text-xs" style={{ color: 'var(--color-muted)' }}>{p.nombre}: {s.moneda === 'PEN' ? 'S/' : '$'} {fmt(p.monto)}</span>
                      ))}
                    </div>
                  )}
                  {s.notas && <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{s.notas}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setEditingId(s.id); setEditDraft({ ...s }) }} className="p-1.5 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Edit2 size={14} /></button>
                  <button onClick={() => borrarSuscripcion(s.id)} className="p-1.5 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          )
        })}
        {suscripciones.length === 0 && !adding && (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--color-muted)' }}>Sin suscripciones registradas.</div>
        )}
      </div>
    </div>
  )
}
