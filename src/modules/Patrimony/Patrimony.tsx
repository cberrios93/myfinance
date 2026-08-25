import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, AlertTriangle, Link2 } from 'lucide-react'
import { usePatrimony } from '../../data/PatrimonyContext'
import { useScenario } from '../../data/ScenarioContext'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import { CATEGORIAS_PATRIMONIO } from '../../data/types'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import TipoCambioWidget from '../../components/TipoCambioWidget'
import type { CuentaPatrimonio, CategoriaPatrimonio } from '../../data/types'

const CAT_COLORS: Record<string, string> = {
  'Savings': '#3B82F6',
  'Investment (Stock Exchange)': '#8B5CF6',
  'Investment (Fintech)': '#F59E0B',
  'Investment (Business)': '#10B981',
  'Asset': '#6B7280',
  'Liability': '#EF4444',
}

const CAT_ORDER = Object.fromEntries(CATEGORIAS_PATRIMONIO.map((c, i) => [c, i]))

const EMPTY: Omit<CuentaPatrimonio, 'id' | 'creadoEn' | 'actualizadoEn'> = {
  nombre: '',
  categoria: 'Savings',
  montoPEN: undefined,
  montoUSD: undefined,
  esRiesgo: false,
  orden: 0,
}

function fmt(n: number) {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Patrimony() {
  const { cuentas, loading, agregarCuenta, actualizarCuenta, borrarCuenta } = usePatrimony()
  const { escenarioActivo } = useScenario()
  const { tc: tcData, actualizar: actualizarTC } = useTipoCambio()
  const tc = tcData?.compra ?? 3.7

  // IDs de cuentas que están vinculadas a algún instrumento del escenario activo
  const cuentasVinculadas = new Set(
    (escenarioActivo?.instrumentos ?? [])
      .map(i => i.cuentaPatrimonioId)
      .filter(Boolean) as string[]
  )
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState({ ...EMPTY })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<CuentaPatrimonio | null>(null)

  const totalPEN = cuentas.reduce((s, c) => s + (c.montoPEN ?? 0), 0)
  const totalUSD = cuentas.reduce((s, c) => s + (c.montoUSD ?? 0), 0)
  const totalConsolidadoPEN = totalPEN + totalUSD * tc

  const grouped = CATEGORIAS_PATRIMONIO.map(cat => ({
    cat,
    items: cuentas.filter(c => c.categoria === cat).sort((a, b) => a.orden - b.orden),
  })).filter(g => g.items.length > 0 || (adding && newDraft.categoria === g.cat))

  async function handleAdd() {
    if (!newDraft.nombre.trim()) return
    await agregarCuenta({ ...newDraft, orden: cuentas.filter(c => c.categoria === newDraft.categoria).length })
    setAdding(false)
    setNewDraft({ ...EMPTY })
  }

  async function handleSaveEdit() {
    if (!editDraft) return
    await actualizarCuenta(editDraft)
    setEditingId(null)
    setEditDraft(null)
  }

  if (loading) return <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>Cargando…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Patrimonio</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            {cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''} · Balance real por cuenta
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TipoCambioWidget autoFetch />
          <button
            onClick={() => { setAdding(true); setNewDraft({ ...EMPTY }) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--color-acento)' }}
          >
            <Plus size={16} /> Agregar cuenta
          </button>
        </div>
      </div>

      {/* Totales */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-borde)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#1e3a5f', color: '#fff' }}>
              <th className="text-left px-4 py-3 font-semibold">TOTAL</th>
              <th className="text-right px-4 py-3 font-semibold w-48">S/ {fmt(totalPEN)}</th>
              <th className="text-right px-4 py-3 font-semibold w-40">$ {fmt(totalUSD)}</th>
              <th className="w-20" />
            </tr>
            <tr style={{ background: '#2d4a6e', color: '#cbd5e1' }}>
              <th className="text-left px-4 py-2 text-xs font-medium">Cuenta</th>
              <th className="text-right px-4 py-2 text-xs font-medium">PEN</th>
              <th className="text-right px-4 py-2 text-xs font-medium">USD</th>
              <th className="text-right px-4 py-2 text-xs font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-borde)' }}>
                <td colSpan={4} className="px-4 py-3">
                  <CuentaForm
                    value={newDraft}
                    onChange={setNewDraft}
                    onSave={handleAdd}
                    onCancel={() => { setAdding(false); setNewDraft({ ...EMPTY }) }}
                  />
                </td>
              </tr>
            )}

            {grouped.map(({ cat, items }) => (
              <>
                <tr key={`cat-${cat}`} style={{ background: `${CAT_COLORS[cat]}22` }}>
                  <td colSpan={4} className="px-4 py-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: CAT_COLORS[cat] }}>{cat}</span>
                  </td>
                </tr>
                {items.map(cuenta => (
                  <tr
                    key={cuenta.id}
                    style={{
                      background: 'var(--color-card)',
                      borderBottom: '1px solid var(--color-borde)',
                      color: cuenta.esRiesgo ? '#ef4444' : 'var(--color-texto)',
                    }}
                  >
                    {editingId === cuenta.id && editDraft ? (
                      <td colSpan={4} className="px-4 py-3">
                        <CuentaForm
                          value={editDraft}
                          onChange={setEditDraft}
                          onSave={handleSaveEdit}
                          onCancel={() => { setEditingId(null); setEditDraft(null) }}
                        />
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2 flex-wrap">
                            {cuenta.esRiesgo && <AlertTriangle size={13} className="flex-shrink-0" style={{ color: '#ef4444' }} />}
                            {cuenta.nombre}
                            {cuentasVinculadas.has(cuenta.id) && (
                              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ background: '#10B98115', color: '#10B981' }}>
                                <Link2 size={10} /> Simulación
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm">
                          {cuenta.montoPEN != null ? `S/ ${fmt(cuenta.montoPEN)}` : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm">
                          {cuenta.montoUSD != null ? `$ ${fmt(cuenta.montoUSD)}` : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="flex justify-end gap-1">
                            <button
                              onClick={() => { setEditingId(cuenta.id); setEditDraft({ ...cuenta }) }}
                              className="p-1.5 rounded hover:opacity-70"
                              style={{ color: 'var(--color-muted)' }}
                            ><Edit2 size={13} /></button>
                            <button
                              onClick={() => borrarCuenta(cuenta.id)}
                              className="p-1.5 rounded hover:opacity-70"
                              style={{ color: 'var(--color-muted)' }}
                            ><Trash2 size={13} /></button>
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </>
            ))}

            {cuentas.length === 0 && !adding && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-sm" style={{ color: 'var(--color-muted)' }}>
                  Agrega tus cuentas e inversiones para ver tu balance aquí.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CuentaForm({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: Omit<CuentaPatrimonio, 'id' | 'creadoEn' | 'actualizadoEn'>
  onChange: (v: any) => void
  onSave: () => void
  onCancel: () => void
}) {
  useSubmitOnCmdEnter(onSave)
  const inputStyle = {
    background: 'var(--color-fondo)',
    color: 'var(--color-texto)',
    border: '1px solid var(--color-borde)',
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Nombre de la cuenta</label>
          <input
            value={value.nombre}
            onChange={e => onChange({ ...value, nombre: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            placeholder="Ej. Interbank Ahorros"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Monto PEN (S/)</label>
          <input
            type="number" min={0} step={0.01}
            value={value.montoPEN ?? ''}
            onChange={e => onChange({ ...value, montoPEN: e.target.value !== '' ? parseFloat(e.target.value) : undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
            style={inputStyle}
            placeholder="—"
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Monto USD ($)</label>
          <input
            type="number" min={0} step={0.01}
            value={value.montoUSD ?? ''}
            onChange={e => onChange({ ...value, montoUSD: e.target.value !== '' ? parseFloat(e.target.value) : undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
            style={inputStyle}
            placeholder="—"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Categoría</label>
          <select
            value={value.categoria}
            onChange={e => onChange({ ...value, categoria: e.target.value as CategoriaPatrimonio })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          >
            {CATEGORIAS_PATRIMONIO.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-texto)' }}>
            <input
              type="checkbox"
              checked={value.esRiesgo}
              onChange={e => onChange({ ...value, esRiesgo: e.target.checked })}
            />
            Marcar como riesgo (rojo)
          </label>
        </div>
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
