import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFinanceData } from '../../data/FinanceDataContext'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import type { FlujoCajaItem } from '../../data/types'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import TipoCambioWidget from '../../components/TipoCambioWidget'
import { useConfig } from '../../config/ConfigContext'
import { formatMonto } from '../../lib/formatMonto'

const CATEGORIAS = ['', 'Inversiones', 'Transporte', 'Salud', 'Vivienda', 'Otro']

function fmt(n: number, dec = 2) { return n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec }) }

const EMPTY: Omit<FlujoCajaItem, 'id' | 'creadoEn' | 'actualizadoEn'> = {
  nombre: '', tipo: 'Income', categoria: undefined, montoPEN: undefined, montoUSD: undefined, activo: true, orden: 0,
}

const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

function ItemForm({ value, onChange, onSave, onCancel }: {
  value: Omit<FlujoCajaItem, 'id' | 'creadoEn' | 'actualizadoEn'>
  onChange: (v: any) => void
  onSave: () => void
  onCancel: () => void
}) {
  useSubmitOnCmdEnter(onSave)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Descripción</label>
          <input value={value.nombre} onChange={e => onChange({ ...value, nombre: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
            placeholder="Ej. Paycheck SAP" autoFocus />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Tipo</label>
          <select value={value.tipo} onChange={e => onChange({ ...value, tipo: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            <option value="Income">Ingreso</option>
            <option value="Expense">Gasto</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Categoría</label>
          <select value={value.categoria ?? ''} onChange={e => onChange({ ...value, categoria: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c || '—'}</option>)}
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
        <div className="flex items-end gap-3 pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-texto)' }}>
            <input type="checkbox" checked={value.activo} onChange={e => onChange({ ...value, activo: e.target.checked })} />
            Activo
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

export default function CashFlow() {
  const { flujoCaja, loading, agregarFlujo, actualizarFlujo, borrarFlujo } = useFinanceData()
  const { tc: tcData } = useTipoCambio()
  const navigate = useNavigate()
  const tc = tcData?.compra ?? 3.7
  const { config } = useConfig()
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState({ ...EMPTY })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<FlujoCajaItem | null>(null)

  const activos = flujoCaja.filter(i => i.activo)
  const ingresos = activos.filter(i => i.tipo === 'Income')
  const gastos = activos.filter(i => i.tipo === 'Expense')

  const totalIngresosPEN = ingresos.reduce((s, i) => s + (i.montoPEN ?? 0), 0)
  const totalIngresosUSD = ingresos.reduce((s, i) => s + (i.montoUSD ?? 0), 0)
  const totalGastosPEN = gastos.reduce((s, i) => s + (i.montoPEN ?? 0), 0)
  const totalGastosUSD = gastos.reduce((s, i) => s + (i.montoUSD ?? 0), 0)
  const flujoPEN = totalIngresosPEN - totalGastosPEN
  const flujoUSD = totalIngresosUSD - totalGastosUSD

  function totalEnPEN(pen: number, usd: number) { return pen + usd * tc }

  async function handleAdd() {
    if (!newDraft.nombre.trim()) return
    await agregarFlujo({ ...newDraft, orden: flujoCaja.length })
    setAdding(false); setNewDraft({ ...EMPTY })
  }

  async function handleSaveEdit() {
    if (!editDraft) return
    await actualizarFlujo(editDraft)
    setEditingId(null); setEditDraft(null)
  }

  if (loading) return <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>Cargando…</div>

  function renderSection(title: string, items: FlujoCajaItem[], color: string) {
    const totalPEN = items.reduce((s, i) => s + (i.montoPEN ?? 0), 0)
    const totalUSD = items.reduce((s, i) => s + (i.montoUSD ?? 0), 0)
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color }}>{title}</h2>
          <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
            {totalPEN > 0 && formatMonto(totalPEN, config)}{totalPEN > 0 && totalUSD > 0 && ' · '}{totalUSD > 0 && `$ ${fmt(totalUSD, config.decimales)}`}
          </span>
        </div>
        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--color-borde)' }}>
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr style={{ background: 'var(--color-card)' }}>
                <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Descripción</th>
                <th className="text-left px-4 py-2 text-xs font-medium hidden sm:table-cell" style={{ color: 'var(--color-muted)' }}>Categoría</th>
                <th className="text-right px-4 py-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>S/</th>
                <th className="text-right px-4 py-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>$</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderTop: '1px solid var(--color-borde)', background: 'var(--color-card)' }}>
                  {editingId === item.id && editDraft ? (
                    <td colSpan={5} className="px-4 py-3">
                      <ItemForm value={editDraft} onChange={setEditDraft} onSave={handleSaveEdit} onCancel={() => { setEditingId(null); setEditDraft(null) }} />
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-2.5" style={{ color: 'var(--color-texto)' }}>
                        <span className="flex items-center gap-2 flex-wrap">
                          {item.nombre}
                          {item.suscripcionId && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-acento)15', color: 'var(--color-acento)' }}>
                              Suscripción
                            </span>
                          )}
                          {item.gastoFamiliaId && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#F59E0B15', color: '#F59E0B' }}>
                              Familia
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs hidden sm:table-cell" style={{ color: 'var(--color-muted)' }}>{item.categoria || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{item.montoPEN != null ? fmt(item.montoPEN) : ''}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{item.montoUSD != null ? fmt(item.montoUSD) : ''}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="flex justify-end gap-1">
                          {item.suscripcionId ? (
                            <button
                              onClick={() => navigate('/suscripciones')}
                              title="Editar en Suscripciones"
                              className="p-1 rounded hover:opacity-70"
                              style={{ color: 'var(--color-acento)' }}
                            >
                              <ExternalLink size={13} />
                            </button>
                          ) : item.gastoFamiliaId ? (
                            <button
                              onClick={() => navigate('/gastos-familia')}
                              title="Editar en Gastos Familia"
                              className="p-1 rounded hover:opacity-70"
                              style={{ color: '#F59E0B' }}
                            >
                              <ExternalLink size={13} />
                            </button>
                          ) : (
                            <>
                              <button onClick={() => { setEditingId(item.id); setEditDraft({ ...item }) }} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Edit2 size={13} /></button>
                              <button onClick={() => borrarFlujo(item.id)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Trash2 size={13} /></button>
                            </>
                          )}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-xs" style={{ color: 'var(--color-muted)' }}>Sin items</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Flujo de Caja Mensual</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Ingresos y gastos recurrentes del mes</p>
        </div>
        <button onClick={() => { setAdding(true); setNewDraft({ ...EMPTY }) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--color-acento)' }}>
          <Plus size={16} /> Agregar
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ingresos', pen: totalIngresosPEN, usd: totalIngresosUSD, color: '#22c55e' },
          { label: 'Gastos', pen: totalGastosPEN, usd: totalGastosUSD, color: '#ef4444' },
          { label: 'Flujo Neto', pen: flujoPEN, usd: flujoUSD, color: flujoPEN >= 0 ? '#22c55e' : '#ef4444' },
        ].map(({ label, pen, usd, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label}</p>
            <p className="font-bold text-sm font-mono" style={{ color }}>{formatMonto(totalEnPEN(pen, usd), config)}</p>
            {pen !== 0 && usd !== 0 && (
              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                {formatMonto(pen, config)} + $ {fmt(usd, config.decimales)}
              </p>
            )}
            {pen === 0 && usd !== 0 && <p className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>$ {fmt(usd)}</p>}
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <TipoCambioWidget autoFetch={false} />
      </div>

      {adding && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-texto)' }}>Nuevo item</p>
          <ItemForm value={newDraft} onChange={setNewDraft} onSave={handleAdd} onCancel={() => { setAdding(false); setNewDraft({ ...EMPTY }) }} />
        </div>
      )}

      {renderSection('Ingresos', ingresos, '#22c55e')}
      {renderSection('Gastos', gastos, '#ef4444')}

      {flujoCaja.filter(i => !i.activo).length > 0 && (
        <div>
          <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>Inactivos ({flujoCaja.filter(i => !i.activo).length})</p>
          {flujoCaja.filter(i => !i.activo).map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2 rounded-lg mb-1 opacity-50" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
              <span className="flex-1 text-sm line-through" style={{ color: 'var(--color-muted)' }}>{item.nombre}</span>
              {item.suscripcionId ? (
                <button onClick={() => navigate('/suscripciones')} title="Editar en Suscripciones" className="p-1" style={{ color: 'var(--color-acento)' }}><ExternalLink size={12} /></button>
              ) : item.gastoFamiliaId ? (
                <button onClick={() => navigate('/gastos-familia')} title="Editar en Gastos Familia" className="p-1" style={{ color: '#F59E0B' }}><ExternalLink size={12} /></button>
              ) : (
                <>
                  <button onClick={() => { setEditingId(item.id); setEditDraft({ ...item }) }} className="p-1" style={{ color: 'var(--color-muted)' }}><Edit2 size={12} /></button>
                  <button onClick={() => borrarFlujo(item.id)} className="p-1" style={{ color: 'var(--color-muted)' }}><Trash2 size={12} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
