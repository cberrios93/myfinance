import { useState, useMemo } from 'react'
import { Check, X, ArrowLeft, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import type { EventoVida, GeneralParams } from '../../data/types'

type Destino    = 'local' | 'extranjero'
type Estrategia = 'cuotas' | 'prestamo' | 'unico'
type PStep      = 'programa' | 'financiamiento' | 'gastos' | 'preview'

interface PS {
  // Programa
  destino:            Destino
  moneda:             'PEN' | 'USD'
  costoTotal:         number
  duracionMeses:      number
  anioCalendario:     number
  // Beca
  tieneBeca:          boolean
  pctBeca:            number
  // Ingreso TA/RA
  tieneIngresoTA:     boolean
  ingresoTAMensual:   number
  monedaTA:           'PEN' | 'USD'
  // Financiamiento
  estrategia:         Estrategia
  teaPct:             number
  plazoMeses:         number
  inicialPct:         number
  // Gastos mensuales
  extrasLocales:      number
  alojamientoMensual: number
  vidaMensual:        number
  nVuelos:            number
  costoVuelo:         number
  seguroVisaAnual:    number
  // Costos únicos opcionales
  tieneInscripcion:   boolean
  costoInscripcion:   number
  tieneAdmision:      boolean
  costoAdmision:      number
  tieneTesis:         boolean
  costoTesis:         number
  tieneMudanza:       boolean
  costoMudanza:       number
  // Idioma
  tieneIdioma:        boolean
  costoIdiomaMensual: number
  mesesIdioma:        number
}

const FM = (n: number) => Math.round(n).toLocaleString('es-PE')

function calcTEM(tea: number) { return (1 + tea / 100) ** (1 / 12) - 1 }
function calcCuotaPrestamo(principal: number, tea: number, meses: number) {
  if (principal <= 0 || meses <= 0) return 0
  const i = calcTEM(tea)
  if (i === 0) return principal / meses
  return (principal * i * (1 + i) ** meses) / ((1 + i) ** meses - 1)
}

export function PosgradoWizard({
  general,
  onConfirm,
  onCancel,
}: {
  general: GeneralParams
  onConfirm: (eventos: Omit<EventoVida, 'id'>[]) => void
  onCancel: () => void
}) {
  const { tc, loading: tcLoading, actualizar } = useTipoCambio()
  const tcVenta = tc?.venta ?? 3.80

  const [step, setStep] = useState<PStep>('programa')
  const [extraOpen, setExtraOpen] = useState(false)
  const [s, setS] = useState<PS>({
    destino: 'local', moneda: 'PEN',
    costoTotal: 20000, duracionMeses: 24,
    anioCalendario: general.anioActual + 1,
    tieneBeca: false, pctBeca: 50,
    tieneIngresoTA: false, ingresoTAMensual: 500, monedaTA: 'USD',
    estrategia: 'cuotas', teaPct: 12, plazoMeses: 36, inicialPct: 0,
    extrasLocales: 300,
    alojamientoMensual: 800, vidaMensual: 600,
    nVuelos: 2, costoVuelo: 600, seguroVisaAnual: 1200,
    tieneInscripcion: false, costoInscripcion: 1000,
    tieneAdmision: false, costoAdmision: 1500,
    tieneTesis: false, costoTesis: 2000,
    tieneMudanza: false, costoMudanza: 3000,
    tieneIdioma: false, costoIdiomaMensual: 300, mesesIdioma: 6,
  })

  const set = (patch: Partial<PS>) => setS(p => ({ ...p, ...patch }))

  const conv     = s.moneda === 'USD' ? tcVenta : 1
  const anioT    = Math.max(1, s.anioCalendario - general.anioActual)
  const anioFinT = anioT + Math.ceil(s.duracionMeses / 12)
  const edad     = general.edadActual + anioT
  const edadFin  = general.edadActual + anioFinT
  const anioFin  = s.anioCalendario + Math.ceil(s.duracionMeses / 12)

  const costoTotalPEN = s.costoTotal * conv
  const costoNetoPEN  = s.tieneBeca ? costoTotalPEN * (1 - s.pctBeca / 100) : costoTotalPEN
  const ingresoTAPEN  = s.tieneIngresoTA ? s.ingresoTAMensual * (s.monedaTA === 'USD' ? tcVenta : 1) : 0

  const fin = useMemo(() => {
    if (s.estrategia === 'cuotas') {
      const mensual = Math.max(0, costoNetoPEN / s.duracionMeses - ingresoTAPEN)
      return { mensual: Math.round(mensual), inicialPEN: 0, plazoAnios: Math.ceil(s.duracionMeses / 12), anioFinPagoT: anioFinT, principal: 0, totalIntereses: 0 }
    }
    if (s.estrategia === 'unico') {
      return { mensual: 0, inicialPEN: costoNetoPEN, plazoAnios: 0, anioFinPagoT: anioT, principal: 0, totalIntereses: 0 }
    }
    const inicialPEN     = costoNetoPEN * (s.inicialPct / 100)
    const principal      = Math.max(0, costoNetoPEN - inicialPEN)
    const mensualBruto   = Math.round(calcCuotaPrestamo(principal, s.teaPct, s.plazoMeses))
    const mensual        = Math.max(0, mensualBruto - ingresoTAPEN)
    const plazoAnios     = Math.ceil(s.plazoMeses / 12)
    const anioFinPagoT   = anioT + plazoAnios
    const totalIntereses = mensualBruto * s.plazoMeses - principal
    return { mensual: Math.round(mensual), inicialPEN, plazoAnios, anioFinPagoT, principal, totalIntereses }
  }, [s.estrategia, costoNetoPEN, s.duracionMeses, s.inicialPct, s.teaPct, s.plazoMeses, anioT, anioFinT, ingresoTAPEN])

  // Gastos mensuales adicionales
  const alojamientoPEN         = s.alojamientoMensual * tcVenta
  const vidaPEN                = s.vidaMensual * tcVenta
  const vuelosMensualizadosPEN = (s.nVuelos * s.costoVuelo * tcVenta) / 12
  const seguroMensualizadoPEN  = (s.seguroVisaAnual * tcVenta) / 12
  const extrasMensualesPEN     = s.destino === 'local'
    ? s.extrasLocales
    : alojamientoPEN + vidaPEN + vuelosMensualizadosPEN + seguroMensualizadoPEN
  const totalMensualPEN = fin.mensual + extrasMensualesPEN

  // Costos únicos
  const inscripcionPEN = s.tieneInscripcion ? s.costoInscripcion : 0
  const admisionPEN    = s.tieneAdmision    ? s.costoAdmision    : 0
  const tesisPEN       = s.tieneTesis       ? s.costoTesis       : 0
  const mudanzaPEN     = s.tieneMudanza && s.destino === 'extranjero' ? s.costoMudanza : 0
  const idiomaAnioT    = Math.max(1, anioT - 1)

  const PASOS = ['📚 El programa', '💳 Financiamiento', s.destino === 'local' ? '🏠 Gastos' : '✈️ Costos exterior', '✓ Resumen']
  const STEP_IDX: Record<PStep, number> = { programa: 0, financiamiento: 1, gastos: 2, preview: 3 }
  const iStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

  // Eventos generados
  const eventosPreview = useMemo(() => {
    const ev: Array<{ icon: string; nombre: string; tipo: 'unico' | 'recurrente'; value: number; anioIni?: number; anioFin_?: number; edadIni?: number; edadFin_?: number; year?: number; edad?: number }> = []
    const suf = s.tieneBeca ? ` (beca ${s.pctBeca}%)` : ''

    // Admisión (al inicio)
    if (admisionPEN > 0)
      ev.push({ icon: '📋', nombre: 'Posgrado – Proceso de admisión', tipo: 'unico', value: admisionPEN, year: s.anioCalendario, edad })

    // Inscripción (al inicio)
    if (inscripcionPEN > 0)
      ev.push({ icon: '📝', nombre: 'Posgrado – Inscripción / matrícula', tipo: 'unico', value: inscripcionPEN, year: s.anioCalendario, edad })

    // Idioma (antes del programa)
    if (s.tieneIdioma && s.costoIdiomaMensual > 0 && s.mesesIdioma > 0)
      ev.push({ icon: '🗣️', nombre: 'Posgrado – Cursos de idioma', tipo: 'recurrente', value: s.costoIdiomaMensual, anioIni: general.anioActual + idiomaAnioT, anioFin_: s.anioCalendario, edadIni: general.edadActual + idiomaAnioT, edadFin_: edad })

    // Mudanza (al inicio, solo extranjero)
    if (mudanzaPEN > 0)
      ev.push({ icon: '📦', nombre: 'Posgrado – Mudanza / establecimiento', tipo: 'unico', value: mudanzaPEN, year: s.anioCalendario, edad })

    // Costos del financiamiento
    if (s.estrategia === 'unico' && fin.inicialPEN > 0)
      ev.push({ icon: '🎓', nombre: `Posgrado – Pago único${suf}`, tipo: 'unico', value: fin.inicialPEN, year: s.anioCalendario, edad })
    if (s.estrategia === 'prestamo' && fin.inicialPEN > 0)
      ev.push({ icon: '🎓', nombre: `Posgrado – Cuota inicial${suf}`, tipo: 'unico', value: fin.inicialPEN, year: s.anioCalendario, edad })
    if ((s.estrategia === 'cuotas' || s.estrategia === 'prestamo') && fin.mensual > 0) {
      const label = s.estrategia === 'prestamo' ? `Posgrado – Cuota préstamo${suf}` : `Posgrado – Cuotas${suf}`
      ev.push({ icon: '🎓', nombre: label, tipo: 'recurrente', value: fin.mensual, anioIni: s.anioCalendario, anioFin_: s.anioCalendario + fin.plazoAnios, edadIni: edad, edadFin_: general.edadActual + fin.anioFinPagoT })
    }

    // Extras mensuales
    if (extrasMensualesPEN > 0) {
      const nombreExtra = s.destino === 'local' ? 'Posgrado – Gastos adicionales' : 'Posgrado – Vida en el exterior'
      ev.push({ icon: s.destino === 'local' ? '📚' : '✈️', nombre: nombreExtra, tipo: 'recurrente', value: extrasMensualesPEN, anioIni: s.anioCalendario, anioFin_: anioFin, edadIni: edad, edadFin_: edadFin })
    }

    // Tesis (al final)
    if (tesisPEN > 0)
      ev.push({ icon: '📄', nombre: 'Posgrado – Tesis / proyecto final', tipo: 'unico', value: tesisPEN, year: anioFin, edad: edadFin })

    return ev
  }, [s, fin, extrasMensualesPEN, admisionPEN, inscripcionPEN, mudanzaPEN, tesisPEN, edad, edadFin, anioFin, idiomaAnioT, general])

  function generar() {
    const ev: Omit<EventoVida, 'id'>[] = []
    const suf = s.tieneBeca ? ` (beca ${s.pctBeca}%)` : ''

    if (admisionPEN > 0)
      ev.push({ nombre: 'Posgrado – Proceso de admisión', tipoEvento: 'posgrado', retiroUnico: { anioT, monto: Math.round(admisionPEN) } })
    if (inscripcionPEN > 0)
      ev.push({ nombre: 'Posgrado – Inscripción / matrícula', tipoEvento: 'posgrado', retiroUnico: { anioT, monto: Math.round(inscripcionPEN) } })
    if (s.tieneIdioma && s.costoIdiomaMensual > 0)
      ev.push({ nombre: 'Posgrado – Cursos de idioma', tipoEvento: 'posgrado', gastoRecurrente: { anioInicioT: idiomaAnioT, anioFinT: anioT, montoMensual: Math.round(s.costoIdiomaMensual) } })
    if (mudanzaPEN > 0)
      ev.push({ nombre: 'Posgrado – Mudanza / establecimiento', tipoEvento: 'posgrado', retiroUnico: { anioT, monto: Math.round(mudanzaPEN) } })
    if (s.estrategia === 'unico' && fin.inicialPEN > 0)
      ev.push({ nombre: `Posgrado – Pago único${suf}`, tipoEvento: 'posgrado', retiroUnico: { anioT, monto: Math.round(fin.inicialPEN) } })
    if (s.estrategia === 'prestamo' && fin.inicialPEN > 0)
      ev.push({ nombre: `Posgrado – Cuota inicial${suf}`, tipoEvento: 'posgrado', retiroUnico: { anioT, monto: Math.round(fin.inicialPEN) } })
    if ((s.estrategia === 'cuotas' || s.estrategia === 'prestamo') && fin.mensual > 0)
      ev.push({ nombre: s.estrategia === 'prestamo' ? `Posgrado – Cuota préstamo${suf}` : `Posgrado – Cuotas${suf}`, tipoEvento: 'posgrado', gastoRecurrente: { anioInicioT: anioT, anioFinT: fin.anioFinPagoT, montoMensual: fin.mensual } })
    if (extrasMensualesPEN > 0)
      ev.push({ nombre: s.destino === 'local' ? 'Posgrado – Gastos adicionales' : 'Posgrado – Vida en el exterior', tipoEvento: 'posgrado', gastoRecurrente: { anioInicioT: anioT, anioFinT, montoMensual: Math.round(extrasMensualesPEN) } })
    if (tesisPEN > 0)
      ev.push({ nombre: 'Posgrado – Tesis / proyecto final', tipoEvento: 'posgrado', retiroUnico: { anioT: anioFinT, monto: Math.round(tesisPEN) } })

    onConfirm(ev)
  }

  return (
    <div className="space-y-5">
      <PWProgress steps={PASOS} current={STEP_IDX[step]} />

      {/* ── PASO 1: El programa ───────────────────────────────────────────── */}
      {step === 'programa' && (
        <div className="space-y-5">
          <PWHeader title="El programa" desc="¿Dónde estudiarás, cuánto cuesta en total y cuánto dura?" />

          <PWGroup label="¿Dónde es el posgrado?" icon="📍">
            <PWCard value="local" current={s.destino}
              onSelect={v => set({ destino: v as Destino, moneda: v === 'extranjero' ? 'USD' : s.moneda })}
              title="En el país" desc="Pagas en PEN o USD" />
            <PWCard value="extranjero" current={s.destino}
              onSelect={v => set({ destino: v as Destino, moneda: 'USD' })}
              title="En el extranjero" desc="Incluye vida, alojamiento, vuelos" />
          </PWGroup>

          <div className="space-y-2">
            <label className="block text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>¿En qué año inicias?</label>
            <div className="flex items-center gap-3">
              <input type="number"
                min={general.anioActual + 1}
                max={general.anioActual + (general.edadVidaEstimada - general.edadActual)}
                value={s.anioCalendario}
                onChange={e => set({ anioCalendario: parseInt(e.target.value) || general.anioActual + 1 })}
                className="w-28 px-4 py-3 rounded-xl text-sm outline-none font-mono" style={iStyle} />
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                → tendrás <strong style={{ color: 'var(--color-acento)' }}>{edad} años</strong>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Costo total del programa</label>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>El precio que te da la institución — sin importar cómo lo financies después</p>
            <div className="flex gap-2">
              <MonedaT value={s.moneda} onChange={m => set({ moneda: m })} />
              <input type="number" min={0} value={s.costoTotal}
                onChange={e => set({ costoTotal: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-4 py-3 rounded-xl text-base outline-none font-mono" style={iStyle} />
            </div>
            {s.moneda === 'USD' && (
              <TCBadge tcVenta={tcVenta} tcLoading={tcLoading} actualizar={actualizar}
                extra={<>→ <strong style={{ color: 'var(--color-texto)' }}>S/ {FM(costoTotalPEN)}</strong></>} />
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Duración del programa</label>
            <div className="grid grid-cols-4 gap-2">
              {[12, 18, 24, 36].map(m => (
                <button key={m} onClick={() => set({ duracionMeses: m })} className="py-3 rounded-xl text-sm font-medium"
                  style={{ background: s.duracionMeses === m ? 'var(--color-acento)' : 'var(--color-fondo)', color: s.duracionMeses === m ? '#fff' : 'var(--color-muted)', border: `1px solid ${s.duracionMeses === m ? 'var(--color-acento)' : 'var(--color-borde)'}` }}>
                  {m === 12 ? '1 año' : m === 18 ? '18m' : `${m / 12} años`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input type="number" min={1} max={120} value={s.duracionMeses}
                onChange={e => set({ duracionMeses: parseInt(e.target.value) || 1 })}
                className="w-28 px-4 py-3 rounded-xl text-sm outline-none font-mono" style={iStyle} />
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                meses → terminas en <strong style={{ color: 'var(--color-texto)' }}>{anioFin} ({edadFin} años)</strong>
              </span>
            </div>
          </div>

          {/* Beca */}
          <OptToggle label="¿Tienes o esperas una beca?" desc="Reduce el costo total del programa"
            value={s.tieneBeca} onChange={v => set({ tieneBeca: v })}>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--color-texto)' }}>Cobertura de la beca</span>
                <span className="text-lg font-bold" style={{ color: 'var(--color-acento)' }}>{s.pctBeca}%</span>
              </div>
              <input type="range" min={5} max={100} step={5} value={s.pctBeca}
                onChange={e => set({ pctBeca: parseInt(e.target.value) })}
                className="w-full h-2" style={{ accentColor: 'var(--color-acento)' }} />
              <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
                <span>Costo bruto: {s.moneda} {FM(s.costoTotal)}</span>
                <span style={{ color: '#22c55e' }}>Costo neto: S/ {FM(costoNetoPEN)}</span>
              </div>
            </div>
          </OptToggle>

          {/* TA/RA */}
          <OptToggle label="¿Recibirás ingreso por beca (TA/RA)?" desc="Teaching o Research assistant — reduce el costo mensual neto"
            value={s.tieneIngresoTA} onChange={v => set({ tieneIngresoTA: v })}>
            <div className="flex gap-2">
              <MonedaT value={s.monedaTA} onChange={m => set({ monedaTA: m })} />
              <input type="number" min={0} value={s.ingresoTAMensual}
                onChange={e => set({ ingresoTAMensual: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-4 py-3 rounded-xl text-base outline-none font-mono" style={iStyle} />
            </div>
            <p className="text-xs mt-1" style={{ color: '#22c55e' }}>
              Reduce el costo mensual en S/ {FM(ingresoTAPEN)}/mes
            </p>
          </OptToggle>

          <PWNav onBack={onCancel} backLabel="Cancelar" backIcon={<X size={15} />}
            onNext={() => setStep('financiamiento')} nextDisabled={s.costoTotal <= 0 || s.duracionMeses <= 0} />
        </div>
      )}

      {/* ── PASO 2: Financiamiento ────────────────────────────────────────── */}
      {step === 'financiamiento' && (
        <div className="space-y-5">
          <PWHeader title="¿Cómo lo financias?"
            desc={`Costo neto a cubrir: S/ ${FM(costoNetoPEN)}${s.tieneIngresoTA ? ` (ingreso TA/RA: −S/ ${FM(ingresoTAPEN)}/mes)` : ''}`} />

          <div className="grid grid-cols-1 gap-2">
            {([
              { v: 'cuotas',  t: 'Cuotas propias',       d: 'Distribuyes el costo en los meses del programa con tus fondos' },
              { v: 'prestamo', t: 'Préstamo / crédito',   d: 'Financiamiento bancario o institucional con tasa de interés' },
              { v: 'unico',   t: 'Pago adelantado',       d: 'Retiro único al inicio — ahorros, liquidación, herencia, etc.' },
            ] as const).map(o => (
              <PWCard key={o.v} value={o.v} current={s.estrategia} onSelect={v => set({ estrategia: v as Estrategia })} title={o.t} desc={o.d} />
            ))}
          </div>

          {s.estrategia === 'cuotas' && (
            <SummaryBox>
              <div className="flex justify-between text-sm" style={{ color: 'var(--color-muted)' }}>
                <span>S/ {FM(costoNetoPEN)} en {s.duracionMeses} meses</span>
                {s.tieneIngresoTA && <span style={{ color: '#22c55e' }}>−S/ {FM(ingresoTAPEN)}/mes TA/RA</span>}
              </div>
              <SummaryDivider />
              <CostRow label="Cuota mensual neta" value={fin.mensual} bold accent />
            </SummaryBox>
          )}

          {s.estrategia === 'unico' && (
            <SummaryBox>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Retiro único en {s.anioCalendario} ({edad} años)</p>
              <SummaryDivider />
              <CostRow label="Monto a retirar" value={costoNetoPEN} bold accent />
            </SummaryBox>
          )}

          {s.estrategia === 'prestamo' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Cuota inicial (%)</label>
                  <span className="text-sm font-bold font-mono" style={{ color: 'var(--color-acento)' }}>
                    {s.inicialPct}% = S/ {FM(costoNetoPEN * s.inicialPct / 100)}
                  </span>
                </div>
                <input type="range" min={0} max={80} step={5} value={s.inicialPct}
                  onChange={e => set({ inicialPct: parseInt(e.target.value) })}
                  className="w-full h-2" style={{ accentColor: 'var(--color-acento)' }} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>TEA (%)</label>
                <input type="number" min={0} step={0.5} value={s.teaPct}
                  onChange={e => set({ teaPct: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl text-base outline-none font-mono" style={iStyle} />
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>TEM: {(calcTEM(s.teaPct) * 100).toFixed(3)}%</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Plazo de pago</label>
                <div className="grid grid-cols-4 gap-2">
                  {[12, 24, 36, 48].map(m => (
                    <button key={m} onClick={() => set({ plazoMeses: m })} className="py-3 rounded-xl text-sm font-medium"
                      style={{ background: s.plazoMeses === m ? 'var(--color-acento)' : 'var(--color-fondo)', color: s.plazoMeses === m ? '#fff' : 'var(--color-muted)', border: `1px solid ${s.plazoMeses === m ? 'var(--color-acento)' : 'var(--color-borde)'}` }}>
                      {m === 12 ? '1 año' : `${m / 12} años`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input type="number" min={1} max={120} value={s.plazoMeses}
                    onChange={e => set({ plazoMeses: parseInt(e.target.value) || 1 })}
                    className="w-28 px-4 py-3 rounded-xl text-sm outline-none font-mono" style={iStyle} />
                  <span className="text-sm" style={{ color: 'var(--color-muted)' }}>meses</span>
                </div>
              </div>
              {fin.mensual > 0 && (
                <SummaryBox>
                  {fin.inicialPEN > 0 && <CostRow label={`Cuota inicial (${s.inicialPct}%)`} value={fin.inicialPEN} />}
                  <CostRow label="Principal a financiar" value={fin.principal} />
                  {s.tieneIngresoTA && <CostRow label="−Ingreso TA/RA mensual" value={-ingresoTAPEN} color="#22c55e" />}
                  <SummaryDivider />
                  <CostRow label="Cuota mensual neta" value={fin.mensual} bold accent />
                  <CostRow label="Total intereses" value={fin.totalIntereses} color="#ef4444" />
                  {fin.plazoAnios > Math.ceil(s.duracionMeses / 12) && (
                    <p className="text-xs pt-1" style={{ color: '#f59e0b' }}>
                      ⚠ El crédito ({fin.plazoAnios} años) excede la duración del programa ({Math.ceil(s.duracionMeses / 12)} años)
                    </p>
                  )}
                </SummaryBox>
              )}
            </div>
          )}

          <PWNav onBack={() => setStep('programa')} onNext={() => setStep('gastos')} />
        </div>
      )}

      {/* ── PASO 3a: Gastos locales ───────────────────────────────────────── */}
      {step === 'gastos' && s.destino === 'local' && (
        <div className="space-y-5">
          <PWHeader title="Gastos locales" desc="Costos adicionales durante el programa." />

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Gastos adicionales mensuales (S/)</label>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Materiales, libros, transporte adicional, recursos digitales</p>
            <input type="number" min={0} value={s.extrasLocales}
              onChange={e => set({ extrasLocales: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-xl text-base outline-none font-mono" style={iStyle} />
          </div>

          <CostosUnicos s={s} set={set} open={extraOpen} setOpen={setExtraOpen} iStyle={iStyle} destino={s.destino} />

          {(s.extrasLocales > 0 || fin.mensual > 0) && (
            <SummaryBox>
              {fin.mensual > 0 && <CostRow label={s.estrategia === 'prestamo' ? 'Cuota préstamo' : 'Cuotas programa'} value={fin.mensual} />}
              {s.extrasLocales > 0 && <CostRow label="Gastos adicionales" value={s.extrasLocales} />}
              <SummaryDivider />
              <CostRow label="Total mensual" value={totalMensualPEN} bold accent />
            </SummaryBox>
          )}

          <PWNav onBack={() => setStep('financiamiento')} onNext={() => setStep('preview')} />
        </div>
      )}

      {/* ── PASO 3b: Costos extranjero ────────────────────────────────────── */}
      {step === 'gastos' && s.destino === 'extranjero' && (
        <div className="space-y-5">
          <PWHeader title="Costos en el exterior" desc="Gastos de vivir y estudiar fuera. Ingresa en USD." />

          <TCBadge tcVenta={tcVenta} tcLoading={tcLoading} actualizar={actualizar} />

          <USDField label="Alojamiento mensual (USD)" hint="Cuarto, departamento o residencia estudiantil"
            value={s.alojamientoMensual} onChange={v => set({ alojamientoMensual: v })} pen={alojamientoPEN} iStyle={iStyle} />

          <USDField label="Gastos de vida mensuales (USD)" hint="Alimentación, transporte, ocio, telefonía"
            value={s.vidaMensual} onChange={v => set({ vidaMensual: v })} pen={vidaPEN} iStyle={iStyle} />

          <div className="space-y-2">
            <label className="block text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Pasajes aéreos por año</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs" style={{ color: 'var(--color-muted)' }}>N° vuelos / año</label>
                <input type="number" min={0} max={12} value={s.nVuelos}
                  onChange={e => set({ nVuelos: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl text-base outline-none font-mono" style={iStyle} />
              </div>
              <div className="space-y-1">
                <label className="text-xs" style={{ color: 'var(--color-muted)' }}>Costo por pasaje (USD)</label>
                <input type="number" min={0} value={s.costoVuelo}
                  onChange={e => set({ costoVuelo: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl text-base outline-none font-mono" style={iStyle} />
              </div>
            </div>
            {s.nVuelos > 0 && s.costoVuelo > 0 && (
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                USD {FM(s.nVuelos * s.costoVuelo)}/año → <strong style={{ color: 'var(--color-texto)' }}>S/ {FM(vuelosMensualizadosPEN)}/mes</strong>
              </p>
            )}
          </div>

          <USDField label="Seguro médico + visa anual (USD)" hint="Seguro médico, renovación de visa, permisos de estadía"
            value={s.seguroVisaAnual} onChange={v => set({ seguroVisaAnual: v })} pen={seguroMensualizadoPEN} penLabel="/mes" iStyle={iStyle} />

          <CostosUnicos s={s} set={set} open={extraOpen} setOpen={setExtraOpen} iStyle={iStyle} destino={s.destino} />

          <SummaryBox>
            {fin.mensual > 0 && <CostRow label={s.estrategia === 'prestamo' ? 'Cuota préstamo' : 'Cuotas programa'} value={fin.mensual} />}
            {s.alojamientoMensual > 0 && <CostRow label="Alojamiento" value={alojamientoPEN} />}
            {s.vidaMensual > 0 && <CostRow label="Gastos de vida" value={vidaPEN} />}
            {s.nVuelos > 0 && s.costoVuelo > 0 && <CostRow label="Vuelos (prom./mes)" value={vuelosMensualizadosPEN} />}
            {s.seguroVisaAnual > 0 && <CostRow label="Seguro + visa (prom./mes)" value={seguroMensualizadoPEN} />}
            <SummaryDivider />
            <CostRow label="Total mensual" value={totalMensualPEN} bold accent />
          </SummaryBox>

          <PWNav onBack={() => setStep('financiamiento')} onNext={() => setStep('preview')} />
        </div>
      )}

      {/* ── PASO 4: Resumen ───────────────────────────────────────────────── */}
      {step === 'preview' && (
        <div className="space-y-5">
          <PWHeader title="Resumen" desc="Esto se agregará a tu escenario de simulación." />

          <div className="grid grid-cols-2 gap-2.5">
            {s.estrategia === 'unico'
              ? <MetC label="Retiro único" value={`S/ ${FM(costoNetoPEN)}`} accent />
              : <MetC label="Costo mensual total" value={`S/ ${FM(totalMensualPEN)}`} accent />}
            <MetC label="Duración" value={`${s.duracionMeses} meses`} hint={`${s.anioCalendario}–${anioFin}`} />
            <MetC label="Inversión total" value={`S/ ${FM(s.estrategia === 'unico' ? costoNetoPEN : totalMensualPEN * s.duracionMeses)}`} color="#ef4444" />
            <MetC label="Entradas" value={`${eventosPreview.length}`} hint="en el escenario" />
          </div>

          <div className="rounded-2xl p-4 space-y-2.5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>
              Se crearán {eventosPreview.length} {eventosPreview.length === 1 ? 'entrada' : 'entradas'}:
            </p>
            {eventosPreview.map((ev, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-base shrink-0">{ev.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--color-texto)' }}>{ev.nombre}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {ev.tipo === 'unico'
                      ? `Retiro único S/ ${FM(ev.value)} en ${ev.year} (${ev.edad} años)`
                      : `S/ ${FM(ev.value)}/mes · ${ev.anioIni}–${ev.anioFin_} (${ev.edadIni}–${ev.edadFin_} años)`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid var(--color-borde)' }}>
            <button onClick={() => setStep('gastos')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
              <ArrowLeft size={15} /> Atrás
            </button>
            <button onClick={generar} disabled={eventosPreview.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--color-acento)' }}>
              <Check size={16} /> Agregar al escenario
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sección de costos únicos opcionales ───────────────────────────────────────

function CostosUnicos({ s, set, open, setOpen, iStyle, destino }: {
  s: PS; set: (p: Partial<PS>) => void
  open: boolean; setOpen: (v: boolean) => void
  iStyle: React.CSSProperties; destino: Destino
}) {
  const activos = [s.tieneAdmision, s.tieneInscripcion, s.tieneIdioma, destino === 'extranjero' && s.tieneMudanza, s.tieneTesis].filter(Boolean).length

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-borde)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
        style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)' }}>
        <span className="flex items-center gap-2">
          Costos únicos opcionales
          {activos > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-acento)', color: '#fff' }}>
              {activos} activo{activos !== 1 ? 's' : ''}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={16} style={{ color: 'var(--color-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-muted)' }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 pt-3" style={{ background: 'var(--color-card)' }}>

          <OptToggle label="Proceso de admisión" desc="GMAT, GRE, idioma oficial, aplicaciones — retiro al inicio"
            value={s.tieneAdmision} onChange={v => set({ tieneAdmision: v })}>
            <PENInput label="Costo total (S/)" value={s.costoAdmision} onChange={v => set({ costoAdmision: v })} iStyle={iStyle} />
          </OptToggle>

          <OptToggle label="Inscripción / matrícula inicial" desc="Pago puntual al momento de inscribirte — retiro al inicio"
            value={s.tieneInscripcion} onChange={v => set({ tieneInscripcion: v })}>
            <PENInput label="Monto (S/)" value={s.costoInscripcion} onChange={v => set({ costoInscripcion: v })} iStyle={iStyle} />
          </OptToggle>

          <OptToggle label="Cursos de idioma previos" desc="Preparación antes del programa — gasto recurrente"
            value={s.tieneIdioma} onChange={v => set({ tieneIdioma: v })}>
            <div className="grid grid-cols-2 gap-3">
              <PENInput label="S/ / mes" value={s.costoIdiomaMensual} onChange={v => set({ costoIdiomaMensual: v })} iStyle={iStyle} />
              <div className="space-y-1">
                <label className="text-xs" style={{ color: 'var(--color-muted)' }}>Duración (meses)</label>
                <input type="number" min={1} max={24} value={s.mesesIdioma}
                  onChange={e => set({ mesesIdioma: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none font-mono" style={iStyle} />
              </div>
            </div>
          </OptToggle>

          {destino === 'extranjero' && (
            <OptToggle label="Mudanza / establecimiento inicial" desc="Primer mes: setup, depósito, equipaje — solo extranjero"
              value={s.tieneMudanza} onChange={v => set({ tieneMudanza: v })}>
              <PENInput label="Monto (S/)" value={s.costoMudanza} onChange={v => set({ costoMudanza: v })} iStyle={iStyle} />
            </OptToggle>
          )}

          <OptToggle label="Tesis / proyecto final" desc="Publicación, defensa, correcciones — retiro al terminar"
            value={s.tieneTesis} onChange={v => set({ tieneTesis: v })}>
            <PENInput label="Monto (S/)" value={s.costoTesis} onChange={v => set({ costoTesis: v })} iStyle={iStyle} />
          </OptToggle>

        </div>
      )}
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function PWProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="space-y-3 pb-4" style={{ borderBottom: '1px solid var(--color-borde)' }}>
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: i < current ? '#22c55e' : i === current ? 'var(--color-acento)' : 'var(--color-fondo)', color: i <= current ? '#fff' : 'var(--color-muted)', border: i > current ? '1px solid var(--color-borde)' : 'none' }}>
              {i < current ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-1" style={{ background: i < current ? '#22c55e' : 'var(--color-borde)' }} />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--color-acento)' }}>{steps[current]}</p>
    </div>
  )
}

function PWHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <p className="text-lg font-bold" style={{ color: 'var(--color-texto)' }}>{title}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{desc}</p>
    </div>
  )
}

function PWGroup({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-texto)' }}>
        <span>{icon}</span>{label}
      </p>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  )
}

function PWCard({ value, current, onSelect, title, desc }: {
  value: string; current: string; onSelect: (v: string) => void; title: string; desc: string
}) {
  const sel = value === current
  return (
    <button onClick={() => onSelect(value)}
      className="flex flex-col items-start gap-1 p-3.5 rounded-2xl text-left relative w-full"
      style={{ background: sel ? 'color-mix(in srgb, var(--color-acento) 10%, var(--color-card))' : 'var(--color-card)', border: `2px solid ${sel ? 'var(--color-acento)' : 'var(--color-borde)'}` }}>
      <span className="text-sm font-semibold" style={{ color: sel ? 'var(--color-acento)' : 'var(--color-texto)' }}>{title}</span>
      <span className="text-xs leading-tight" style={{ color: 'var(--color-muted)' }}>{desc}</span>
      {sel && <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--color-acento)' }}><Check size={10} color="#fff" /></div>}
    </button>
  )
}

function MonedaT({ value, onChange }: { value: 'PEN' | 'USD'; onChange: (m: 'PEN' | 'USD') => void }) {
  return (
    <div className="flex rounded-xl overflow-hidden shrink-0" style={{ border: '1px solid var(--color-borde)' }}>
      {(['PEN', 'USD'] as const).map(m => (
        <button key={m} onClick={() => onChange(m)} className="px-4 py-3 text-sm font-bold"
          style={{ background: value === m ? 'var(--color-acento)' : 'var(--color-fondo)', color: value === m ? '#fff' : 'var(--color-muted)' }}>
          {m}
        </button>
      ))}
    </div>
  )
}

function Tog({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="shrink-0 w-12 h-6 rounded-full relative transition-colors"
      style={{ background: value ? 'var(--color-acento)' : 'var(--color-borde)' }}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: value ? '26px' : '2px' }} />
    </button>
  )
}

function OptToggle({ label, desc, value, onChange, children }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void; children?: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>{label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{desc}</p>
        </div>
        <Tog value={value} onChange={onChange} />
      </div>
      {value && children && (
        <div className="pl-3 space-y-2 pt-1" style={{ borderLeft: '2px solid var(--color-acento)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function MetC({ label, value, hint, accent, color }: { label: string; value: string; hint?: string; accent?: boolean; color?: string }) {
  const c = color ?? (accent ? 'var(--color-acento)' : 'var(--color-texto)')
  return (
    <div className="rounded-2xl p-3.5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{label}</p>
      <p className="text-base font-bold font-mono mt-1" style={{ color: c }}>{value}</p>
      {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{hint}</p>}
    </div>
  )
}

function PWNav({ onBack, onNext, backLabel = 'Atrás', backIcon, nextDisabled = false }: {
  onBack: () => void; onNext: () => void
  backLabel?: string; backIcon?: React.ReactNode; nextDisabled?: boolean
}) {
  return (
    <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid var(--color-borde)' }}>
      <button onClick={onBack} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
        style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
        {backIcon ?? <ArrowLeft size={15} />} {backLabel}
      </button>
      <button onClick={onNext} disabled={nextDisabled}
        className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
        style={{ background: 'var(--color-acento)' }}>
        Continuar →
      </button>
    </div>
  )
}

function SummaryBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
      {children}
    </div>
  )
}

function SummaryDivider() {
  return <div className="pt-1 mt-1" style={{ borderTop: '1px solid var(--color-borde)' }} />
}

function CostRow({ label, value, bold, accent, color }: {
  label: string; value: number; bold?: boolean; accent?: boolean; color?: string
}) {
  const c = color ?? (accent ? 'var(--color-acento)' : 'var(--color-texto)')
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{label}</span>
      <span className={`text-sm font-mono ${bold ? 'font-bold' : ''}`} style={{ color: c }}>S/ {FM(value)}</span>
    </div>
  )
}

function USDField({ label, hint, value, onChange, pen, penLabel = '/mes', iStyle }: {
  label: string; hint: string; value: number; onChange: (v: number) => void
  pen: number; penLabel?: string; iStyle: React.CSSProperties
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>{label}</label>
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{hint}</p>
      <div className="flex items-center gap-3">
        <input type="number" min={0} value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 px-4 py-3 rounded-xl text-base outline-none font-mono" style={iStyle} />
        {value > 0 && (
          <span className="text-sm font-mono shrink-0" style={{ color: 'var(--color-muted)' }}>= S/ {FM(pen)}{penLabel}</span>
        )}
      </div>
    </div>
  )
}

function PENInput({ label, value, onChange, iStyle }: {
  label: string; value: number; onChange: (v: number) => void; iStyle: React.CSSProperties
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs" style={{ color: 'var(--color-muted)' }}>{label}</label>
      <input type="number" min={0} value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none font-mono" style={iStyle} />
    </div>
  )
}

function TCBadge({ tcVenta, tcLoading, actualizar, extra }: {
  tcVenta: number; tcLoading: boolean; actualizar: (force?: boolean) => void; extra?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
      style={{ background: 'color-mix(in srgb, var(--color-acento) 6%, var(--color-fondo))', border: '1px solid var(--color-borde)', color: 'var(--color-muted)' }}>
      TC Rextie (venta):
      <strong style={{ color: 'var(--color-acento)' }}>S/ {tcVenta.toFixed(3)}</strong>
      {extra}
      <button onClick={() => actualizar(true)} style={{ color: 'var(--color-muted)' }}>
        <RefreshCw size={11} className={tcLoading ? 'animate-spin' : ''} />
      </button>
    </div>
  )
}
