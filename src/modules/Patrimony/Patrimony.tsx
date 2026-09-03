import { useState, useRef } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { Plus, Trash2, Edit2, Check, X, AlertTriangle, Link2, ChevronDown, History, RotateCcw, Pin, EyeOff, Eye } from 'lucide-react'
import { usePatrimony } from '../../data/PatrimonyContext'
import { useScenario } from '../../data/ScenarioContext'
import { useConfig } from '../../config/ConfigContext'
import { CATEGORIAS_PATRIMONIO } from '../../data/types'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import TipoCambioWidget from '../../components/TipoCambioWidget'
import type { CuentaPatrimonio, CuentaLog, CategoriaPatrimonio } from '../../data/types'

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr}h`
  const days = Math.floor(hr / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const CAT_COLORS: Record<string, string> = {
  'Savings': '#3B82F6',
  'Investment (Stock Exchange)': '#8B5CF6',
  'Investment (Fintech)': '#F59E0B',
  'Investment (Business)': '#10B981',
  'Asset': '#6B7280',
  'Liability': '#EF4444',
}


const EMPTY: Omit<CuentaPatrimonio, 'id' | 'creadoEn' | 'actualizadoEn'> = {
  nombre: '',
  categoria: 'Savings',
  montoPEN: undefined,
  montoUSD: undefined,
  esRiesgo: false,
  pinned: false,
  isHidden: false,
  orden: 0,
}

function fmt(n: number) {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isStale(actualizadoEn: string, diasLimite: number): boolean {
  return (Date.now() - new Date(actualizadoEn).getTime()) > diasLimite * 86_400_000
}

export default function Patrimony() {
  const { cuentas, loading, agregarCuenta, actualizarCuenta, borrarCuenta, togglePinCuenta, toggleHideCuenta, obtenerLogCuenta } = usePatrimony()
  const { config } = useConfig()
  const { escenarioActivo } = useScenario()
  const { user } = useAuth()
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
  const collapseKey = `patrimony_collapsed_${user?.id ?? 'anon'}`
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(collapseKey)
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
    } catch { return new Set() }
  })
  const [logOpenId, setLogOpenId] = useState<string | null>(null)
  const [logEntries, setLogEntries] = useState<CuentaLog[]>([])
  const [logLoading, setLogLoading] = useState(false)
  const [pinError, setPinError] = useState(false)
  const pinErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showHidden, setShowHidden] = useState(false)

  async function toggleLog(cuentaId: string) {
    if (logOpenId === cuentaId) { setLogOpenId(null); return }
    setLogOpenId(cuentaId)
    setLogLoading(true)
    try {
      const entries = await obtenerLogCuenta(cuentaId)
      setLogEntries(entries)
    } finally {
      setLogLoading(false)
    }
  }

  async function restaurarLog(cuenta: CuentaPatrimonio, entry: CuentaLog) {
    await actualizarCuenta({ ...cuenta, montoPEN: entry.montoPEN, montoUSD: entry.montoUSD })
    setLogOpenId(null)
  }

  function toggleCollapse(cat: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      try { localStorage.setItem(collapseKey, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const totalPEN = cuentas.reduce((s, c) => s + (c.montoPEN ?? 0), 0)
  const totalUSD = cuentas.reduce((s, c) => s + (c.montoUSD ?? 0), 0)
  const hiddenCount = cuentas.filter(c => c.isHidden).length
  const visibleCuentas = showHidden ? cuentas : cuentas.filter(c => !c.isHidden)
  const grouped = CATEGORIAS_PATRIMONIO.map(cat => ({
    cat,
    items: visibleCuentas.filter(c => c.categoria === cat).sort((a, b) => a.orden - b.orden),
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
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowHidden(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                border: '1px solid var(--color-borde)',
                color: showHidden ? 'var(--color-acento)' : 'var(--color-muted)',
                background: showHidden ? 'var(--color-acento)12' : 'transparent',
              }}
              title={showHidden ? 'Ocultar cuentas vacías' : `Mostrar ${hiddenCount} cuenta${hiddenCount !== 1 ? 's' : ''} oculta${hiddenCount !== 1 ? 's' : ''}`}
            >
              {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
              {showHidden ? 'Ocultar vacías' : `Ocultas (${hiddenCount})`}
            </button>
          )}
          <button
            onClick={() => { setAdding(true); setNewDraft({ ...EMPTY }) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--color-acento)' }}
          >
            <Plus size={16} /> Agregar cuenta
          </button>
        </div>
      </div>

      {/* Alerta pin */}
      {pinError && (
        <div style={{
          background: '#F59E0B18', border: '1px solid #F59E0B55', borderRadius: 8,
          padding: '8px 14px', fontSize: 13, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Pin size={13} style={{ fill: '#F59E0B', flexShrink: 0 }} />
          Límite de 5 cuentas destacadas. Quita una antes de agregar otra.
        </div>
      )}

      {/* Totales */}
      <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--color-borde)' }}>
        <table className="w-full text-sm min-w-[560px]">
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

            {grouped.map(({ cat, items }) => {
              const subPEN = items.reduce((s, c) => s + (c.montoPEN ?? 0), 0)
              const subUSD = items.reduce((s, c) => s + (c.montoUSD ?? 0), 0)
              const hasPEN = items.some(c => c.montoPEN != null)
              const hasUSD = items.some(c => c.montoUSD != null)
              const isCollapsed = collapsed.has(cat)
              return (
                <>
                  {/* Header colapsable con subtotales */}
                  <tr
                    key={`cat-${cat}`}
                    onClick={() => toggleCollapse(cat)}
                    className="cursor-pointer select-none"
                    style={{ background: `${CAT_COLORS[cat]}22` }}
                  >
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2">
                        <ChevronDown
                          size={14}
                          style={{
                            color: CAT_COLORS[cat],
                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                            transition: 'transform 200ms ease',
                            flexShrink: 0,
                          }}
                        />
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: CAT_COLORS[cat] }}>{cat}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs font-semibold" style={{ color: CAT_COLORS[cat] }}>
                      {hasPEN ? `S/ ${fmt(subPEN)}` : ''}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs font-semibold" style={{ color: CAT_COLORS[cat] }}>
                      {hasUSD ? `$ ${fmt(subUSD)}` : ''}
                    </td>
                    <td className="w-20" />
                  </tr>

                  {/* Filas de cuentas — ocultas cuando colapsado */}
                  {!isCollapsed && items.map(cuenta => (
                    <>
                      <tr
                        key={cuenta.id}
                        style={{
                          background: 'var(--color-card)',
                          borderBottom: logOpenId === cuenta.id ? 'none' : '1px solid var(--color-borde)',
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
                            <td className="px-4 py-2 pl-10">
                              <div className="flex items-center gap-2 flex-wrap">
                                {cuenta.esRiesgo && <AlertTriangle size={13} className="flex-shrink-0" style={{ color: '#ef4444' }} />}
                                <span>{cuenta.nombre}</span>
                                {cuentasVinculadas.has(cuenta.id) && (
                                  <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ background: '#10B98115', color: '#10B981' }}>
                                    <Link2 size={10} /> Simulación
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {isStale(cuenta.actualizadoEn, config.diasStalePatrimonio) && (
                                  <span
                                    className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ background: '#F59E0B' }}
                                    title={`Sin actualizar hace más de ${config.diasStalePatrimonio} días`}
                                  />
                                )}
                                <span className="text-xs" style={{ color: 'var(--color-muted)', opacity: 0.6 }}>
                                  {formatRelative(cuenta.actualizadoEn)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-sm">
                              {cuenta.montoPEN != null ? `S/ ${fmt(cuenta.montoPEN)}` : ''}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-sm">
                              {cuenta.montoUSD != null ? `$ ${fmt(cuenta.montoUSD)}` : ''}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <span className="flex justify-end gap-1">
                                {(cuenta.montoPEN == null || cuenta.montoPEN === 0) && (cuenta.montoUSD == null || cuenta.montoUSD === 0) && (
                                  <button
                                    onClick={e => { e.stopPropagation(); toggleHideCuenta(cuenta.id, !cuenta.isHidden) }}
                                    className="p-1.5 rounded hover:opacity-70"
                                    title={cuenta.isHidden ? 'Mostrar cuenta' : 'Ocultar cuenta vacía'}
                                    style={{ color: cuenta.isHidden ? 'var(--color-acento)' : 'var(--color-muted)' }}
                                  ><EyeOff size={13} /></button>
                                )}
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    if (!cuenta.pinned && cuentas.filter(c => c.pinned).length >= 5) {
                                      setPinError(true)
                                      if (pinErrorTimer.current) clearTimeout(pinErrorTimer.current)
                                      pinErrorTimer.current = setTimeout(() => setPinError(false), 3000)
                                      return
                                    }
                                    togglePinCuenta(cuenta.id, !cuenta.pinned)
                                  }}
                                  className="p-1.5 rounded hover:opacity-70"
                                  title={cuenta.pinned ? 'Quitar del Dashboard' : 'Mostrar en Dashboard'}
                                  style={{ color: cuenta.pinned ? '#F59E0B' : 'var(--color-muted)' }}
                                ><Pin size={13} style={{ fill: cuenta.pinned ? '#F59E0B' : 'none' }} /></button>
                                <button
                                  onClick={e => { e.stopPropagation(); toggleLog(cuenta.id) }}
                                  className="p-1.5 rounded hover:opacity-70"
                                  title="Historial de cambios"
                                  style={{ color: logOpenId === cuenta.id ? 'var(--color-acento)' : 'var(--color-muted)' }}
                                ><History size={13} /></button>
                                <button
                                  onClick={e => { e.stopPropagation(); setEditingId(cuenta.id); setEditDraft({ ...cuenta }) }}
                                  className="p-1.5 rounded hover:opacity-70"
                                  style={{ color: 'var(--color-muted)' }}
                                ><Edit2 size={13} /></button>
                                <button
                                  onClick={e => { e.stopPropagation(); borrarCuenta(cuenta.id) }}
                                  className="p-1.5 rounded hover:opacity-70"
                                  style={{ color: 'var(--color-muted)' }}
                                ><Trash2 size={13} /></button>
                              </span>
                            </td>
                          </>
                        )}
                      </tr>

                      {/* Fila de historial expandible */}
                      {logOpenId === cuenta.id && (
                        <tr key={`log-${cuenta.id}`} style={{ background: 'var(--color-fondo)', borderBottom: '1px solid var(--color-borde)' }}>
                          <td colSpan={4} className="px-10 py-3">
                            {logLoading ? (
                              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Cargando historial…</p>
                            ) : logEntries.length === 0 ? (
                              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Sin cambios registrados aún.</p>
                            ) : (
                              <div className="space-y-1">
                                {logEntries.map((entry, i) => (
                                  <div key={entry.id} className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                                    <span className="w-40 shrink-0">{formatDateTime(entry.creadoEn)}</span>
                                    <span className="font-mono" style={{ color: 'var(--color-texto)' }}>
                                      {entry.montoPEN != null && `S/ ${fmt(entry.montoPEN)}`}
                                      {entry.montoPEN != null && entry.montoUSD != null && ' · '}
                                      {entry.montoUSD != null && `$ ${fmt(entry.montoUSD)}`}
                                    </span>
                                    {i === 0 && <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--color-acento)20', color: 'var(--color-acento)' }}>actual</span>}
                                    {i > 0 && (
                                      <button
                                        onClick={() => restaurarLog(cuenta, entry)}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded hover:opacity-80"
                                        style={{ border: '1px solid var(--color-borde)', color: 'var(--color-muted)' }}
                                      >
                                        <RotateCcw size={10} /> Restaurar
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </>
              )
            })}

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
