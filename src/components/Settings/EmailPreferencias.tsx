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

export function EmailPreferencias() {
  const { showUndo } = useUndo()

  const [pref, setPref] = useState<TEmailPreferencias | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Formulario local
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
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 animate-pulse">
        <div className="h-4 w-40 rounded bg-[var(--color-border)] mb-3" />
        <div className="h-3 w-64 rounded bg-[var(--color-border)]" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Resumen semanal por email</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Patrimonio, flujo, inversiones, alertas e insights generados por IA
          </p>
        </div>
        {/* Toggle activo */}
        <button
          onClick={() => setActivo(v => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            activo ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
          }`}
          aria-label={activo ? 'Desactivar email' : 'Activar email'}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            activo ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Configuración */}
      <div className={`px-5 py-4 space-y-4 transition-opacity ${!activo ? 'opacity-40 pointer-events-none' : ''}`}>

        {/* Día y hora */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Día de envío</label>
            <select
              value={diaSemana}
              onChange={e => setDiaSemana(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            >
              {DIAS_SEMANA.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Hora de envío</label>
            <select
              value={hora}
              onChange={e => setHora(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            >
              {HORAS.map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Zona horaria */}
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Zona horaria</label>
          <select
            value={zonaHoraria}
            onChange={e => setZonaHoraria(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          >
            {ZONAS_HORARIAS.map(z => (
              <option key={z.value} value={z.value}>{z.label}</option>
            ))}
          </select>
        </div>

        {/* Preview del schedule */}
        <div className="rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2.5 flex items-center gap-2">
          <span className="text-base">📬</span>
          <span className="text-xs text-[var(--color-text-muted)]">
            Recibirás el email cada <span className="font-medium text-[var(--color-text)]">{DIAS_SEMANA[diaSemana]}</span>{' '}
            a las <span className="font-medium text-[var(--color-text)]">{hora.toString().padStart(2, '0')}:00</span>{' '}
            · {zonaLabel}
          </span>
        </div>
      </div>

      {/* Botón guardar */}
      <div className="px-5 py-3 border-t border-[var(--color-border)] flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            saved
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-[var(--color-accent)] text-white hover:opacity-90'
          } disabled:opacity-50`}
        >
          {saving ? (
            <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : saved ? (
            '✓ Guardado'
          ) : (
            'Guardar preferencias'
          )}
        </button>
      </div>
    </div>
  )
}
