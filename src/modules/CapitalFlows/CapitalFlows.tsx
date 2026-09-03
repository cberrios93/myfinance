import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, TrendingUp, TrendingDown } from 'lucide-react'
import { useFinanceData } from '../../data/FinanceDataContext'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import type { FlujoCapital } from '../../data/types'

const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

type Draft = Omit<FlujoCapital, 'id' | 'creadoEn' | 'actualizadoEn'>

function fmt(n: number) {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function emptyDraft(): Draft {
  return { fecha: todayISO(), tipo: 'aporte', monto: 0, moneda: 'PEN', nota: undefined }
}

function FlujoForm({ value, onChange, onSave, onCancel }: {
  value: Draft
  onChange: (v: Draft) => void
  onSave: () => void
  onCancel: () => void
}) {
  useSubmitOnCmdEnter(onSave)
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 items-end">
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Fecha</label>
        <input
          type="date"
          value={value.fecha}
          onChange={e => onChange({ ...value, fecha: e.target.value })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
        />
      </div>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Tipo</label>
        <select
          value={value.tipo}
          onChange={e => onChange({ ...value, tipo: e.target.value as 'aporte' | 'retiro' })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
        >
          <option value="aporte">Aporte</option>
          <option value="retiro">Retiro</option>
        </select>
      </div>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Monto</label>
        <input
          type="number" min={0} step={0.01}
          value={value.monto || ''}
          onChange={e => onChange({ ...value, monto: parseFloat(e.target.value) || 0 })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
          style={inputStyle}
          placeholder="0.00"
          autoFocus
        />
      </div>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Moneda</label>
        <select
          value={value.moneda}
          onChange={e => onChange({ ...value, moneda: e.target.value as 'PEN' | 'USD' })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
        >
          <option value="PEN">PEN (S/)</option>
          <option value="USD">USD ($)</option>
        </select>
      </div>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Nota</label>
        <input
          value={value.nota ?? ''}
          onChange={e => onChange({ ...value, nota: e.target.value || undefined })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
          placeholder="Opcional"
        />
      </div>
      <div className="flex gap-2 sm:col-span-5 justify-end">
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

export default function CapitalFlows() {
  const { flujosCapital, agregarFlujoCapital, actualizarFlujoCapital, borrarFlujoCapital } = useFinanceData()
  const { tc: tcData } = useTipoCambio()
  const tc = tcData?.compra ?? 3.7

  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<FlujoCapital | null>(null)

  async function handleAdd() {
    if (!newDraft.monto || newDraft.monto <= 0) return
    await agregarFlujoCapital(newDraft)
    setAdding(false)
    setNewDraft(emptyDraft())
  }

  async function handleSaveEdit() {
    if (!editDraft) return
    await actualizarFlujoCapital(editDraft)
    setEditingId(null)
    setEditDraft(null)
  }

  // KPIs
  const toPEN = (f: FlujoCapital) => f.moneda === 'USD' ? f.monto * tc : f.monto
  const aportes = flujosCapital.filter(f => f.tipo === 'aporte')
  const retiros = flujosCapital.filter(f => f.tipo === 'retiro')
  const totalAportesPEN = aportes.reduce((s, f) => s + toPEN(f), 0)
  const totalRetirosPEN = retiros.reduce((s, f) => s + toPEN(f), 0)
  const capitalPropioNeto = totalAportesPEN - totalRetirosPEN

  const sorted = [...flujosCapital].sort((a, b) => b.fecha.localeCompare(a.fecha))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Flujos de Capital</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Dinero real que entra o sale de tu ecosistema de inversiones
          </p>
        </div>
        <button
          onClick={() => { setAdding(true); setNewDraft(emptyDraft()) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--color-acento)' }}
        >
          <Plus size={16} /> Registrar flujo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total aportes (PEN eq.)', value: `S/ ${fmt(totalAportesPEN)}`, color: '#22c55e', icon: TrendingUp },
          { label: 'Total retiros (PEN eq.)', value: `S/ ${fmt(totalRetirosPEN)}`, color: '#ef4444', icon: TrendingDown },
          { label: 'Capital propio neto', value: `S/ ${fmt(capitalPropioNeto)}`, color: capitalPropioNeto >= 0 ? '#22c55e' : '#ef4444', icon: null },
          { label: 'Registros', value: `${aportes.length} aportes · ${retiros.length} retiros`, color: 'var(--color-texto)', icon: null },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label}</p>
            <p className="font-bold text-sm font-mono flex items-center gap-1.5" style={{ color }}>
              {Icon && <Icon size={14} />}{value}
            </p>
          </div>
        ))}
      </div>

      {/* Formulario nuevo */}
      {adding && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-texto)' }}>Nuevo flujo</p>
          <FlujoForm
            value={newDraft} onChange={setNewDraft}
            onSave={handleAdd} onCancel={() => { setAdding(false); setNewDraft(emptyDraft()) }}
          />
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-borde)' }}>
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr style={{ background: '#1e3a5f', color: '#fff' }}>
              <th className="text-left px-4 py-3 font-semibold">Fecha</th>
              <th className="text-left px-4 py-3 font-semibold text-xs">Tipo</th>
              <th className="text-right px-4 py-3 font-semibold text-xs">Monto</th>
              <th className="text-right px-4 py-3 font-semibold text-xs">PEN eq.</th>
              <th className="text-left px-4 py-3 font-semibold text-xs">Nota</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(f => {
              const simbolo = f.moneda === 'PEN' ? 'S/' : '$'
              const penEq = toPEN(f)
              const esAporte = f.tipo === 'aporte'

              if (editingId === f.id && editDraft) {
                return (
                  <tr key={f.id} style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-borde)' }}>
                    <td colSpan={6} className="px-4 py-3">
                      <FlujoForm
                        value={editDraft} onChange={v => setEditDraft({ ...editDraft, ...v })}
                        onSave={handleSaveEdit} onCancel={() => { setEditingId(null); setEditDraft(null) }}
                      />
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={f.id} style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-borde)' }}>
                  <td className="px-4 py-2.5 text-sm font-mono" style={{ color: 'var(--color-muted)' }}>{f.fecha}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        background: esAporte ? '#22c55e18' : '#ef444418',
                        color: esAporte ? '#22c55e' : '#ef4444',
                      }}>
                      {esAporte ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {esAporte ? 'Aporte' : 'Retiro'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm" style={{ color: esAporte ? '#22c55e' : '#ef4444' }}>
                    {esAporte ? '+' : '−'}{simbolo} {fmt(f.monto)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                    {f.moneda === 'USD' ? `S/ ${fmt(penEq)}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--color-muted)' }}>{f.nota ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="flex justify-end gap-1">
                      <button onClick={() => { setEditingId(f.id); setEditDraft({ ...f }) }} className="p-1 rounded" style={{ color: 'var(--color-muted)' }}><Edit2 size={13} /></button>
                      <button onClick={() => borrarFlujoCapital(f.id)} className="p-1 rounded" style={{ color: 'var(--color-muted)' }}><Trash2 size={13} /></button>
                    </span>
                  </td>
                </tr>
              )
            })}
            {flujosCapital.length === 0 && !adding && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-sm" style={{ color: 'var(--color-muted)' }}>
                  Sin flujos registrados. Comienza registrando los aportes que hiciste desde tu cuenta bancaria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Nota explicativa */}
      <p className="text-xs" style={{ color: 'var(--color-muted)', opacity: 0.7 }}>
        <strong>Aporte:</strong> dinero que transferiste desde tu banco personal hacia inversiones. &nbsp;
        <strong>Retiro:</strong> dinero que sacaste de inversiones hacia tu cuenta bancaria para consumo. &nbsp;
        Los traspasos entre instrumentos <em>no se registran aquí</em>.
      </p>
    </div>
  )
}
