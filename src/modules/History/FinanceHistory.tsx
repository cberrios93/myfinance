import { useState, useRef } from 'react'
import { Plus, Trash2, Edit2, Check, X, Download, Upload, AlertCircle } from 'lucide-react'
import { usePatrimony } from '../../data/PatrimonyContext'
import type { HistorialMensual } from '../../data/types'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import TipoCambioWidget from '../../components/TipoCambioWidget'
import { tcCacheado } from '../../lib/tipoCambio'
import { useConfig } from '../../config/ConfigContext'
import { formatMonto } from '../../lib/formatMonto'

function fmt(n: number, dec = 2) {
  return n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function fmtPct(n: number) {
  const s = n >= 0 ? `+${fmt(n, 2)}%` : `${fmt(n, 2)}%`
  return s
}

function GrowthCell({ value }: { value: number | null }) {
  if (value === null) return <td className="px-3 py-2.5 text-center text-xs" style={{ color: 'var(--color-muted)' }}>—</td>
  const color = value > 0 ? '#22c55e' : value < 0 ? '#ef4444' : 'var(--color-muted)'
  return (
    <td className="px-3 py-2.5 text-right font-mono text-xs" style={{ color }}>
      {fmtPct(value)}
    </td>
  )
}

function totalEnPEN(h: HistorialMensual) {
  return h.totalPEN + h.totalUSD * h.tipoCambio
}

function calcGrowth(current: number, prev: number) {
  if (prev === 0) return null
  return ((current - prev) / prev) * 100
}

function makeEmpty(threshold = 10): Omit<HistorialMensual, 'id' | 'creadoEn' | 'actualizadoEn'> {
  const fecha = new Date().toISOString().slice(0, 10)
  const tc = tcCacheado()?.venta ?? 3.7
  return { fecha, periodo: fechaToPeriodo(fecha, threshold), totalPEN: 0, totalUSD: 0, tipoCambio: tc, nota: '' }
}

function fechaToPeriodo(fecha: string, threshold = 10): string {
  const d = new Date(fecha + 'T12:00:00')
  const day = d.getDate()
  const ref = day <= threshold
    ? new Date(d.getFullYear(), d.getMonth() - 1, 1)
    : new Date(d.getFullYear(), d.getMonth(), 1)
  const m = String(ref.getMonth() + 1).padStart(2, '0')
  return `${m} - ${ref.getFullYear()}`
}

// ─── CSV helpers ────────────────────────────────────────────────────────────

const CSV_HEADERS = ['fecha', 'total_pen', 'total_usd', 'tipo_cambio', 'nota']
const CSV_EXAMPLE = [
  ['2020-03-27', '647338.17', '66189.56', '3.4000', ''],
  ['2020-05-08', '668645.87', '78520.86', '3.4000', ''],
  ['2021-01-01', '0', '0', '3.624', 'No se guardó registros'],
]

function downloadTemplate() {
  const rows = [CSV_HEADERS, ...CSV_EXAMPLE].map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + rows], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'historial_financiero_template.csv'; a.click()
  URL.revokeObjectURL(url)
}

function parseNum(raw: string): number {
  if (!raw || raw.trim() === '') return 0
  // Handle European format (1.234.567,89) or standard (1234567.89)
  const s = raw.trim().replace(/\s/g, '')
  const hasCommaDecimal = /,\d{1,2}$/.test(s) && !s.includes('.')
  const mixedEu = /\.\d{3}/.test(s) && /,\d/.test(s)
  if (mixedEu) return parseFloat(s.replace(/\./g, '').replace(',', '.'))
  if (hasCommaDecimal) return parseFloat(s.replace(',', '.'))
  return parseFloat(s.replace(',', '')) || 0
}

function parseDate(raw: string): string {
  const s = raw.trim()
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return s
}

function parseCSV(text: string, threshold = 10): Omit<HistorialMensual, 'id' | 'creadoEn' | 'actualizadoEn'>[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  if (lines.length < 2) throw new Error('El archivo no tiene datos.')

  // Auto-detect delimiter (check across first few lines)
  const sampleLine = lines.slice(0, 5).find(l => l.includes(';') || l.includes(',')) ?? lines[0]
  const delim = sampleLine.includes(';') ? ';' : ','

  // Find the header row — scan up to first 5 lines looking for 'fecha'
  const headerLineIdx = lines.slice(0, 5).findIndex(l =>
    l.toLowerCase().replace(/["\s]/g, '').includes('fecha')
  )
  if (headerLineIdx < 0) throw new Error('No se encontró la fila de encabezados. Asegúrate de que el CSV tenga una columna "fecha".')
  const headers = lines[headerLineIdx].split(delim).map(h => h.trim().toLowerCase().replace(/["\s]/g, ''))

  const idx = (names: string[]) => names.map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1

  const colFecha = idx(['fecha', 'date'])
  const colPEN   = idx(['total_pen', 'pen', 'soles', 'pen(s/)'])
  const colUSD   = idx(['total_usd', 'usd', 'dolares', 'usd($)'])
  const colTC    = idx(['tipo_cambio', 'exchange', 'tc', 'tipocambio'])
  const colNota  = idx(['nota', 'note', 'notas'])

  if (colFecha < 0 || colPEN < 0) throw new Error('No se encontraron las columnas "fecha" y "total_pen".')

  const results: Omit<HistorialMensual, 'id' | 'creadoEn' | 'actualizadoEn'>[] = []

  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map(c => c.trim().replace(/^"|"$/g, ''))
    const fecha = parseDate(cols[colFecha] ?? '')
    if (!fecha) continue

    const totalPEN  = colPEN  >= 0 ? parseNum(cols[colPEN])  : 0
    const totalUSD  = colUSD  >= 0 ? parseNum(cols[colUSD])  : 0
    const tipoCambio= colTC   >= 0 ? parseNum(cols[colTC])   : 3.7
    const nota      = colNota >= 0 ? (cols[colNota] || undefined) : undefined

    results.push({ fecha, periodo: fechaToPeriodo(fecha, threshold), totalPEN, totalUSD, tipoCambio: tipoCambio || 3.7, nota })
  }

  if (results.length === 0) throw new Error('No se encontraron filas válidas.')
  return results
}

// ────────────────────────────────────────────────────────────────────────────

// Clave localStorage: `periodo-descartado:${id}:${periodoCalculado}`
function dismissKey(id: string, calculado: string) { return `periodo-descartado:${id}:${calculado}` }
function isDismissed(id: string, calculado: string) {
  try { return localStorage.getItem(dismissKey(id, calculado)) === '1' } catch { return false }
}
function setDismissed(id: string, calculado: string) {
  try { localStorage.setItem(dismissKey(id, calculado), '1') } catch { /* noop */ }
}

export default function FinanceHistory() {
  const { historial, loading, agregarHistorial, actualizarHistorial, borrarHistorial } = usePatrimony()
  const { config } = useConfig()
  const diaCorte = config.diaCorteHistorial
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState(makeEmpty())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<HistorialMensual | null>(null)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<{ ok?: number; err?: string } | null>(null)
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const sorted = [...historial].sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Registros donde el periodo almacenado NO coincide con la lógica actual
  const allWrongPeriods = historial
    .filter(h => h.periodo !== fechaToPeriodo(h.fecha, diaCorte))
    .map(h => ({ h, calculado: fechaToPeriodo(h.fecha, diaCorte) }))

  // Excluye los que el usuario ya revisó y eligió mantener
  const wrongPeriods = allWrongPeriods.filter(
    ({ h, calculado }) => !isDismissed(h.id, calculado) && !dismissedKeys.has(dismissKey(h.id, calculado))
  )

  async function handleAplicarPeriodo(h: HistorialMensual, calculado: string) {
    await actualizarHistorial({ ...h, periodo: calculado })
  }

  function handleMantenerPeriodo(h: HistorialMensual, calculado: string) {
    setDismissed(h.id, calculado)
    setDismissedKeys(prev => new Set([...prev, dismissKey(h.id, calculado)]))
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportStatus(null)
    try {
      const text = await file.text()
      const rows = parseCSV(text, diaCorte)
      // Filter out rows that already exist by fecha
      const existingFechas = new Set(historial.map(h => h.fecha))
      const newRows = rows.filter(r => !existingFechas.has(r.fecha))
      for (const row of newRows) await agregarHistorial(row)
      setImportStatus({ ok: newRows.length })
    } catch (err: any) {
      setImportStatus({ err: err.message ?? 'Error al importar.' })
    } finally {
      setImporting(false)
    }
  }

  function getGrowths(idx: number) {
    if (idx === 0) return { gPEN: null, gUSD: null, gTotal: null, gAmount: null }
    const cur = sorted[idx], prev = sorted[idx - 1]
    const curTotal = totalEnPEN(cur), prevTotal = totalEnPEN(prev)
    return {
      gPEN: calcGrowth(cur.totalPEN, prev.totalPEN),
      gUSD: calcGrowth(cur.totalUSD, prev.totalUSD),
      gTotal: calcGrowth(curTotal, prevTotal),
      gAmount: curTotal - prevTotal,
    }
  }

  async function handleAdd() {
    if (!newDraft.totalPEN && !newDraft.totalUSD) return
    // periodo ya viene del form (con la lógica aplicada o sobrescrito manualmente)
    await agregarHistorial(newDraft)
    setAdding(false)
    setNewDraft(makeEmpty(diaCorte))
  }

  async function handleSaveEdit() {
    if (!editDraft) return
    await actualizarHistorial(editDraft)
    setEditingId(null)
    setEditDraft(null)
  }

  if (loading) return <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>Cargando…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Historial Mensual</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            {sorted.length} registro{sorted.length !== 1 ? 's' : ''} · Evolución del patrimonio total
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)', background: 'var(--color-card)' }}
            title="Descargar plantilla CSV"
          >
            <Download size={15} /> Plantilla CSV
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--color-acento)', border: '1px solid var(--color-acento)', background: 'var(--color-card)', opacity: importing ? 0.6 : 1 }}
            title="Importar CSV"
          >
            <Upload size={15} /> {importing ? 'Importando…' : 'Importar CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} />
          {wrongPeriods.length > 0 && (
            <span
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
              style={{ color: '#f59e0b', border: '1px solid #f59e0b', background: 'var(--color-card)' }}
              title={`${wrongPeriods.length} período${wrongPeriods.length !== 1 ? 's' : ''} por revisar`}
            >
              <AlertCircle size={15} />
              {wrongPeriods.length} período{wrongPeriods.length !== 1 ? 's' : ''} por revisar
            </span>
          )}
          <button
            onClick={() => { setAdding(true); setNewDraft(makeEmpty(diaCorte)) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--color-acento)' }}
          >
            <Plus size={16} /> Agregar mes
          </button>
        </div>
      </div>

      {wrongPeriods.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #f59e0b40' }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#f59e0b15' }}>
            <AlertCircle size={15} style={{ color: '#f59e0b' }} />
            <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>
              {wrongPeriods.length} registro{wrongPeriods.length !== 1 ? 's' : ''} con período distinto al que calcula la regla actual (día de corte: {diaCorte})
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-borde)' }}>
            {wrongPeriods.map(({ h, calculado }) => (
              <div key={h.id} className="flex items-center gap-4 px-4 py-3 flex-wrap" style={{ background: 'var(--color-card)' }}>
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  Fecha <span className="font-mono font-medium" style={{ color: 'var(--color-texto)' }}>{h.fecha}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span style={{ color: 'var(--color-muted)' }}>Almacenado:</span>
                  <span className="font-mono font-semibold" style={{ color: '#22c55e' }}>{h.periodo}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span style={{ color: 'var(--color-muted)' }}>Regla dice:</span>
                  <span className="font-mono font-semibold" style={{ color: '#f59e0b' }}>{calculado}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => handleAplicarPeriodo(h, calculado)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b50' }}
                  >
                    <Check size={12} /> Aplicar regla
                  </button>
                  <button
                    onClick={() => handleMantenerPeriodo(h, calculado)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}
                  >
                    <X size={12} /> Mantener como está
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {importStatus && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{
            background: importStatus.err ? '#ef444420' : '#22c55e20',
            border: `1px solid ${importStatus.err ? '#ef4444' : '#22c55e'}`,
            color: importStatus.err ? '#ef4444' : '#22c55e',
          }}
        >
          <AlertCircle size={16} />
          {importStatus.err
            ? `Error: ${importStatus.err}`
            : `${importStatus.ok} registro${importStatus.ok !== 1 ? 's' : ''} importado${importStatus.ok !== 1 ? 's' : ''} correctamente.`}
          <button onClick={() => setImportStatus(null)} className="ml-auto hover:opacity-70"><X size={14} /></button>
        </div>
      )}

      {adding && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-texto)' }}>Nuevo registro mensual</p>
          <HistorialForm
            value={newDraft}
            onChange={setNewDraft}
            onSave={handleAdd}
            onCancel={() => { setAdding(false); setNewDraft(makeEmpty(diaCorte)) }}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-borde)' }}>
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr style={{ background: '#1e3a5f', color: '#fff' }}>
              <th className="text-left px-3 py-3 font-semibold">Fecha</th>
              <th className="text-left px-3 py-3 font-semibold">Período</th>
              <th className="text-right px-3 py-3 font-semibold">PEN (S/)</th>
              <th className="text-right px-3 py-3 font-semibold text-xs">Δ% PEN</th>
              <th className="text-right px-3 py-3 font-semibold">USD ($)</th>
              <th className="text-right px-3 py-3 font-semibold text-xs">Δ% USD</th>
              <th className="text-right px-3 py-3 font-semibold">Total (S/)</th>
              <th className="text-right px-3 py-3 font-semibold text-xs">Δ% Total</th>
              <th className="text-right px-3 py-3 font-semibold text-xs">Δ Monto</th>
              <th className="text-right px-3 py-3 font-semibold text-xs">TC</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((h, idx) => {
              const { gPEN, gUSD, gTotal, gAmount } = getGrowths(idx)
              const total = totalEnPEN(h)
              const isEditing = editingId === h.id

              if (isEditing && editDraft) {
                return (
                  <tr key={h.id} style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-borde)' }}>
                    <td colSpan={11} className="px-4 py-3">
                      <HistorialForm
                        value={editDraft}
                        onChange={setEditDraft}
                        onSave={handleSaveEdit}
                        onCancel={() => { setEditingId(null); setEditDraft(null) }}
                      />
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={h.id} style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-muted)' }}>{h.fecha}</td>
                  <td className="px-3 py-2.5 text-xs font-medium">{h.periodo}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {h.nota ? <span style={{ color: 'var(--color-muted)' }}>{h.nota}</span> : formatMonto(h.totalPEN, config)}
                  </td>
                  <GrowthCell value={h.nota ? null : gPEN} />
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {!h.nota && h.totalUSD > 0 ? `$ ${fmt(h.totalUSD)}` : ''}
                  </td>
                  <GrowthCell value={h.nota ? null : (h.totalUSD > 0 ? gUSD : null)} />
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">
                    {h.nota ? '' : formatMonto(total, config)}
                  </td>
                  <GrowthCell value={h.nota ? null : gTotal} />
                  <td className="px-3 py-2.5 text-right font-mono text-xs" style={{ color: gAmount != null && gAmount >= 0 ? '#22c55e' : gAmount != null ? '#ef4444' : 'var(--color-muted)' }}>
                    {gAmount != null && !h.nota ? formatMonto(gAmount, config) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                    {h.tipoCambio.toFixed(4)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="flex justify-end gap-1">
                      <button onClick={() => { setEditingId(h.id); setEditDraft({ ...h }) }} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Edit2 size={13} /></button>
                      <button onClick={() => borrarHistorial(h.id)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Trash2 size={13} /></button>
                    </span>
                  </td>
                </tr>
              )
            })}

            {sorted.length === 0 && !adding && (
              <tr>
                <td colSpan={11} className="text-center py-12 text-sm" style={{ color: 'var(--color-muted)' }}>
                  Registra el primer mes para empezar a ver la evolución de tu patrimonio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HistorialForm({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: Omit<HistorialMensual, 'id' | 'creadoEn' | 'actualizadoEn'>
  onChange: (v: any) => void
  onSave: () => void
  onCancel: () => void
}) {
  useSubmitOnCmdEnter(onSave)
  const { config: cfg } = useConfig()
  const diaCorte = cfg.diaCorteHistorial
  const inputStyle = {
    background: 'var(--color-fondo)',
    color: 'var(--color-texto)',
    border: '1px solid var(--color-borde)',
  }

  const periodoAuto = value.fecha ? fechaToPeriodo(value.fecha, diaCorte) : ''
  const periodoModificado = value.periodo !== periodoAuto

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Fecha de registro</label>
          <input
            type="date"
            value={value.fecha}
            onChange={e => {
              const nuevaFecha = e.target.value
              // Solo actualiza el periodo automáticamente si el usuario no lo ha modificado manualmente
              const periodoActual = value.periodo
              const eraAuto = periodoActual === fechaToPeriodo(value.fecha, diaCorte) || !periodoActual
              onChange({ ...value, fecha: nuevaFecha, periodo: eraAuto ? fechaToPeriodo(nuevaFecha, diaCorte) : periodoActual })
            }}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="text-xs mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
            Período
            {periodoModificado && (
              <button
                type="button"
                onClick={() => onChange({ ...value, periodo: periodoAuto })}
                className="text-xs underline hover:opacity-70"
                style={{ color: 'var(--color-acento)' }}
                title="Restaurar período automático"
              >
                auto: {periodoAuto}
              </button>
            )}
          </label>
          <input
            value={value.periodo}
            onChange={e => onChange({ ...value, periodo: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
            style={{ ...inputStyle, borderColor: periodoModificado ? 'var(--color-acento)' : 'var(--color-borde)' }}
            placeholder="MM - YYYY"
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Total PEN (S/)</label>
          <input
            type="number" min={0} step={0.01}
            value={value.totalPEN || ''}
            onChange={e => onChange({ ...value, totalPEN: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
            style={inputStyle}
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Total USD ($)</label>
          <input
            type="number" min={0} step={0.01}
            value={value.totalUSD || ''}
            onChange={e => onChange({ ...value, totalUSD: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
            style={inputStyle}
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Tipo de cambio</label>
          <input
            type="number" min={1} step={0.001}
            value={value.tipoCambio}
            onChange={e => onChange({ ...value, tipoCambio: parseFloat(e.target.value) || 3.7 })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
            style={inputStyle}
          />
          <div className="mt-1.5">
            <TipoCambioWidget
              onUsar={tc => onChange({ ...value, tipoCambio: tc })}
              usarRate="venta"
            />
          </div>
        </div>
        <div className="sm:col-span-3">
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Nota (dejar vacío si hay datos)</label>
          <input
            value={value.nota ?? ''}
            onChange={e => onChange({ ...value, nota: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            placeholder='Ej. "No se guardó registros"'
          />
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
