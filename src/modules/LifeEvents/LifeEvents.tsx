import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X, ChevronRight, ArrowLeft, Calculator, RefreshCw, Copy } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useScenario } from '../../data/ScenarioContext'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import { LoanSimulator } from './LoanSimulator'
import { PosgradoWizard } from './PosgradoWizard'
import { HijoWizard } from './HijoWizard'
import { MatrimonioWizard } from './MatrimonioWizard'
import type { EventoVida, GeneralParams } from '../../data/types'

// ── Fórmula de amortización francesa ─────────────────────────────────────────
// Convierte TEA → TEM, luego calcula cuota fija mensual

function temDesdeTea(teaPct: number): number {
  return Math.pow(1 + teaPct / 100, 1 / 12) - 1
}

function calcCuota(principal: number, teaPct: number, meses: number): number {
  if (principal <= 0 || meses <= 0) return 0
  const i = temDesdeTea(teaPct)
  if (i === 0) return principal / meses
  return (principal * i * Math.pow(1 + i, meses)) / (Math.pow(1 + i, meses) - 1)
}

// ── Helpers año ───────────────────────────────────────────────────────────────

function anioTToCalendario(t: number, anioActual: number) {
  return anioActual + t
}

function calendarioToAnioT(year: number, anioActual: number) {
  return Math.max(1, year - anioActual)
}

function anioTToEdad(t: number, edadActual: number) {
  return edadActual + t
}

// ── Tipos de evento ───────────────────────────────────────────────────────────

type TipoId = 'vivienda' | 'auto' | 'hijo' | 'matrimonio' | 'posgrado' | 'viaje' | 'custom'

interface TipoEventoConfig {
  id: TipoId
  label: string
  icono: string
  descripcion: string
  usaCalculadoraPrestamo?: boolean
  usaWizardPosgrado?: boolean
  usaWizardHijo?: boolean
  usaWizardMatrimonio?: boolean
  campos?: string[]
  generar?: (params: {
    anioT: number
    anioCalendario: number
    montos: Record<string, number>
    duracion?: number
  }) => Omit<EventoVida, 'id'>[]
}

const TIPOS_EVENTO: TipoEventoConfig[] = [
  {
    id: 'vivienda',
    label: 'Compra de vivienda',
    icono: '🏠',
    descripcion: 'Calcula hipoteca con TEA y plazo',
    usaCalculadoraPrestamo: true,
  },
  {
    id: 'auto',
    label: 'Compra de auto',
    icono: '🚗',
    descripcion: 'Calcula financiamiento con TEA y plazo',
    usaCalculadoraPrestamo: true,
  },
  {
    id: 'hijo',
    label: 'Nacimiento de hijo',
    icono: '👶',
    descripcion: 'Parto + etapas de crianza, nido, colegio y universidad',
    usaWizardHijo: true,
  },
  {
    id: 'matrimonio',
    label: 'Matrimonio',
    icono: '💍',
    descripcion: 'Wizard de presupuesto con adelantos y pago final',
    usaWizardMatrimonio: true,
  },
  {
    id: 'posgrado',
    label: 'Educación / Posgrado',
    icono: '🎓',
    descripcion: 'Local o en el extranjero, con beca o sin ella',
    usaWizardPosgrado: true,
  },
  {
    id: 'viaje',
    label: 'Viaje o experiencia',
    icono: '✈️',
    descripcion: 'Gasto único planeado',
    campos: ['presupuesto'],
    generar: ({ anioT, montos }) => [
      {
        nombre: 'Viaje',
        tipoEvento: 'viaje',
        retiroUnico: { anioT, monto: montos.presupuesto ?? 5000 },
      },
    ],
  },
  {
    id: 'custom',
    label: 'Evento personalizado',
    icono: '✏️',
    descripcion: 'Define tu propio gasto o retiro',
    campos: [],
    generar: () => [{ nombre: '', tipoEvento: 'custom' }],
  },
]

const CAMPOS_LABELS: Record<string, string> = {
  gastosParto: 'Gastos de parto (S/)',
  crianzaMensual: 'Crianza mensual (S/)',
  aniosHastaColegio: 'Años hasta independencia',
  costoCelebracion: 'Costo celebración (S/)',
  costoTotal: 'Costo total del programa (S/)',
  duracion: 'Duración (años)',
  presupuesto: 'Presupuesto (S/)',
}

const CAMPOS_ES_DURACION = new Set(['aniosHastaColegio', 'duracion'])

const CAMPOS_DEFAULTS: Record<string, number> = {
  gastosParto: 5000,
  crianzaMensual: 800,
  aniosHastaColegio: 18,
  costoCelebracion: 15000,
  costoTotal: 20000,
  duracion: 2,
  presupuesto: 5000,
}

// ── Calculadora de préstamo (auto / vivienda) ─────────────────────────────────

interface LoanState {
  moneda: 'PEN' | 'USD'
  valorTotal: number
  inicialEsPct: boolean
  inicialPct: number
  inicialMonto: number
  teaPct: number
  plazoMeses: number
}

const LOAN_DEFAULTS: Record<TipoId, Partial<LoanState>> = {
  auto: { valorTotal: 50000, inicialPct: 20, teaPct: 18, plazoMeses: 60 },
  vivienda: { valorTotal: 300000, inicialPct: 20, teaPct: 9, plazoMeses: 240 },
  hijo: {}, matrimonio: {}, posgrado: {}, viaje: {}, custom: {},
}

const LOAN_LABELS: Record<TipoId, { valor: string; inicial: string; entradas: string }> = {
  auto: { valor: 'Valor del auto', inicial: 'Cuota inicial', entradas: 'Auto' },
  vivienda: { valor: 'Valor de la propiedad', inicial: 'Cuota inicial / pie', entradas: 'Vivienda' },
  hijo: { valor: '', inicial: '', entradas: '' },
  matrimonio: { valor: '', inicial: '', entradas: '' },
  posgrado: { valor: '', inicial: '', entradas: '' },
  viaje: { valor: '', inicial: '', entradas: '' },
  custom: { valor: '', inicial: '', entradas: '' },
}

function useLoanCalc(s: LoanState, tcVenta: number, anioT: number) {
  return useMemo(() => {
    const tcUsado = s.moneda === 'USD' ? tcVenta : 1
    const valorPEN = s.valorTotal * tcUsado

    const inicialPEN = s.inicialEsPct
      ? valorPEN * (s.inicialPct / 100)
      : s.inicialMonto * tcUsado

    const principal = Math.max(0, valorPEN - inicialPEN)
    const cuotaMensual = calcCuota(principal, s.teaPct, s.plazoMeses)
    const totalPagar = cuotaMensual * s.plazoMeses
    const totalIntereses = totalPagar - principal
    const plazoAnios = Math.ceil(s.plazoMeses / 12)
    const anioFinT = anioT + plazoAnios

    return { valorPEN, inicialPEN, principal, cuotaMensual, totalPagar, totalIntereses, plazoAnios, anioFinT }
  }, [s, tcVenta, anioT])
}

export function LoanCalculator({
  tipoId,
  anioT,
  anioCalendario,
  general,
  onConfirm,
  onCancel,
}: {
  tipoId: TipoId
  anioT: number
  anioCalendario: number
  general: GeneralParams
  onConfirm: (eventos: Omit<EventoVida, 'id'>[]) => void
  onCancel: () => void
}) {
  const labels = LOAN_LABELS[tipoId]
  const defaults = LOAN_DEFAULTS[tipoId]
  const { tc: tcData, loading: tcLoading, error: tcError, actualizar } = useTipoCambio()

  // Cargar TC al montar si no hay caché
  useEffect(() => {
    if (!tcData) actualizar()
  }, [])

  const tcVenta = tcData?.venta ?? 3.80

  const [s, setS] = useState<LoanState>({
    moneda: 'PEN',
    valorTotal: defaults.valorTotal ?? 50000,
    inicialEsPct: true,
    inicialPct: defaults.inicialPct ?? 20,
    inicialMonto: (defaults.valorTotal ?? 50000) * ((defaults.inicialPct ?? 20) / 100),
    teaPct: defaults.teaPct ?? 18,
    plazoMeses: defaults.plazoMeses ?? 60,
  })

  const { inicialPEN, principal, cuotaMensual, totalPagar, totalIntereses, plazoAnios, anioFinT } =
    useLoanCalc(s, tcVenta, anioT)

  const edadInicio = anioTToEdad(anioT, general.edadActual)
  const edadFin = anioTToEdad(anioFinT, general.edadActual)
  const añoFin = anioTToCalendario(anioFinT, general.anioActual)

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none font-mono'
  const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

  const fmt = (n: number) => n.toLocaleString('es-PE', { maximumFractionDigits: 0 })
  const fmtDec = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  function confirm() {
    const nombre = labels.entradas
    const eventos: Omit<EventoVida, 'id'>[] = []
    if (inicialPEN > 0) {
      eventos.push({
        nombre: `${nombre} – Cuota inicial`,
        tipoEvento: tipoId,
        retiroUnico: { anioT, monto: Math.round(inicialPEN) },
      })
    }
    if (cuotaMensual > 0) {
      eventos.push({
        nombre: `${nombre} – Cuota mensual`,
        tipoEvento: tipoId,
        gastoRecurrente: {
          anioInicioT: anioT,
          anioFinT,
          montoMensual: Math.round(cuotaMensual),
        },
      })
    }
    onConfirm(eventos)
  }

  return (
    <div className="space-y-5">
      {/* Valor y moneda */}
      <div>
        <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>{labels.valor}</label>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: '1px solid var(--color-borde)' }}>
            {(['PEN', 'USD'] as const).map(m => (
              <button
                key={m}
                onClick={() => setS(p => ({ ...p, moneda: m }))}
                className="px-3 py-2 text-xs font-semibold"
                style={{
                  background: s.moneda === m ? 'var(--color-acento)' : 'var(--color-fondo)',
                  color: s.moneda === m ? '#fff' : 'var(--color-muted)',
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            type="number" min={0}
            value={s.valorTotal}
            onChange={e => setS(p => ({ ...p, valorTotal: parseFloat(e.target.value) || 0 }))}
            className={inputCls} style={inputStyle}
            placeholder="0"
          />
        </div>

        {/* Badge TC Rextie — solo visible si moneda = USD */}
        {s.moneda === 'USD' && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
              TC Rextie (venta):{' '}
              {tcLoading
                ? <span style={{ color: 'var(--color-muted)' }}>cargando…</span>
                : tcError
                  ? <span style={{ color: '#ef4444' }}>sin conexión — usando S/ {tcVenta.toFixed(3)}</span>
                  : <strong style={{ color: 'var(--color-acento)' }}>S/ {tcVenta.toFixed(3)}</strong>
              }
            </span>
            <button
              onClick={() => actualizar(true)}
              className="p-0.5 hover:opacity-70"
              style={{ color: 'var(--color-muted)' }}
              title="Actualizar TC"
            >
              <RefreshCw size={11} className={tcLoading ? 'animate-spin' : ''} />
            </button>
            {s.valorTotal > 0 && (
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                = S/ {fmt(s.valorTotal * tcVenta)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cuota inicial */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{labels.inicial}</label>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-borde)' }}>
            {[{ v: true, l: '%' }, { v: false, l: 'S/' }].map(({ v, l }) => (
              <button
                key={l}
                onClick={() => setS(p => ({ ...p, inicialEsPct: v }))}
                className="px-2.5 py-1 text-xs font-semibold"
                style={{
                  background: s.inicialEsPct === v ? 'var(--color-acento)' : 'var(--color-fondo)',
                  color: s.inicialEsPct === v ? '#fff' : 'var(--color-muted)',
                }}
              >{l}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} max={s.inicialEsPct ? 100 : undefined}
            value={s.inicialEsPct ? s.inicialPct : s.inicialMonto}
            onChange={e => {
              const v = parseFloat(e.target.value) || 0
              setS(p => s.inicialEsPct ? { ...p, inicialPct: v } : { ...p, inicialMonto: v })
            }}
            className={inputCls} style={inputStyle}
          />
          <span className="text-sm shrink-0" style={{ color: 'var(--color-muted)' }}>
            = S/ {fmt(inicialPEN)}
          </span>
        </div>
      </div>

      {/* TEA y plazo */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>TEA del banco (%)</label>
          <input type="number" min={0} step={0.1} value={s.teaPct}
            onChange={e => setS(p => ({ ...p, teaPct: parseFloat(e.target.value) || 0 }))}
            className={inputCls} style={inputStyle} />
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            TEM: {(temDesdeTea(s.teaPct) * 100).toFixed(3)}%
          </p>
        </div>
        <div>
          <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>Plazo (meses)</label>
          <input type="number" min={1} max={480} value={s.plazoMeses}
            onChange={e => setS(p => ({ ...p, plazoMeses: parseInt(e.target.value) || 1 }))}
            className={inputCls} style={inputStyle} />
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {plazoAnios} {plazoAnios === 1 ? 'año' : 'años'}
          </p>
        </div>
      </div>

      {/* Resultado */}
      {cuotaMensual > 0 && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Calculator size={14} style={{ color: 'var(--color-acento)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--color-acento)' }}>Resultado del financiamiento</span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Monto a financiar</p>
              <p className="font-semibold font-mono" style={{ color: 'var(--color-texto)' }}>S/ {fmt(principal)}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Cuota mensual</p>
              <p className="text-xl font-bold font-mono" style={{ color: 'var(--color-acento)' }}>S/ {fmtDec(cuotaMensual)}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Total a pagar</p>
              <p className="font-semibold font-mono" style={{ color: 'var(--color-texto)' }}>S/ {fmt(totalPagar)}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Total intereses</p>
              <p className="font-semibold font-mono" style={{ color: '#ef4444' }}>S/ {fmt(totalIntereses)}</p>
            </div>
          </div>

          <div className="pt-2" style={{ borderTop: '1px solid var(--color-borde)' }}>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Periodo: <strong style={{ color: 'var(--color-texto)' }}>{anioCalendario}</strong> ({edadInicio} años) →{' '}
              <strong style={{ color: 'var(--color-texto)' }}>{añoFin}</strong> ({edadFin} años)
            </p>
            {s.moneda === 'USD' && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                TC usado: S/ {tcVenta.toFixed(3)} (Rextie venta — registrado al momento de crear el evento)
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
              Se agregarán {inicialPEN > 0 ? '2 entradas' : '1 entrada'}:{' '}
              {inicialPEN > 0 && `cuota inicial S/ ${fmt(inicialPEN)} + `}cuota mensual S/ {fmtDec(cuotaMensual)} por {s.plazoMeses} meses
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={confirm}
          disabled={cuotaMensual <= 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: 'var(--color-acento)' }}
        >
          <Check size={14} /> Agregar al escenario
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
          <X size={14} /> Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function LifeEvents() {
  const { escenarios, escenarioActivo, actualizarEscenario } = useScenario()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EventoVida | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)

  if (!escenarioActivo) return <Empty />

  const { eventosVida, general } = escenarioActivo
  const otrosEscenarios = escenarios.filter(e => e.id !== escenarioActivo.id)

  async function save(lista: EventoVida[]) {
    await actualizarEscenario({ ...escenarioActivo!, eventosVida: lista })
  }

  async function saveEdit() {
    if (!draft) return
    await save(eventosVida.map(e => e.id === draft.id ? draft : e))
    setEditingId(null); setDraft(null)
  }

  async function del(id: string) {
    await save(eventosVida.filter(e => e.id !== id))
  }

  async function addEventos(nuevos: Omit<EventoVida, 'id'>[]) {
    const conIds = nuevos.map(e => ({ ...e, id: uuid() }))
    await save([...eventosVida, ...conIds])
    setWizardOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Eventos de vida</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Gastos puntuales o recurrentes asociados a hitos importantes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {eventosVida.length > 0 && otrosEscenarios.length > 0 && (
            <button
              onClick={() => { setCopyOpen(true); setWizardOpen(false) }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ border: '1px solid var(--color-borde)', color: 'var(--color-muted)' }}
            >
              <Copy size={14} /> Copiar a…
            </button>
          )}
          <button
            onClick={() => { setWizardOpen(true); setCopyOpen(false) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--color-acento)' }}
          >
            <Plus size={16} /> Agregar evento
          </button>
        </div>
      </div>

      {eventosVida.length === 0 && !wizardOpen && (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <p className="text-3xl mb-3">🗓️</p>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-texto)' }}>Sin eventos de vida definidos</p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Los eventos afectan el aporte neto de tu simulación en los años indicados.
          </p>
        </div>
      )}

      {copyOpen && (
        <CopyPanel
          eventos={eventosVida}
          destinos={otrosEscenarios}
          onCopy={async (eventoIds, destinoIds) => {
            const seleccionados = eventosVida.filter(e => eventoIds.includes(e.id))
            await Promise.all(
              destinoIds.map(async destId => {
                const destino = escenarios.find(e => e.id === destId)
                if (!destino) return
                const idsExistentes = new Set(destino.eventosVida.map(e => e.id))
                const nuevos = seleccionados.filter(e => !idsExistentes.has(e.id))
                if (nuevos.length === 0) return
                await actualizarEscenario({ ...destino, eventosVida: [...destino.eventosVida, ...nuevos] })
              })
            )
            setCopyOpen(false)
          }}
          onCancel={() => setCopyOpen(false)}
        />
      )}

      {wizardOpen && (
        <EventoWizard
          general={general}
          onConfirm={addEventos}
          onCancel={() => setWizardOpen(false)}
        />
      )}

      <div className="space-y-3">
        {eventosVida.map(ev => {
          const tipo = TIPOS_EVENTO.find(t => t.id === ev.tipoEvento)
          return (
            <div key={ev.id} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
              {editingId === ev.id && draft ? (
                <EventoEditForm
                  value={draft}
                  onChange={setDraft}
                  onSave={saveEdit}
                  onCancel={() => { setEditingId(null); setDraft(null) }}
                  general={general}
                />
              ) : (
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{tipo?.icono ?? '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-texto)' }}>{ev.nombre || '(sin nombre)'}</p>
                    <EventoResumen ev={ev} general={general} />
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditingId(ev.id); setDraft({ ...ev }) }} className="p-1.5 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Edit2 size={14} /></button>
                    <button onClick={() => del(ev.id)} className="p-1.5 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Resumen inline ────────────────────────────────────────────────────────────

function EventoResumen({ ev, general }: { ev: EventoVida; general: GeneralParams }) {
  const { anioActual, edadActual } = general
  const partes: string[] = []

  if (ev.retiroUnico) {
    const año = anioTToCalendario(ev.retiroUnico.anioT, anioActual)
    const edad = anioTToEdad(ev.retiroUnico.anioT, edadActual)
    partes.push(`Retiro único S/${ev.retiroUnico.monto.toLocaleString()} en ${año} (${edad} años)`)
  }
  if (ev.gastoRecurrente) {
    const añoI = anioTToCalendario(ev.gastoRecurrente.anioInicioT, anioActual)
    const añoF = anioTToCalendario(ev.gastoRecurrente.anioFinT, anioActual)
    const edadI = anioTToEdad(ev.gastoRecurrente.anioInicioT, edadActual)
    const edadF = anioTToEdad(ev.gastoRecurrente.anioFinT, edadActual)
    partes.push(`S/${ev.gastoRecurrente.montoMensual.toLocaleString()}/mes · ${añoI}–${añoF} (${edadI}–${edadF} años)`)
  }

  return (
    <div className="mt-0.5 space-y-0.5">
      {partes.length === 0
        ? <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Sin detalle configurado</p>
        : partes.map((p, i) => (
          <p key={i} className="text-xs" style={{ color: 'var(--color-muted)' }}>{p}</p>
        ))
      }
    </div>
  )
}

// ── Wizard ────────────────────────────────────────────────────────────────────

type WizardStep = 'tipo' | 'config'

function EventoWizard({
  general,
  onConfirm,
  onCancel,
}: {
  general: GeneralParams
  onConfirm: (eventos: Omit<EventoVida, 'id'>[]) => void
  onCancel: () => void
}) {
  const [step, setStep] = useState<WizardStep>('tipo')
  const [tipoId, setTipoId] = useState<TipoId | null>(null)
  const [anioCalendario, setAnioCalendario] = useState(general.anioActual + 1)
  const [montos, setMontos] = useState<Record<string, number>>({})
  const [customDraft, setCustomDraft] = useState<EventoVida>({ id: '', nombre: '' })

  const tipo = TIPOS_EVENTO.find(t => t.id === tipoId)
  const anioT = calendarioToAnioT(anioCalendario, general.anioActual)
  const edad = anioTToEdad(anioT, general.edadActual)

  const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

  function selectTipo(id: TipoId) {
    const t = TIPOS_EVENTO.find(x => x.id === id)!
    setTipoId(id)
    const m: Record<string, number> = {}
    for (const c of (t.campos ?? [])) {
      m[c] = CAMPOS_DEFAULTS[c] ?? 0
    }
    setMontos(m)
    setStep('config')
  }

  function confirmGenerico() {
    if (!tipo || !tipo.generar) return
    const durField = (tipo.campos ?? []).find(c => CAMPOS_ES_DURACION.has(c))
    const dur = durField ? (montos[durField] ?? undefined) : undefined
    onConfirm(tipo.generar({ anioT, anioCalendario, montos, duracion: dur }))
  }

  const camposValor = (tipo?.campos ?? []).filter(c => !CAMPOS_ES_DURACION.has(c))
  const camposDuracion = (tipo?.campos ?? []).filter(c => CAMPOS_ES_DURACION.has(c))

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
      <div className="flex items-center gap-2">
        {step === 'config' && (
          <button onClick={() => setStep('tipo')} className="p-1 hover:opacity-70" style={{ color: 'var(--color-muted)' }}>
            <ArrowLeft size={16} />
          </button>
        )}
        <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>
          {step === 'tipo' ? 'Nuevo evento – ¿Qué tipo?' : `${tipo?.icono} ${tipo?.label}`}
        </p>
      </div>

      {/* Paso 1: selector de tipo */}
      {step === 'tipo' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TIPOS_EVENTO.map(t => (
            <button
              key={t.id}
              onClick={() => selectTipo(t.id as TipoId)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}
            >
              <span className="text-xl">{t.icono}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium leading-tight" style={{ color: 'var(--color-texto)' }}>{t.label}</p>
                <p className="text-xs leading-tight mt-0.5" style={{ color: 'var(--color-muted)' }}>{t.descripcion}</p>
              </div>
              <ChevronRight size={12} className="shrink-0 ml-auto" style={{ color: 'var(--color-muted)' }} />
            </button>
          ))}
        </div>
      )}

      {/* Paso 2: configuración */}
      {step === 'config' && tipo && (
        <>
          {/* Selector de año — solo para tipos sin simulador propio */}
          {tipo.id !== 'custom' && !tipo.usaCalculadoraPrestamo && !tipo.usaWizardPosgrado && !tipo.usaWizardHijo && !tipo.usaWizardMatrimonio && (
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted)' }}>
                ¿En qué año ocurrirá?
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={general.anioActual + 1}
                  max={general.anioActual + (general.edadVidaEstimada - general.edadActual)}
                  value={anioCalendario}
                  onChange={e => setAnioCalendario(parseInt(e.target.value) || general.anioActual + 1)}
                  className="w-28 px-3 py-2 rounded-lg text-sm outline-none font-mono"
                  style={inputStyle}
                />
                <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  → tendrás <strong style={{ color: 'var(--color-acento)' }}>{edad} años</strong>
                </span>
              </div>
            </div>
          )}

          {/* Wizard de matrimonio */}
          {tipo.usaWizardMatrimonio && (
            <MatrimonioWizard
              general={general}
              onConfirm={onConfirm}
              onCancel={onCancel}
            />
          )}

          {/* Wizard de hijo */}
          {tipo.usaWizardHijo && (
            <HijoWizard
              general={general}
              onConfirm={onConfirm}
              onCancel={onCancel}
            />
          )}

          {/* Wizard de posgrado */}
          {tipo.usaWizardPosgrado && (
            <PosgradoWizard
              general={general}
              onConfirm={onConfirm}
              onCancel={onCancel}
            />
          )}

          {/* Simulador de préstamo */}
          {tipo.usaCalculadoraPrestamo && (
            <LoanSimulator
              tipoId={tipoId!}
              tipoLabel={tipo.label}
              anioT={anioT}
              anioCalendario={anioCalendario}
              general={general}
              onConfirm={onConfirm}
              onCancel={onCancel}
            />
          )}

          {/* Campos genéricos */}
          {!tipo.usaCalculadoraPrestamo && !tipo.usaWizardPosgrado && !tipo.usaWizardHijo && !tipo.usaWizardMatrimonio && tipo.id !== 'custom' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {camposValor.map(campo => (
                  <div key={campo}>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>{CAMPOS_LABELS[campo] ?? campo}</label>
                    <input type="number" min={0} value={montos[campo] ?? 0}
                      onChange={e => setMontos({ ...montos, [campo]: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
                  </div>
                ))}
                {camposDuracion.map(campo => (
                  <div key={campo}>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>{CAMPOS_LABELS[campo] ?? campo}</label>
                    <input type="number" min={1} max={50} value={montos[campo] ?? CAMPOS_DEFAULTS[campo] ?? 1}
                      onChange={e => setMontos({ ...montos, [campo]: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
                  </div>
                ))}
              </div>
              <PreviewEventos tipo={tipo} anioT={anioT} anioCalendario={anioCalendario} montos={montos} general={general} />
              <div className="flex gap-2">
                <button onClick={confirmGenerico} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--color-acento)' }}>
                  <Check size={14} /> Agregar al escenario
                </button>
                <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
                  <X size={14} /> Cancelar
                </button>
              </div>
            </>
          )}

          {/* Custom */}
          {tipo.id === 'custom' && (
            <EventoEditForm
              value={customDraft}
              onChange={setCustomDraft}
              onSave={() => onConfirm([customDraft])}
              onCancel={onCancel}
              general={general}
              hideSaveCancel={false}
              saveLabel="Agregar al escenario"
            />
          )}
        </>
      )}

      {step === 'tipo' && (
        <div className="flex justify-end">
          <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
            <X size={14} /> Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

// ── Preview genérico ──────────────────────────────────────────────────────────

function PreviewEventos({
  tipo,
  anioT,
  anioCalendario,
  montos,
  general,
}: {
  tipo: TipoEventoConfig
  anioT: number
  anioCalendario: number
  montos: Record<string, number>
  general: GeneralParams
}) {
  if (!tipo.generar) return null
  const durField = (tipo.campos ?? []).find(c => CAMPOS_ES_DURACION.has(c))
  const duracion = durField ? (montos[durField] ?? undefined) : undefined
  const preview = tipo.generar({ anioT, anioCalendario, montos, duracion })
  if (preview.length === 0) return null

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        Se crearán {preview.length} {preview.length === 1 ? 'entrada' : 'entradas'}:
      </p>
      {preview.map((ev, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-base">{tipo.icono}</span>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--color-texto)' }}>{ev.nombre}</p>
            <EventoResumen ev={{ ...ev, id: '' }} general={general} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Formulario de edición individual ─────────────────────────────────────────

function EventoEditForm({
  value,
  onChange,
  onSave,
  onCancel,
  general,
  hideSaveCancel,
  saveLabel = 'Guardar',
}: {
  value: EventoVida
  onChange: (v: EventoVida) => void
  onSave: () => void
  onCancel: () => void
  general: GeneralParams
  hideSaveCancel?: boolean
  saveLabel?: string
}) {
  useSubmitOnCmdEnter(onSave)
  const { anioActual, edadActual } = general
  const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }
  const tieneRetiro = !!value.retiroUnico
  const tieneRecurrente = !!value.gastoRecurrente

  function edadLabel(t: number) {
    return `${anioTToEdad(t, edadActual)} años`
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Nombre del evento</label>
        <input
          value={value.nombre}
          onChange={e => onChange({ ...value, nombre: e.target.value })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
          placeholder="Ej. Matrimonio, Nacimiento hijo..."
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: 'var(--color-texto)' }}>
          <input type="checkbox" checked={tieneRetiro}
            onChange={e => onChange({ ...value, retiroUnico: e.target.checked ? { anioT: 1, monto: 0 } : undefined })} />
          Retiro único (egreso puntual)
        </label>
        {tieneRetiro && value.retiroUnico && (
          <div className="grid grid-cols-2 gap-3 pl-6">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Año</label>
              <input type="number" min={anioActual + 1}
                value={anioTToCalendario(value.retiroUnico.anioT, anioActual)}
                onChange={e => onChange({ ...value, retiroUnico: { ...value.retiroUnico!, anioT: calendarioToAnioT(parseInt(e.target.value) || anioActual + 1, anioActual) } })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-acento)' }}>{edadLabel(value.retiroUnico.anioT)}</p>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Monto (S/)</label>
              <input type="number" min={0} value={value.retiroUnico.monto}
                onChange={e => onChange({ ...value, retiroUnico: { ...value.retiroUnico!, monto: parseFloat(e.target.value) || 0 } })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: 'var(--color-texto)' }}>
          <input type="checkbox" checked={tieneRecurrente}
            onChange={e => onChange({ ...value, gastoRecurrente: e.target.checked ? { anioInicioT: 1, anioFinT: 5, montoMensual: 0 } : undefined })} />
          Gasto recurrente mensual
        </label>
        {tieneRecurrente && value.gastoRecurrente && (
          <div className="grid grid-cols-3 gap-3 pl-6">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Desde (año)</label>
              <input type="number" min={anioActual + 1}
                value={anioTToCalendario(value.gastoRecurrente.anioInicioT, anioActual)}
                onChange={e => onChange({ ...value, gastoRecurrente: { ...value.gastoRecurrente!, anioInicioT: calendarioToAnioT(parseInt(e.target.value) || anioActual + 1, anioActual) } })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-acento)' }}>{edadLabel(value.gastoRecurrente.anioInicioT)}</p>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Hasta (año)</label>
              <input type="number" min={anioActual + 1}
                value={anioTToCalendario(value.gastoRecurrente.anioFinT, anioActual)}
                onChange={e => onChange({ ...value, gastoRecurrente: { ...value.gastoRecurrente!, anioFinT: calendarioToAnioT(parseInt(e.target.value) || anioActual + 1, anioActual) } })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-acento)' }}>{edadLabel(value.gastoRecurrente.anioFinT)}</p>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>S/ / mes</label>
              <input type="number" min={0} value={value.gastoRecurrente.montoMensual}
                onChange={e => onChange({ ...value, gastoRecurrente: { ...value.gastoRecurrente!, montoMensual: parseFloat(e.target.value) || 0 } })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} />
            </div>
          </div>
        )}
      </div>

      {!hideSaveCancel && (
        <div className="flex gap-2">
          <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: 'var(--color-acento)' }}>
            <Check size={14} /> {saveLabel}
          </button>
          <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
            <X size={14} /> Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

// ── Panel de copia entre escenarios ──────────────────────────────────────────

function CopyPanel({
  eventos,
  destinos,
  onCopy,
  onCancel,
}: {
  eventos: EventoVida[]
  destinos: { id: string; nombre: string }[]
  onCopy: (eventoIds: string[], destinoIds: string[]) => Promise<void>
  onCancel: () => void
}) {
  const [selectedEventos, setSelectedEventos] = useState<Set<string>>(new Set(eventos.map(e => e.id)))
  const [selectedDestinos, setSelectedDestinos] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  function toggleEvento(id: string) {
    setSelectedEventos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleDestino(id: string) {
    setSelectedDestinos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCopy() {
    setSaving(true)
    await onCopy([...selectedEventos], [...selectedDestinos])
    setSaving(false)
  }

  const canCopy = selectedEventos.size > 0 && selectedDestinos.size > 0

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-borde)' }}>
      <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>
        Copiar eventos a otros escenarios
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Eventos a copiar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>¿Qué eventos copiar?</p>
            <button
              className="text-xs" style={{ color: 'var(--color-acento)' }}
              onClick={() => setSelectedEventos(
                selectedEventos.size === eventos.length ? new Set() : new Set(eventos.map(e => e.id))
              )}>
              {selectedEventos.size === eventos.length ? 'Ninguno' : 'Todos'}
            </button>
          </div>
          <div className="space-y-1.5">
            {eventos.map(ev => {
              const tipo = TIPOS_EVENTO.find(t => t.id === ev.tipoEvento)
              return (
                <label key={ev.id} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedEventos.has(ev.id)}
                    onChange={() => toggleEvento(ev.id)}
                  />
                  <span className="text-sm">{tipo?.icono ?? '📌'}</span>
                  <span className="text-xs truncate" style={{ color: 'var(--color-texto)' }}>
                    {ev.nombre || '(sin nombre)'}
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Escenarios destino */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>¿A qué escenarios?</p>
            <button
              className="text-xs" style={{ color: 'var(--color-acento)' }}
              onClick={() => setSelectedDestinos(
                selectedDestinos.size === destinos.length ? new Set() : new Set(destinos.map(d => d.id))
              )}>
              {selectedDestinos.size === destinos.length ? 'Ninguno' : 'Todos'}
            </button>
          </div>
          <div className="space-y-1.5">
            {destinos.map(d => (
              <label key={d.id} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedDestinos.has(d.id)}
                  onChange={() => toggleDestino(d.id)}
                />
                <span className="text-xs" style={{ color: 'var(--color-texto)' }}>{d.nombre}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        Los eventos que ya existan en el escenario destino (mismo ID) se omiten automáticamente.
      </p>

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          disabled={!canCopy || saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: 'var(--color-acento)' }}>
          <Copy size={14} /> {saving ? 'Copiando…' : `Copiar ${selectedEventos.size} evento${selectedEventos.size !== 1 ? 's' : ''} a ${selectedDestinos.size} escenario${selectedDestinos.size !== 1 ? 's' : ''}`}
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
          <X size={14} /> Cancelar
        </button>
      </div>
    </div>
  )
}

function Empty() {
  return (
    <div className="text-center py-20" style={{ color: 'var(--color-muted)' }}>
      <p>No hay escenario activo.</p>
    </div>
  )
}
