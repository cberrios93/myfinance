import { useState, useEffect } from 'react'
import {
  obtenerEmailPreferencias,
  guardarEmailPreferencias,
  DIAS_SEMANA,
  ZONAS_HORARIAS,
  type EmailPreferencias as TEmailPreferencias,
} from '../../lib/supabase/emailPreferencias'
import { useUndo } from '../../contexts/UndoContext'

const HORAS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}))

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer"
      style={{ background: on ? 'var(--color-acento)' : 'var(--color-borde)' }}
    >
      <div
        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
        style={{ transform: on ? 'translateX(21px)' : 'translateX(3px)' }}
      />
    </div>
  )
}

const selectStyle = {
  background: 'var(--color-fondo)',
  color: 'var(--color-texto)',
  border: '1px solid var(--color-borde)',
}

export function EmailPreferencias() {
  const { showUndo } = useUndo()

  const [pref, setPref] = useState<TEmailPreferencias | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [activo, setActivo] = useState(true)
  const [diaSemana, setDiaSemana] = useState(1)
  const [hora, setHora] = useState(9)
  const [zonaHoraria, setZonaHoraria] = useState('America/Lima')

  useEffect(() => {
    obtenerEmailPreferencias().then(data => {
      if (data) {
        setPref(data)
        setActivo(data.activo)
        setDiaSemana(data.dia_semana)
        setHora(data.hora)
        setZonaHoraria(data.zona_horaria)
      }
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    const snapshot = pref
    try {
      await guardarEmailPreferencias({ activo, dia_semana: diaSemana, hora, zona_horaria: zonaHoraria })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      showUndo('Preferencias de email guardadas', async () => {
        if (snapshot) {
          await guardarEmailPreferencias({
            activo: snapshot.activo,
            dia_semana: snapshot.dia_semana,
            hora: snapshot.hora,
            zona_horaria: snapshot.zona_horaria,
          })
        }
      })
    } finally {
      setSaving(false)
    }
  }

  const zonaLabel = ZONAS_HORARIAS.find(z => z.value === zonaHoraria)?.label ?? zonaHoraria

  if (loading) {
    return (
      <div className="rounded-xl p-5 animate-pulse" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div className="h-4 w-40 rounded mb-3" style={{ background: 'var(--color-borde)' }} />
        <div className="h-3 w-64 rounded" style={{ background: 'var(--color-borde)' }} />
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-borde)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Resumen semanal por email</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Patrimonio, flujo, inversiones, alertas e insights generados por IA
          </p>
        </div>
        <Toggle on={activo} onToggle={() => setActivo(v => !v)} />
      </div>

      {/* Configuración */}
      <div
        className="px-5 py-4 space-y-4 transition-opacity"
        style={{ opacity: activo ? 1 : 0.4, pointerEvents: activo ? 'auto' : 'none' }}
      >
        {/* Día y hora */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>Día de envío</label>
            <select
              value={diaSemana}
              onChange={e => setDiaSemana(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={selectStyle}
            >
              {DIAS_SEMANA.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>Hora de envío</label>
            <select
              value={hora}
              onChange={e => setHora(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={selectStyle}
            >
              {HORAS.map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Zona horaria */}
        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>Zona horaria</label>
          <select
            value={zonaHoraria}
            onChange={e => setZonaHoraria(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={selectStyle}
          >
            {ZONAS_HORARIAS.map(z => (
              <option key={z.value} value={z.value}>{z.label}</option>
            ))}
          </select>
        </div>

        {/* Preview */}
        <div className="rounded-lg px-3 py-2.5 flex items-center gap-2" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
          <span className="text-base">📬</span>
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Recibirás el email cada{' '}
            <span className="font-medium" style={{ color: 'var(--color-texto)' }}>{DIAS_SEMANA[diaSemana]}</span>{' '}
            a las{' '}
            <span className="font-medium" style={{ color: 'var(--color-texto)' }}>{hora.toString().padStart(2, '0')}:00</span>
            {' '}· {zonaLabel}
          </span>
        </div>
      </div>

      {/* Botón guardar */}
      <div className="px-5 py-3 flex justify-end" style={{ borderTop: '1px solid var(--color-borde)' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={saved
            ? { background: 'rgba(0,201,167,0.12)', color: 'var(--color-acento)' }
            : { background: 'var(--color-acento)', color: '#fff' }
          }
        >
          {saving
            ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : saved ? '✓ Guardado' : 'Guardar preferencias'
          }
        </button>
      </div>
    </div>
  )
}
