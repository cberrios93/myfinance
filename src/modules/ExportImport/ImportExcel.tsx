import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { FileUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useScenario } from '../../data/ScenarioContext'
import type { Escenario } from '../../data/types'

type ImportResult = { ok: true; mensaje: string } | { ok: false; error: string }

function parseSheet<T>(wb: XLSX.WorkBook, sheetName: string): T[] | null {
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return null
  return XLSX.utils.sheet_to_json<T>(sheet)
}

export default function ImportExcel() {
  const { escenarioActivo, actualizarEscenario } = useScenario()
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!escenarioActivo) return <div className="text-center py-20" style={{ color: 'var(--color-muted)' }}>No hay escenario activo.</div>

  function handleFile(file: File) {
    setLoading(true)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        let updated: Escenario = { ...escenarioActivo! }

        // Hoja General
        const generalRows = parseSheet<Record<string, unknown>>(wb, 'General')
        if (generalRows && generalRows.length > 0) {
          const r = generalRows[0]
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

        // Hoja Instrumentos
        const instRows = parseSheet<Record<string, unknown>>(wb, 'Instrumentos')
        if (instRows) {
          updated = {
            ...updated,
            instrumentos: instRows.map(r => ({
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

        // Hoja Movimientos
        const movRows = parseSheet<Record<string, unknown>>(wb, 'Movimientos')
        if (movRows) {
          updated = {
            ...updated,
            movimientos: movRows.map(r => ({
              id: String(r.id || uuid()),
              anioT: Number(r.anioT) || 1,
              desdeInstrumentoId: r.desdeInstrumentoId ? String(r.desdeInstrumentoId) : null,
              haciaInstrumentoId: r.haciaInstrumentoId ? String(r.haciaInstrumentoId) : null,
              monto: r.monto === 'todo' ? 'todo' : Number(r.monto) || 0,
            }))
          }
        }

        // Hoja EventosVida
        const evRows = parseSheet<Record<string, unknown>>(wb, 'EventosVida')
        if (evRows) {
          updated = {
            ...updated,
            eventosVida: evRows.map(r => ({
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

        // Hoja CarreraSaltos
        const carreraRows = parseSheet<Record<string, unknown>>(wb, 'CarreraSaltos')
        if (carreraRows) {
          const base = carreraRows.find(r => r.campo === 'aporteAnualBase')
          const crec = carreraRows.find(r => r.campo === 'crecimientoRealAnual')
          const saltos = carreraRows
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

        actualizarEscenario(updated)
          .then(() => setResult({ ok: true, mensaje: 'Importación completada. El escenario activo fue actualizado.' }))
          .catch(err => setResult({ ok: false, error: err.message }))
      } catch (err: unknown) {
        setResult({ ok: false, error: err instanceof Error ? err.message : 'Error al leer el archivo' })
      } finally {
        setLoading(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Importar desde Excel</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Carga un archivo .xlsx con el mismo formato del exportador. Solo se actualizan las hojas presentes.
        </p>
      </div>

      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          El archivo debe contener una o más de estas hojas: General, Instrumentos, Movimientos, EventosVida, CarreraSaltos.
        </p>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Escenario activo: <span style={{ color: 'var(--color-texto)' }}>{escenarioActivo.nombre}</span>
        </p>
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
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-50"
          style={{ background: 'var(--color-acento)' }}
        >
          <FileUp size={16} />
          {loading ? 'Procesando…' : 'Seleccionar archivo .xlsx'}
        </button>
      </div>

      {result && (
        <div className={`rounded-xl p-4 flex items-start gap-3`}
          style={{ background: result.ok ? '#10b98115' : '#ef444415', border: `1px solid ${result.ok ? '#10b981' : '#ef4444'}` }}>
          {result.ok
            ? <CheckCircle size={18} color="#10b981" className="mt-0.5 flex-shrink-0" />
            : <AlertTriangle size={18} color="#ef4444" className="mt-0.5 flex-shrink-0" />}
          <p className="text-sm" style={{ color: result.ok ? '#10b981' : '#ef4444' }}>
            {result.ok ? result.mensaje : result.error}
          </p>
        </div>
      )}
    </div>
  )
}
