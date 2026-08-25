import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { useFinanceData } from '../../data/FinanceDataContext'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import type { Rendimiento } from '../../data/types'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import TipoCambioWidget from '../../components/TipoCambioWidget'

function fmt(n: number, dec = 2) { return n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec }) }
function fmtPct(n: number) { return `${(n * 100).toFixed(2)}%` }

const CURRENT_YEAR = new Date().getFullYear()
const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

const EMPTY: Omit<Rendimiento, 'id' | 'creadoEn' | 'actualizadoEn'> = {
  anio: CURRENT_YEAR, instrumentoNombre: '', fechaPago: undefined, gananciasPEN: undefined,
  gananciasUSD: undefined, inversionPEN: undefined, inversionUSD: undefined,
  rentabilidad: undefined, reinvertido: false, marcado: false, comentario: undefined,
}

function RendForm({ value, onChange, onSave, onCancel }: {
  value: Omit<Rendimiento, 'id' | 'creadoEn' | 'actualizadoEn'>
  onChange: (v: any) => void; onSave: () => void; onCancel: () => void
}) {
  useSubmitOnCmdEnter(onSave)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Instrumento</label>
          <input value={value.instrumentoNombre} onChange={e => onChange({ ...value, instrumentoNombre: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Ej. Prestamype P02592" autoFocus />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Año</label>
          <input type="number" min={2015} max={2100} value={value.anio}
            onChange={e => onChange({ ...value, anio: parseInt(e.target.value) || CURRENT_YEAR })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Fecha de pago</label>
          <input type="date" value={value.fechaPago ?? ''}
            onChange={e => onChange({ ...value, fechaPago: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Ganancias PEN (S/)</label>
          <input type="number" step={0.01} value={value.gananciasPEN ?? ''}
            onChange={e => onChange({ ...value, gananciasPEN: e.target.value !== '' ? parseFloat(e.target.value) : undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} placeholder="—" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Ganancias USD ($)</label>
          <input type="number" step={0.01} value={value.gananciasUSD ?? ''}
            onChange={e => onChange({ ...value, gananciasUSD: e.target.value !== '' ? parseFloat(e.target.value) : undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} placeholder="—" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Inversión PEN (S/)</label>
          <input type="number" step={0.01} value={value.inversionPEN ?? ''}
            onChange={e => onChange({ ...value, inversionPEN: e.target.value !== '' ? parseFloat(e.target.value) : undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} placeholder="—" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Inversión USD ($)</label>
          <input type="number" step={0.01} value={value.inversionUSD ?? ''}
            onChange={e => onChange({ ...value, inversionUSD: e.target.value !== '' ? parseFloat(e.target.value) : undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} placeholder="—" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Rentabilidad (manual %)</label>
          <input type="number" step={0.01} value={value.rentabilidad != null ? value.rentabilidad * 100 : ''}
            onChange={e => onChange({ ...value, rentabilidad: e.target.value !== '' ? parseFloat(e.target.value) / 100 : undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} placeholder="Auto" />
        </div>
        <div className="sm:col-span-3">
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Comentario</label>
          <input value={value.comentario ?? ''} onChange={e => onChange({ ...value, comentario: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Notas opcionales" />
        </div>
        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-texto)' }}>
            <input type="checkbox" checked={value.reinvertido} onChange={e => onChange({ ...value, reinvertido: e.target.checked })} />
            Reinvertido
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-texto)' }}>
            <input type="checkbox" checked={value.marcado} onChange={e => onChange({ ...value, marcado: e.target.checked })} />
            * Pendiente
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

function calcRent(r: Rendimiento): number | null {
  if (r.rentabilidad != null) return r.rentabilidad
  const gan = (r.gananciasPEN ?? 0)
  const inv = (r.inversionPEN ?? 0)
  if (inv > 0) return gan / inv
  const ganU = (r.gananciasUSD ?? 0)
  const invU = (r.inversionUSD ?? 0)
  if (invU > 0) return ganU / invU
  return null
}

export default function Returns() {
  const { rendimientos, loading, agregarRendimiento, actualizarRendimiento, borrarRendimiento } = useFinanceData()
  const { tc: tcData } = useTipoCambio()
  const tc = tcData?.compra ?? 3.7
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState({ ...EMPTY })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Rendimiento | null>(null)
  const [anioFiltro, setAnioFiltro] = useState(CURRENT_YEAR)

  const years = [...new Set(rendimientos.map(r => r.anio))].sort((a, b) => b - a)
  if (!years.includes(CURRENT_YEAR)) years.unshift(CURRENT_YEAR)

  const del_anio = rendimientos.filter(r => r.anio === anioFiltro)
  const totalGanPEN = del_anio.reduce((s, r) => s + (r.gananciasPEN ?? 0), 0)
  const totalGanUSD = del_anio.reduce((s, r) => s + (r.gananciasUSD ?? 0), 0)
  const totalInvPEN = del_anio.reduce((s, r) => s + (r.inversionPEN ?? 0), 0)

  async function handleAdd() {
    if (!newDraft.instrumentoNombre.trim()) return
    await agregarRendimiento({ ...newDraft, anio: anioFiltro })
    setAdding(false); setNewDraft({ ...EMPTY, anio: anioFiltro })
  }

  async function handleSaveEdit() {
    if (!editDraft) return
    await actualizarRendimiento(editDraft)
    setEditingId(null); setEditDraft(null)
  }

  if (loading) return <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>Cargando…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Rendimiento de Inversiones</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Ganancias reales por instrumento y año</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={anioFiltro} onChange={e => setAnioFiltro(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => { setAdding(true); setNewDraft({ ...EMPTY, anio: anioFiltro }) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--color-acento)' }}>
            <Plus size={16} /> Agregar
          </button>
        </div>
      </div>

      {/* Resumen del año */}
      <div className="grid grid-cols-3 gap-4">
        {(() => {
          const ganTotal = totalGanPEN + totalGanUSD * tc
          const ganColor = ganTotal >= 0 ? '#22c55e' : '#ef4444'
          return [
            {
              label: 'Ganancias totales',
              main: `S/ ${fmt(ganTotal)}`,
              sub: totalGanUSD !== 0 ? `S/ ${fmt(totalGanPEN)} + $ ${fmt(totalGanUSD)}` : null,
              color: ganColor,
            },
            {
              label: 'Ganancias USD',
              main: `$ ${fmt(totalGanUSD)}`,
              sub: `≈ S/ ${fmt(totalGanUSD * tc)}`,
              color: totalGanUSD >= 0 ? '#22c55e' : '#ef4444',
            },
            {
              label: 'Total invertido',
              main: `S/ ${fmt(totalInvPEN)}`,
              sub: null,
              color: 'var(--color-texto)',
            },
          ].map(({ label, main, sub, color }) => (
            <div key={label} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label}</p>
              <p className="font-bold text-sm font-mono" style={{ color }}>{main}</p>
              {sub && <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{sub}</p>}
            </div>
          ))
        })()}
      </div>
      <div className="flex justify-end">
        <TipoCambioWidget autoFetch={false} />
      </div>

      {adding && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-texto)' }}>Nuevo rendimiento — {anioFiltro}</p>
          <RendForm value={newDraft} onChange={setNewDraft} onSave={handleAdd} onCancel={() => { setAdding(false); setNewDraft({ ...EMPTY, anio: anioFiltro }) }} />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-borde)' }}>
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr style={{ background: '#1e3a5f', color: '#fff' }}>
              <th className="text-left px-3 py-3 font-semibold">Instrumento</th>
              <th className="text-left px-3 py-3 font-semibold text-xs">Fecha pago</th>
              <th className="text-right px-3 py-3 font-semibold text-xs">Gan. PEN</th>
              <th className="text-right px-3 py-3 font-semibold text-xs">Gan. USD</th>
              <th className="text-right px-3 py-3 font-semibold text-xs">Inv. PEN</th>
              <th className="text-right px-3 py-3 font-semibold text-xs">Inv. USD</th>
              <th className="text-right px-3 py-3 font-semibold text-xs">Rentab.</th>
              <th className="text-center px-3 py-3 font-semibold text-xs">Reinv.</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {del_anio.map(r => {
              const rent = calcRent(r)
              if (editingId === r.id && editDraft) {
                return (
                  <tr key={r.id} style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-borde)' }}>
                    <td colSpan={9} className="px-4 py-3">
                      <RendForm value={editDraft} onChange={setEditDraft} onSave={handleSaveEdit} onCancel={() => { setEditingId(null); setEditDraft(null) }} />
                    </td>
                  </tr>
                )
              }
              return (
                <tr key={r.id} style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-borde)', color: r.marcado ? '#f59e0b' : 'var(--color-texto)' }}>
                  <td className="px-3 py-2.5 font-medium text-sm">
                    {r.marcado && <span className="mr-1 text-yellow-400">*</span>}{r.instrumentoNombre}
                    {r.comentario && <span className="block text-xs font-normal mt-0.5" style={{ color: 'var(--color-muted)' }}>{r.comentario}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-muted)' }}>{r.fechaPago ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs" style={{ color: (r.gananciasPEN ?? 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {r.gananciasPEN != null ? `S/ ${fmt(r.gananciasPEN)}` : ''}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs" style={{ color: (r.gananciasUSD ?? 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {r.gananciasUSD != null ? `$ ${fmt(r.gananciasUSD)}` : ''}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                    {r.inversionPEN != null ? `S/ ${fmt(r.inversionPEN)}` : ''}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                    {r.inversionUSD != null ? `$ ${fmt(r.inversionUSD)}` : ''}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs" style={{ color: rent != null && rent >= 0 ? '#22c55e' : '#ef4444' }}>
                    {rent != null ? fmtPct(rent) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs">{r.reinvertido ? '✓' : ''}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="flex justify-end gap-1">
                      <button onClick={() => { setEditingId(r.id); setEditDraft({ ...r }) }} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Edit2 size={13} /></button>
                      <button onClick={() => borrarRendimiento(r.id)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Trash2 size={13} /></button>
                    </span>
                  </td>
                </tr>
              )
            })}
            {del_anio.length === 0 && !adding && (
              <tr><td colSpan={9} className="text-center py-12 text-sm" style={{ color: 'var(--color-muted)' }}>Sin registros para {anioFiltro}. Agrega el primer rendimiento.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
