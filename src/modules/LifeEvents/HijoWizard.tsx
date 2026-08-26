import { useState, useMemo } from 'react'
import { Check, X } from 'lucide-react'
import type { EventoVida, GeneralParams } from '../../data/types'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers

function anioTToCalendario(t: number, anioActual: number) { return anioActual + t }
function calendarioToAnioT(year: number, anioActual: number) { return Math.max(1, year - anioActual) }
function anioTToEdad(t: number, edadActual: number) { return edadActual + t }
const FM = (n: number) => Math.round(n).toLocaleString('es-PE')
const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none font-mono'
const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

// ─────────────────────────────────────────────────────────────────────────────
// Tipos

interface EtapaConfig {
  id: string
  label: string
  descripcion: string
  emoji: string
  edadDesde: number
  edadHasta: number   // inclusive
  opcional: boolean
}

const ETAPAS: EtapaConfig[] = [
  {
    id: 'bebe',
    label: 'Bebé',
    descripcion: 'Pañales, ropa, médico, vacunas, cunas, niñera, etc.',
    emoji: '👶',
    edadDesde: 0,
    edadHasta: 2,
    opcional: false,
  },
  {
    id: 'nido',
    label: 'Nido / Primera infancia',
    descripcion: 'Pensión de nido, útiles, uniforme, actividades, etc.',
    emoji: '🎒',
    edadDesde: 3,
    edadHasta: 5,
    opcional: false,
  },
  {
    id: 'colegio',
    label: 'Colegio',
    descripcion: 'Pensión mensual, material escolar, uniforme, actividades extracurriculares, etc.',
    emoji: '🏫',
    edadDesde: 6,
    edadHasta: 17,
    opcional: false,
  },
  {
    id: 'universidad',
    label: 'Universidad',
    descripcion: 'Pensión, materiales, transporte, salud, gastos personales, etc.',
    emoji: '🎓',
    edadDesde: 18,
    edadHasta: 22,
    opcional: false,
  },
  {
    id: 'postuni',
    label: 'Apoyo post-universidad',
    descripcion: 'Apoyo adicional mientras consigue estabilidad económica propia.',
    emoji: '🚀',
    edadDesde: 23,
    edadHasta: 25,
    opcional: true,
  },
]

interface HijoState {
  anioNacimiento: number
  gastosParto: number
  // costos mensuales por etapa
  costos: Record<string, number>
  // etapas opcionales habilitadas
  habilitadas: Record<string, boolean>
  // duración personalizable para post-uni
  duracionPostUni: number
}

const DEFAULTS_MENSUAL: Record<string, number> = {
  bebe:        1_500,
  nido:        1_200,
  colegio:     1_500,
  universidad: 2_500,
  postuni:       500,
}

// ─────────────────────────────────────────────────────────────────────────────
// Lógica de generación de eventos

function generarEventos(
  s: HijoState,
  general: GeneralParams,
): Omit<EventoVida, 'id'>[] {
  const { anioActual } = general
  const anioTNac = calendarioToAnioT(s.anioNacimiento, anioActual)
  const eventos: Omit<EventoVida, 'id'>[] = []

  // Parto — retiro único
  if (s.gastosParto > 0) {
    eventos.push({
      nombre: 'Hijo · Parto y primeros gastos',
      tipoEvento: 'hijo',
      retiroUnico: { anioT: anioTNac, monto: s.gastosParto },
    })
  }

  for (const etapa of ETAPAS) {
    if (etapa.opcional && !s.habilitadas[etapa.id]) continue
    const costo = s.costos[etapa.id] ?? 0
    if (costo <= 0) continue

    const anioInicioT = anioTNac + etapa.edadDesde
    const duracion = etapa.id === 'postuni'
      ? s.duracionPostUni
      : etapa.edadHasta - etapa.edadDesde + 1
    const anioFinT = anioInicioT + duracion

    eventos.push({
      nombre: `Hijo · ${etapa.label} (${etapa.edadDesde}–${etapa.id === 'postuni' ? etapa.edadDesde + duracion - 1 : etapa.edadHasta} años)`,
      tipoEvento: 'hijo',
      gastoRecurrente: {
        anioInicioT,
        anioFinT,
        montoMensual: costo,
      },
    })
  }

  return eventos
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente

export function HijoWizard({
  general,
  onConfirm,
  onCancel,
}: {
  general: GeneralParams
  onConfirm: (eventos: Omit<EventoVida, 'id'>[]) => void
  onCancel: () => void
}) {
  const { anioActual, edadActual } = general

  const [s, setS] = useState<HijoState>({
    anioNacimiento: anioActual + 1,
    gastosParto: 5_000,
    costos: { ...DEFAULTS_MENSUAL },
    habilitadas: { postuni: false },
    duracionPostUni: 3,
  })

  const anioTNac = calendarioToAnioT(s.anioNacimiento, anioActual)
  const edadPadre = anioTToEdad(anioTNac, edadActual)

  const preview = useMemo(() => generarEventos(s, general), [s, general])

  useMemo(() => {
    let sum = 0
    for (const etapa of ETAPAS) {
      if (etapa.opcional && !s.habilitadas[etapa.id]) continue
      sum += (s.costos[etapa.id] ?? 0)
    }
    return sum
  }, [s])

  const costoTotal = useMemo(() => {
    let total = s.gastosParto
    for (const etapa of ETAPAS) {
      if (etapa.opcional && !s.habilitadas[etapa.id]) continue
      const costo = s.costos[etapa.id] ?? 0
      const dur = etapa.id === 'postuni'
        ? s.duracionPostUni
        : etapa.edadHasta - etapa.edadDesde + 1
      total += costo * 12 * dur
    }
    return total
  }, [s])

  function setEtapaCosto(id: string, val: number) {
    setS(p => ({ ...p, costos: { ...p.costos, [id]: val } }))
  }

  function toggleHabilitada(id: string) {
    setS(p => ({ ...p, habilitadas: { ...p.habilitadas, [id]: !p.habilitadas[id] } }))
  }

  return (
    <div className="space-y-6">
      {/* Año de nacimiento */}
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted)' }}>
          ¿En qué año nacerá o nació el hijo/a?
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={anioActual}
            max={anioActual + 20}
            value={s.anioNacimiento}
            onChange={e => setS(p => ({ ...p, anioNacimiento: parseInt(e.target.value) || anioActual + 1 }))}
            className="w-28 px-3 py-2 rounded-lg text-sm outline-none font-mono"
            style={inputStyle}
          />
          <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
            → tendrás <strong style={{ color: 'var(--color-acento)' }}>{edadPadre} años</strong>
          </span>
        </div>
      </div>

      {/* Gasto de parto */}
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted)' }}>
          Gastos de parto (S/) — retiro único en {s.anioNacimiento}
        </label>
        <input
          type="number"
          min={0}
          value={s.gastosParto}
          onChange={e => setS(p => ({ ...p, gastosParto: parseFloat(e.target.value) || 0 }))}
          className={inputCls}
          style={inputStyle}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
          Incluye clínica, parto, preparación, layette inicial.
        </p>
      </div>

      {/* Etapas */}
      <div>
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-muted)' }}>
          GASTOS MENSUALES POR ETAPA
        </p>
        <div className="space-y-3">
          {ETAPAS.map(etapa => {
            const habilitada = !etapa.opcional || s.habilitadas[etapa.id]
            const anioInicioT = anioTNac + etapa.edadDesde
            const dur = etapa.id === 'postuni'
              ? s.duracionPostUni
              : etapa.edadHasta - etapa.edadDesde + 1
            const anioFinT = anioInicioT + dur
            const añoInicio = anioTToCalendario(anioInicioT, anioActual)
            const añoFin = anioTToCalendario(anioFinT, anioActual)
            const edadHastaReal = etapa.id === 'postuni'
              ? etapa.edadDesde + s.duracionPostUni - 1
              : etapa.edadHasta
            const costo = s.costos[etapa.id] ?? 0
            const costoEtapa = costo * 12 * dur

            return (
              <div
                key={etapa.id}
                className="rounded-xl p-4"
                style={{
                  background: 'var(--color-fondo)',
                  border: `1px solid ${habilitada ? 'var(--color-borde)' : 'transparent'}`,
                  opacity: habilitada ? 1 : 0.5,
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{etapa.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>
                        {etapa.label}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: 'var(--color-card)', color: 'var(--color-muted)' }}>
                        {etapa.edadDesde}–{edadHastaReal} años
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                        {añoInicio}–{añoFin}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--color-muted)' }}>
                      {etapa.descripcion}
                    </p>

                    {habilitada && (
                      <div className="flex items-end gap-3 flex-wrap">
                        <div className="flex-1 min-w-[120px] max-w-[200px]">
                          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>S/ / mes</label>
                          <input
                            type="number"
                            min={0}
                            value={costo}
                            onChange={e => setEtapaCosto(etapa.id, parseFloat(e.target.value) || 0)}
                            className={inputCls}
                            style={inputStyle}
                          />
                        </div>
                        {etapa.id === 'postuni' && (
                          <div className="w-24">
                            <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Años</label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={s.duracionPostUni}
                              onChange={e => setS(p => ({ ...p, duracionPostUni: parseInt(e.target.value) || 1 }))}
                              className={inputCls}
                              style={inputStyle}
                            />
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Total etapa</p>
                          <p className="text-sm font-semibold font-mono" style={{ color: 'var(--color-texto)' }}>
                            S/ {FM(costoEtapa)}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                            {dur} {dur === 1 ? 'año' : 'años'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {etapa.opcional && (
                    <button
                      onClick={() => toggleHabilitada(etapa.id)}
                      className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{
                        background: habilitada ? 'var(--color-acento)' : 'var(--color-card)',
                        color: habilitada ? '#fff' : 'var(--color-muted)',
                        border: '1px solid var(--color-borde)',
                      }}
                    >
                      {habilitada ? 'Activo' : 'Agregar'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--color-acento)' }}>Resumen del costo del hijo/a</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Parto (único)</p>
            <p className="text-sm font-semibold font-mono" style={{ color: 'var(--color-texto)' }}>S/ {FM(s.gastosParto)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Costo total proyectado</p>
            <p className="text-lg font-bold font-mono" style={{ color: 'var(--color-acento)' }}>S/ {FM(costoTotal)}</p>
          </div>
        </div>
        <div className="pt-2" style={{ borderTop: '1px solid var(--color-borde)' }}>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Se crearán <strong style={{ color: 'var(--color-texto)' }}>{preview.length}</strong> entradas en el escenario.
          </p>
          <div className="mt-2 space-y-1">
            {preview.map((ev, i) => {
              const r = ev.retiroUnico
              const g = ev.gastoRecurrente
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs">•</span>
                  <p className="text-xs" style={{ color: 'var(--color-texto)' }}>
                    <span className="font-medium">{ev.nombre}</span>
                    {r && <span style={{ color: 'var(--color-muted)' }}> — S/ {FM(r.monto)} en {anioTToCalendario(r.anioT, anioActual)}</span>}
                    {g && (
                      <span style={{ color: 'var(--color-muted)' }}>
                        {' '}— S/ {FM(g.montoMensual)}/mes · {anioTToCalendario(g.anioInicioT, anioActual)}–{anioTToCalendario(g.anioFinT, anioActual)}
                      </span>
                    )}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(preview)}
          disabled={preview.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: 'var(--color-acento)' }}
        >
          <Check size={14} /> Agregar al escenario
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
          style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}
        >
          <X size={14} /> Cancelar
        </button>
      </div>
    </div>
  )
}
