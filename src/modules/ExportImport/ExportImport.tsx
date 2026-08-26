import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { FileDown, FileUp, CheckCircle, AlertTriangle } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useScenario } from '../../data/ScenarioContext'
import { simular } from '../../engine/calculator'
import type { Escenario } from '../../data/types'

type Tab = 'exportar' | 'importar'
type ImportResult = { ok: true; mensaje: string } | { ok: false; error: string }

const MODULOS_EXPORTAR = [
  { id: 'General', label: 'General (parámetros del escenario)' },
  { id: 'Instrumentos', label: 'Instrumentos' },
  { id: 'Movimientos', label: 'Movimientos' },
  { id: 'EventosVida', label: 'Eventos de vida' },
  { id: 'CarreraSaltos', label: 'Carrera y aportes' },
  { id: 'Proyeccion', label: 'Proyección (solo lectura)' },
]

const MODULOS_IMPORTAR = MODULOS_EXPORTAR.filter(m => m.id !== 'Proyeccion')

function parseSheet<T>(wb: XLSX.WorkBook, sheetName: string): T[] | null {
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return null
  return XLSX.utils.sheet_to_json<T>(sheet)
}

export default function ExportImport() {
  const { escenarioActivo, resultadoActivo, actualizarEscenario } = useScenario()
  const [tab, setTab] = useState<Tab>('exportar')
  const [selExport, setSelExport] = useState<Set<string>>(new Set(MODULOS_EXPORTAR.map(m => m.id)))
  const [selImport, setSelImport] = useState<Set<string>>(new Set(MODULOS_IMPORTAR.map(m => m.id)))
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!escenarioActivo || !resultadoActivo) {
    return <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>No hay escenario activo.</div>
  }

  function toggleExport(id: string) {
    setSelExport(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function toggleImport(id: string) {
    setSelImport(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function handleExport() {
    if (!escenarioActivo || selExport.size === 0) return
    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()
      const { general, instrumentos, movimientos, eventosVida, carrera } = escenarioActivo
      const resultado = simular(escenarioActivo)

      if (selExport.has('General')) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
          edadActual: general.edadActual,
          edadRetiro: general.edadRetiro,
          anioActual: general.anioActual,
          swr: general.swr,
          metas: JSON.stringify(general.metas),
        }]), 'General')
      }

      if (selExport.has('Instrumentos')) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          instrumentos.map(i => ({
            id: i.id,
            nombre: i.nombre,
            montoInicial: i.montoInicial,
            tasaReal: i.tasaReal,
            categoria: i.categoria,
            esPool: i.esPool,
            cambioTasaAnioT: i.cambioTasa?.anioT ?? '',
            cambioTasaNuevaTasa: i.cambioTasa?.nuevaTasa ?? '',
          }))
        ), 'Instrumentos')
      }

      if (selExport.has('Movimientos')) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          movimientos.map(m => ({
            id: m.id,
            anioT: m.anioT,
            desdeInstrumentoId: m.desdeInstrumentoId ?? '',
            haciaInstrumentoId: m.haciaInstrumentoId ?? '',
            monto: m.monto,
          }))
        ), 'Movimientos')
      }

      if (selExport.has('EventosVida')) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          eventosVida.map(ev => ({
            id: ev.id,
            nombre: ev.nombre,
            retiroUnico_anioT: ev.retiroUnico?.anioT ?? '',
            retiroUnico_monto: ev.retiroUnico?.monto ?? '',
            gastoRecurrente_anioInicioT: ev.gastoRecurrente?.anioInicioT ?? '',
            gastoRecurrente_anioFinT: ev.gastoRecurrente?.anioFinT ?? '',
            gastoRecurrente_montoMensual: ev.gastoRecurrente?.montoMensual ?? '',
          }))
        ), 'EventosVida')
      }

      if (selExport.has('CarreraSaltos')) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
          { campo: 'aporteAnualBase', valor: carrera.aporteAnualBase },
          { campo: 'crecimientoRealAnual', valor: carrera.crecimientoRealAnual },
          ...carrera.saltos.map(s => ({ campo: `salto_anioT_${s.anioT}`, valor: s.nuevoAporteAnual })),
        ]), 'CarreraSaltos')
      }

      if (selExport.has('Proyeccion')) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          resultado.anios.map(a => ({
            anioT: a.anioT,
            edad: a.edad,
            anioCalendario: a.anioCalendario,
            capitalTotal: Math.round(a.total),
            ingresoMensual: Math.round(a.ingresoMensual),
            aporteNeto: Math.round(a.aporteNeto),
            ...Object.fromEntries(instrumentos.map(i => [i.nombre, Math.round(a.balances[i.id] ?? 0)])),
          }))
        ), 'Proyeccion')
      }

      XLSX.writeFile(wb, `${escenarioActivo.nombre.replace(/\s+/g, '_')}.xlsx`)
    } finally {
      setExporting(false)
    }
  }

  function handleFile(file: File) {
    setImporting(true)
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        let updated: Escenario = { ...escenarioActivo! }

        if (selImport.has('General')) {
          const rows = parseSheet<Record<string, unknown>>(wb, 'General')
          if (rows && rows.length > 0) {
            const r = rows[0]
            updated = {
              ...updated,
              general: {
                ...updated.general,
                edadActual: Number(r.edadActual) || updated.general.edadActual,
                edadRetiro: Number(r.edadRetiro) || updated.general.edadRetiro,
                anioActual: Number(r.anioActual) || updated.general.anioActual,
                swr: Number(r.swr) || updated.general.swr,
                metas: r.metas ? JSON.parse(r.metas as string) : updated.general.metas,
              }
            }
          }
        }

        if (selImport.has('Instrumentos')) {
          const rows = parseSheet<Record<string, unknown>>(wb, 'Instrumentos')
          if (rows) {
            updated = {
              ...updated,
              instrumentos: rows.map(r => ({
                id: String(r.id || uuid()),
                nombre: String(r.nombre || ''),
                montoInicial: Number(r.montoInicial) || 0,
                tasaReal: Number(r.tasaReal) || 0,
                categoria: String(r.categoria || 'Otro'),
                esPool: r.esPool === true || r.esPool === 'true' || r.esPool === 1,
                cambioTasa: r.cambioTasaAnioT ? { anioT: Number(r.cambioTasaAnioT), nuevaTasa: Number(r.cambioTasaNuevaTasa) || 0 } : undefined,
              }))
            }
          }
        }

        if (selImport.has('Movimientos')) {
          const rows = parseSheet<Record<string, unknown>>(wb, 'Movimientos')
          if (rows) {
            updated = {
              ...updated,
              movimientos: rows.map(r => ({
                id: String(r.id || uuid()),
                anioT: Number(r.anioT) || 1,
                desdeInstrumentoId: r.desdeInstrumentoId ? String(r.desdeInstrumentoId) : null,
                haciaInstrumentoId: r.haciaInstrumentoId ? String(r.haciaInstrumentoId) : null,
                monto: r.monto === 'todo' ? 'todo' : Number(r.monto) || 0,
              }))
            }
          }
        }

        if (selImport.has('EventosVida')) {
          const rows = parseSheet<Record<string, unknown>>(wb, 'EventosVida')
          if (rows) {
            updated = {
              ...updated,
              eventosVida: rows.map(r => ({
                id: String(r.id || uuid()),
                nombre: String(r.nombre || ''),
                retiroUnico: r.retiroUnico_anioT ? { anioT: Number(r.retiroUnico_anioT), monto: Number(r.retiroUnico_monto) || 0 } : undefined,
                gastoRecurrente: r.gastoRecurrente_anioInicioT ? {
                  anioInicioT: Number(r.gastoRecurrente_anioInicioT),
                  anioFinT: Number(r.gastoRecurrente_anioFinT) || 0,
                  montoMensual: Number(r.gastoRecurrente_montoMensual) || 0,
                } : undefined,
              }))
            }
          }
        }

        if (selImport.has('CarreraSaltos')) {
          const rows = parseSheet<Record<string, unknown>>(wb, 'CarreraSaltos')
          if (rows) {
            const base = rows.find(r => r.campo === 'aporteAnualBase')
            const crec = rows.find(r => r.campo === 'crecimientoRealAnual')
            const saltos = rows
              .filter(r => String(r.campo).startsWith('salto_anioT_'))
              .map(r => ({
                anioT: parseInt(String(r.campo).replace('salto_anioT_', '')) || 1,
                nuevoAporteAnual: Number(r.valor) || 0,
              }))
            updated = {
              ...updated,
              carrera: {
                aporteAnualBase: base ? Number(base.valor) : updated.carrera.aporteAnualBase,
                crecimientoRealAnual: crec ? Number(crec.valor) : updated.carrera.crecimientoRealAnual,
                saltos,
              }
            }
          }
        }

        actualizarEscenario(updated)
          .then(() => setImportResult({ ok: true, mensaje: 'Importación completada. El escenario activo fue actualizado.' }))
          .catch(err => setImportResult({ ok: false, error: err.message }))
      } catch (err: unknown) {
        setImportResult({ ok: false, error: err instanceof Error ? err.message : 'Error al leer el archivo' })
      } finally {
        setImporting(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const tabStyle = (active: boolean) => ({
    background: active ? 'var(--color-acento)' : 'transparent',
    color: active ? '#fff' : 'var(--color-muted)',
    border: `1px solid ${active ? 'var(--color-acento)' : 'var(--color-borde)'}`,
  })

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Exportar / Importar</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Escenario activo: <span style={{ color: 'var(--color-texto)' }}>{escenarioActivo.nombre}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('exportar')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={tabStyle(tab === 'exportar')}
        >
          <FileDown size={15} /> Exportar
        </button>
        <button
          onClick={() => setTab('importar')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={tabStyle(tab === 'importar')}
        >
          <FileUp size={15} /> Importar
        </button>
      </div>

      {tab === 'exportar' && (
        <div className="space-y-4">
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Selecciona qué exportar</p>
            <div className="space-y-2">
              {MODULOS_EXPORTAR.map(m => (
                <label key={m.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selExport.has(m.id)}
                    onChange={() => toggleExport(m.id)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm" style={{ color: 'var(--color-texto)' }}>{m.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              {selExport.size} hoja{selExport.size !== 1 ? 's' : ''} seleccionada{selExport.size !== 1 ? 's' : ''}
            </p>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || selExport.size === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-50"
            style={{ background: 'var(--color-acento)' }}
          >
            <FileDown size={16} />
            {exporting ? 'Generando…' : `Descargar ${escenarioActivo.nombre.replace(/\s+/g, '_')}.xlsx`}
          </button>
        </div>
      )}

      {tab === 'importar' && (
        <div className="space-y-4">
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Selecciona qué importar</p>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Solo se procesan las hojas seleccionadas. Las hojas ausentes en el archivo se ignoran.
            </p>
            <div className="space-y-2">
              {MODULOS_IMPORTAR.map(m => (
                <label key={m.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selImport.has(m.id)}
                    onChange={() => toggleImport(m.id)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm" style={{ color: 'var(--color-texto)' }}>{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={importing || selImport.size === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: 'var(--color-acento)' }}
            >
              <FileUp size={16} />
              {importing ? 'Procesando…' : 'Seleccionar archivo .xlsx'}
            </button>
          </div>

          {importResult && (
            <div
              className="rounded-xl p-4 flex items-start gap-3"
              style={{
                background: importResult.ok ? '#10b98115' : '#ef444415',
                border: `1px solid ${importResult.ok ? '#10b981' : '#ef4444'}`,
              }}
            >
              {importResult.ok
                ? <CheckCircle size={18} color="#10b981" className="mt-0.5 flex-shrink-0" />
                : <AlertTriangle size={18} color="#ef4444" className="mt-0.5 flex-shrink-0" />}
              <p className="text-sm" style={{ color: importResult.ok ? '#10b981' : '#ef4444' }}>
                {importResult.ok ? importResult.mensaje : importResult.error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
