import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useScenario } from '../../data/ScenarioContext'
import type { Carrera, SaltoCarrera } from '../../data/types'
import { useConfig } from '../../config/ConfigContext'
import { formatAbrev } from '../../lib/formatMonto'

export default function Career() {
  const { escenarioActivo, actualizarEscenario } = useScenario()
  const { config } = useConfig()
  const [carrera, setCarrera] = useState<Carrera | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (escenarioActivo) setCarrera({ ...escenarioActivo.carrera, saltos: [...escenarioActivo.carrera.saltos] })
  }, [escenarioActivo?.id])

  if (!escenarioActivo || !carrera) return <div className="text-center py-20" style={{ color: 'var(--color-muted)' }}>No hay escenario activo.</div>

  const { anioActual, edadActual, edadRetiro } = escenarioActivo.general
  const tToAnio = (t: number) => anioActual + t
  const tToEdad = (t: number) => edadActual + t
  const anioMaximo = anioActual + (edadRetiro - edadActual)
  const aniosDisponibles = Array.from(
    { length: anioMaximo - anioActual },
    (_, i) => anioActual + i + 1
  )

  const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

  function updateSalto(i: number, salto: SaltoCarrera) {
    const saltos = [...carrera!.saltos]
    saltos[i] = salto
    setCarrera({ ...carrera!, saltos })
  }

  function addSalto() {
    setCarrera({ ...carrera!, saltos: [...carrera!.saltos, { anioT: 1, nuevoAporteAnual: 0 }] })
  }

  function removeSalto(i: number) {
    setCarrera({ ...carrera!, saltos: carrera!.saltos.filter((_, idx) => idx !== i) })
  }

  async function handleSave() {
    setSaving(true)
    try {
      await actualizarEscenario({ ...escenarioActivo!, carrera: carrera! })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Carrera y aportes</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Define el aporte base anual y los saltos de carrera (aumentos de sueldo o cambios de empleo).
        </p>
      </div>

      <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Base</h2>

        <div className="flex items-center justify-between gap-4">
          <label className="text-sm" style={{ color: 'var(--color-texto)' }}>Aporte anual base (S/)</label>
          <input type="number" min={0} value={carrera.aporteAnualBase}
            onChange={e => setCarrera({ ...carrera, aporteAnualBase: parseFloat(e.target.value) || 0 })}
            className="w-36 px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="text-sm" style={{ color: 'var(--color-texto)' }}>Crecimiento real anual (%)</label>
          <input type="number" min={-10} max={30} step={0.1}
            value={parseFloat((carrera.crecimientoRealAnual * 100).toFixed(3))}
            onChange={e => setCarrera({ ...carrera, crecimientoRealAnual: (parseFloat(e.target.value) || 0) / 100 })}
            className="w-36 px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} />
        </div>

        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Aporte {tToAnio(1)} ({tToEdad(1)} años): {formatAbrev(Math.round(carrera.aporteAnualBase * (1 + carrera.crecimientoRealAnual)), config)} · Mensual: {formatAbrev(Math.round(carrera.aporteAnualBase * (1 + carrera.crecimientoRealAnual) / 12), config)}
        </p>
      </div>

      <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Saltos de carrera</h2>
          <button onClick={addSalto} className="flex items-center gap-1.5 text-sm hover:opacity-80" style={{ color: 'var(--color-acento)' }}>
            <Plus size={14} /> Agregar salto
          </button>
        </div>

        {carrera.saltos.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Sin saltos. El aporte crece solo por el porcentaje de crecimiento real.</p>
        )}

        {carrera.saltos.sort((a, b) => a.anioT - b.anioT).map((salto, i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Año</label>
                <select
                  value={tToAnio(salto.anioT)}
                  onChange={e => updateSalto(i, { ...salto, anioT: parseInt(e.target.value) - anioActual })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                >
                  {aniosDisponibles.map(anio => (
                    <option key={anio} value={anio}>{anio} — {edadActual + (anio - anioActual)} años</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Nuevo aporte anual (S/)</label>
                <input type="number" min={0} value={salto.nuevoAporteAnual}
                  onChange={e => updateSalto(i, { ...salto, nuevoAporteAnual: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono text-right" style={inputStyle} />
              </div>
            </div>
            <button onClick={() => removeSalto(i)} className="mt-5 p-1.5 hover:opacity-70" style={{ color: 'var(--color-muted)' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-50"
          style={{ background: 'var(--color-acento)' }}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {saved && <span className="text-sm text-green-400">✓ Guardado</span>}
      </div>
    </div>
  )
}
