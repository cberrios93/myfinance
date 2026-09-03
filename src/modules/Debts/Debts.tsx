import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { useFinanceData } from '../../data/FinanceDataContext'
import type { DeudaPendiente, EstadoDeuda } from '../../data/types'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'

function fmt(n: number) { return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

const ESTADOS: EstadoDeuda[] = ['Pendiente', 'Parcial', 'Pagado']

const STATUS_COLOR: Record<EstadoDeuda, string> = {
  Pendiente: '#ef4444',
  Parcial: '#f59e0b',
  Pagado: '#22c55e',
}

const EMPTY: Omit<DeudaPendiente, 'id' | 'creadoEn' | 'actualizadoEn'> = {
  deudor: '', concepto: '', fechaDeposito: undefined, capital: 0, intereses: 0, estado: 'Pendiente', notas: undefined,
}

function DeudaForm({ value, onChange, onSave, onCancel }: {
  value: Omit<DeudaPendiente, 'id' | 'creadoEn' | 'actualizadoEn'>
  onChange: (v: any) => void; onSave: () => void; onCancel: () => void
}) {
  useSubmitOnCmdEnter(onSave)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Deudor</label>
          <input value={value.deudor} onChange={e => onChange({ ...value, deudor: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Nombre" autoFocus />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Concepto</label>
          <input value={value.concepto} onChange={e => onChange({ ...value, concepto: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Descripción del préstamo" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Estado</label>
          <select value={value.estado} onChange={e => onChange({ ...value, estado: e.target.value as EstadoDeuda })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            {ESTADOS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Capital (S/)</label>
          <input type="number" min={0} step={0.01} value={value.capital || ''}
            onChange={e => onChange({ ...value, capital: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} placeholder="0" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Intereses (S/)</label>
          <input type="number" min={0} step={0.01} value={value.intereses || ''}
            onChange={e => onChange({ ...value, intereses: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} placeholder="0" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Fecha depósito</label>
          <input type="date" value={value.fechaDeposito ?? ''}
            onChange={e => onChange({ ...value, fechaDeposito: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
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

export default function Debts() {
  const { deudas, loading, agregarDeuda, actualizarDeuda, borrarDeuda } = useFinanceData()
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState({ ...EMPTY })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<DeudaPendiente | null>(null)

  const pendientes = deudas.filter(d => d.estado !== 'Pagado')
  const totalCapital = pendientes.reduce((s, d) => s + d.capital, 0)
  const totalConIntereses = pendientes.reduce((s, d) => s + d.capital + d.intereses, 0)

  async function handleAdd() {
    if (!newDraft.deudor.trim() || !newDraft.concepto.trim()) return
    await agregarDeuda(newDraft)
    setAdding(false); setNewDraft({ ...EMPTY })
  }
  async function handleSaveEdit() {
    if (!editDraft) return
    await actualizarDeuda(editDraft)
    setEditingId(null); setEditDraft(null)
  }

  if (loading) return <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>Cargando…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Deudas Pendientes</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Dinero prestado por cobrar</p>
        </div>
        <button onClick={() => { setAdding(true); setNewDraft({ ...EMPTY }) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--color-acento)' }}>
          <Plus size={16} /> Agregar
        </button>
      </div>

      {pendientes.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          <div className="rounded-xl px-4 py-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Capital pendiente</p>
            <p className="font-bold font-mono text-sm" style={{ color: 'var(--color-texto)' }}>S/ {fmt(totalCapital)}</p>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Total con intereses</p>
            <p className="font-bold font-mono text-sm" style={{ color: 'var(--color-acento)' }}>S/ {fmt(totalConIntereses)}</p>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Deudores activos</p>
            <p className="font-bold text-sm" style={{ color: 'var(--color-texto)' }}>{pendientes.length}</p>
          </div>
        </div>
      )}

      {adding && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-texto)' }}>Nueva deuda</p>
          <DeudaForm value={newDraft} onChange={setNewDraft} onSave={handleAdd} onCancel={() => { setAdding(false); setNewDraft({ ...EMPTY }) }} />
        </div>
      )}

      <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--color-borde)' }}>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr style={{ background: 'var(--color-card)', borderBottom: '2px solid var(--color-borde)' }}>
              <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: 'var(--color-muted)' }}>Deudor</th>
              <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: 'var(--color-muted)' }}>Concepto</th>
              <th className="text-right px-4 py-3 font-semibold text-xs" style={{ color: 'var(--color-muted)' }}>Capital</th>
              <th className="text-right px-4 py-3 font-semibold text-xs" style={{ color: 'var(--color-muted)' }}>Intereses</th>
              <th className="text-right px-4 py-3 font-semibold text-xs" style={{ color: 'var(--color-muted)' }}>Total</th>
              <th className="text-center px-4 py-3 font-semibold text-xs" style={{ color: 'var(--color-muted)' }}>Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: 'var(--color-muted)' }}>Fecha</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {deudas.map(d => {
              if (editingId === d.id && editDraft) {
                return (
                  <tr key={d.id}>
                    <td colSpan={8} className="px-4 py-3" style={{ background: 'var(--color-card)' }}>
                      <DeudaForm value={editDraft} onChange={setEditDraft} onSave={handleSaveEdit} onCancel={() => { setEditingId(null); setEditDraft(null) }} />
                    </td>
                  </tr>
                )
              }
              return (
                <tr key={d.id} style={{ borderTop: '1px solid var(--color-borde)', background: 'var(--color-card)', opacity: d.estado === 'Pagado' ? 0.5 : 1 }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-texto)' }}>{d.deudor}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>{d.concepto}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: 'var(--color-texto)' }}>S/ {fmt(d.capital)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: 'var(--color-muted)' }}>S/ {fmt(d.intereses)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-bold" style={{ color: 'var(--color-acento)' }}>S/ {fmt(d.capital + d.intereses)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: STATUS_COLOR[d.estado], border: `1px solid ${STATUS_COLOR[d.estado]}` }}>{d.estado}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{d.fechaDeposito ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingId(d.id); setEditDraft({ ...d }) }} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Edit2 size={13} /></button>
                      <button onClick={() => borrarDeuda(d.id)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {deudas.length === 0 && !adding && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Sin deudas registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
