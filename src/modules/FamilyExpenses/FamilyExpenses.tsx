import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { useFinanceData } from '../../data/FinanceDataContext'
import type { GastoFamilia } from '../../data/types'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'

function fmt(n: number) { return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

const TIPOS = ['Seguro', 'Mensualidad', 'Médico', 'Educación', 'Alimentación', 'Otro']

const EMPTY: Omit<GastoFamilia, 'id' | 'creadoEn' | 'actualizadoEn'> = {
  descripcion: '', beneficiario: '', tipo: 'Otro', montoPEN: undefined,
  montoUSD: undefined, periodicidad: 'Mensual', activo: true, notas: undefined,
}

function GastoForm({ value, onChange, onSave, onCancel }: {
  value: Omit<GastoFamilia, 'id' | 'creadoEn' | 'actualizadoEn'>
  onChange: (v: any) => void; onSave: () => void; onCancel: () => void
}) {
  useSubmitOnCmdEnter(onSave)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Descripción</label>
          <input value={value.descripcion} onChange={e => onChange({ ...value, descripcion: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Ej. Seguro Salud RIMAC" autoFocus />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Beneficiario</label>
          <input value={value.beneficiario} onChange={e => onChange({ ...value, beneficiario: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Ej. Mamá" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Tipo</label>
          <select value={value.tipo} onChange={e => onChange({ ...value, tipo: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Monto PEN (S/)</label>
          <input type="number" min={0} step={0.01} value={value.montoPEN ?? ''}
            onChange={e => onChange({ ...value, montoPEN: e.target.value !== '' ? parseFloat(e.target.value) : undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} placeholder="—" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Monto USD ($)</label>
          <input type="number" min={0} step={0.01} value={value.montoUSD ?? ''}
            onChange={e => onChange({ ...value, montoUSD: e.target.value !== '' ? parseFloat(e.target.value) : undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} placeholder="—" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Periodicidad</label>
          <select value={value.periodicidad} onChange={e => onChange({ ...value, periodicidad: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            <option>Mensual</option><option>Anual</option>
          </select>
        </div>
        <div className="flex items-end gap-3 pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-texto)' }}>
            <input type="checkbox" checked={value.activo} onChange={e => onChange({ ...value, activo: e.target.checked })} />
            Activo
          </label>
        </div>
      </div>
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

export default function FamilyExpenses() {
  const { gastosFamilia, loading, agregarGastoFamilia, actualizarGastoFamilia, borrarGastoFamilia } = useFinanceData()
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState({ ...EMPTY })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<GastoFamilia | null>(null)

  const activos = gastosFamilia.filter(g => g.activo)
  const totalMensualPEN = activos.reduce((s, g) => s + ((g.montoPEN ?? 0) / (g.periodicidad === 'Anual' ? 12 : 1)), 0)

  const byBenef = activos.reduce((acc, g) => {
    acc[g.beneficiario] = (acc[g.beneficiario] ?? 0) + ((g.montoPEN ?? 0) / (g.periodicidad === 'Anual' ? 12 : 1))
    return acc
  }, {} as Record<string, number>)

  async function handleAdd() {
    if (!newDraft.descripcion.trim()) return
    await agregarGastoFamilia(newDraft)
    setAdding(false); setNewDraft({ ...EMPTY })
  }
  async function handleSaveEdit() {
    if (!editDraft) return
    await actualizarGastoFamilia(editDraft)
    setEditingId(null); setEditDraft(null)
  }

  if (loading) return <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>Cargando…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Gastos Familia</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Total mensual: S/ {fmt(totalMensualPEN)}</p>
        </div>
        <button onClick={() => { setAdding(true); setNewDraft({ ...EMPTY }) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--color-acento)' }}>
          <Plus size={16} /> Agregar
        </button>
      </div>

      {Object.keys(byBenef).length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {Object.entries(byBenef).map(([benef, total]) => (
            <div key={benef} className="rounded-xl px-4 py-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{benef}</p>
              <p className="font-bold font-mono text-sm" style={{ color: 'var(--color-texto)' }}>S/ {fmt(total)}/mes</p>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-texto)' }}>Nuevo gasto familiar</p>
          <GastoForm value={newDraft} onChange={setNewDraft} onSave={handleAdd} onCancel={() => { setAdding(false); setNewDraft({ ...EMPTY }) }} />
        </div>
      )}

      <div className="space-y-2">
        {gastosFamilia.map(g => {
          const mensual = (g.montoPEN ?? 0) / (g.periodicidad === 'Anual' ? 12 : 1)
          if (editingId === g.id && editDraft) {
            return (
              <div key={g.id} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
                <GastoForm value={editDraft} onChange={setEditDraft} onSave={handleSaveEdit} onCancel={() => { setEditingId(null); setEditDraft(null) }} />
              </div>
            )
          }
          return (
            <div key={g.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', opacity: g.activo ? 1 : 0.5 }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate" style={{ color: 'var(--color-texto)' }}>{g.descripcion}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-fondo)', color: 'var(--color-muted)' }}>{g.beneficiario}</span>
                  <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{g.tipo}</span>
                </div>
                <div className="flex gap-3 mt-0.5 text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                  {g.montoPEN != null && <span>S/ {fmt(g.montoPEN)}{g.periodicidad === 'Anual' ? '/año' : '/mes'}</span>}
                  {g.montoUSD != null && <span>$ {fmt(g.montoUSD)}{g.periodicidad === 'Anual' ? '/año' : '/mes'}</span>}
                  {g.periodicidad === 'Anual' && mensual > 0 && <span style={{ color: 'var(--color-acento)' }}>≈ S/ {fmt(mensual)}/mes</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingId(g.id); setEditDraft({ ...g }) }} className="p-1.5 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Edit2 size={13} /></button>
                <button onClick={() => borrarGastoFamilia(g.id)} className="p-1.5 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Trash2 size={13} /></button>
              </div>
            </div>
          )
        })}
        {gastosFamilia.length === 0 && !adding && (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--color-muted)' }}>Sin gastos familiares registrados.</div>
        )}
      </div>
    </div>
  )
}
