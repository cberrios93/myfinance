import { useState } from 'react'
import * as XLSX from 'xlsx'
import { FileDown } from 'lucide-react'
import { useScenario } from '../../data/ScenarioContext'
import { simular } from '../../engine/calculator'

export default function ExportExcel() {
  const { escenarioActivo, resultadoActivo } = useScenario()
  const [exporting, setExporting] = useState(false)

  if (!escenarioActivo || !resultadoActivo) {
    return <div className="text-center py-20" style={{ color: 'var(--color-muted)' }}>No hay escenario activo.</div>
  }

  function handleExport() {
    if (!escenarioActivo) return
    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()
      const { general, instrumentos, movimientos, eventosVida, carrera } = escenarioActivo
      const resultado = simular(escenarioActivo)

      // Hoja General
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
        edadActual: general.edadActual,
        edadRetiro: general.edadRetiro,
        anioActual: general.anioActual,
        swr: general.swr,
        metas: JSON.stringify(general.metas),
      }]), 'General')

      // Hoja Instrumentos
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

      // Hoja Movimientos
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        movimientos.map(m => ({
          id: m.id,
          anioT: m.anioT,
          desdeInstrumentoId: m.desdeInstrumentoId ?? '',
          haciaInstrumentoId: m.haciaInstrumentoId ?? '',
          monto: m.monto,
        }))
      ), 'Movimientos')

      // Hoja EventosVida
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

      // Hoja CarreraSaltos
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { campo: 'aporteAnualBase', valor: carrera.aporteAnualBase },
        { campo: 'crecimientoRealAnual', valor: carrera.crecimientoRealAnual },
        ...carrera.saltos.map(s => ({ campo: `salto_anioT_${s.anioT}`, valor: s.nuevoAporteAnual })),
      ]), 'CarreraSaltos')

      // Hoja Proyeccion
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

      XLSX.writeFile(wb, `${escenarioActivo.nombre.replace(/\s+/g, '_')}.xlsx`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Exportar a Excel</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Descarga el escenario activo como archivo .xlsx con todas las hojas del plan.
        </p>
      </div>

      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Escenario: {escenarioActivo.nombre}</p>
        <div className="space-y-1 text-sm" style={{ color: 'var(--color-muted)' }}>
          <p>El archivo incluirá 6 hojas:</p>
          {['General', 'Instrumentos', 'Movimientos', 'EventosVida', 'CarreraSaltos', 'Proyeccion'].map(h => (
            <p key={h} className="pl-3">· {h}</p>
          ))}
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-50"
        style={{ background: 'var(--color-acento)' }}
      >
        <FileDown size={16} />
        {exporting ? 'Generando…' : `Descargar ${escenarioActivo.nombre}.xlsx`}
      </button>
    </div>
  )
}
