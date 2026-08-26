import { useState, useMemo } from 'react'
import {
  Check, X, ArrowLeft, RefreshCw, Star, TrendingDown,
  Plus, Trash2, ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import type { EventoVida, GeneralParams } from '../../data/types'

// ── Tipos ──────────────────────────────────────────────────────────────────────

type SimStep   = 'wizard' | 'escenarios' | 'detalle'
type Capital   = 'bajo' | 'medio' | 'alto' | 'liquidez'
type Prioridad = 'cuota' | 'intereses' | 'plazo'

interface SimProfile {
  capitalDisponible: Capital   | null
  prioridad:         Prioridad | null
  tieneBono:         boolean   | null
  tieneCapitalExtra: boolean   | null
}

interface ViviendaConfig {
  esCompartida:        boolean
  miPorcentaje:        number
  esPrimeraVivienda:   boolean
  incluirSeguros:      boolean
  tasaDesgravamen:     number
  tasaRiesgo:          number
  incluirGastosCierre: boolean
  inversionesRindeMas: boolean
  tasaInversion:       number
}

const VC_DEFAULT: ViviendaConfig = {
  esCompartida: false, miPorcentaje: 100,
  esPrimeraVivienda: true,
  incluirSeguros: true, tasaDesgravamen: 0.04, tasaRiesgo: 0.01,
  incluirGastosCierre: true,
  inversionesRindeMas: false, tasaInversion: 10,
}

interface Prepago { mes: number; monto: number; label: string }

interface SimScenario {
  id: string; label: string; inicialPct: number
  prepagos: Prepago[]; aplicaGratificacion: boolean; plazoExtra: number
}

interface AmortRow {
  mes: number; cuotaBase: number; interes: number; capitalAmort: number
  prepago: number; esGratificacion: boolean; saldo: number
  desgravamen: number; riesgo: number; cuotaTotal: number
}

interface ScenarioResult {
  scenario: SimScenario; cuotaMensual: number; cuotaRealMensual: number
  miCuotaMedia: number; inicialPEN: number; principalPEN: number
  rows: AmortRow[]; totalIntereses: number; totalSeguros: number
  totalPagar: number; mesesReales: number; gastosCierre: number
}

// ── Motor ──────────────────────────────────────────────────────────────────────

function calcTEM(tea: number) { return (1 + tea / 100) ** (1 / 12) - 1 }

function calcCuota(p: number, tea: number, n: number) {
  if (p <= 0 || n <= 0) return 0
  const i = calcTEM(tea)
  return i === 0 ? p / n : (p * i * (1 + i) ** n) / ((1 + i) ** n - 1)
}

function buildAmort(principal: number, tea: number, plazo: number, prepagos: Prepago[], grat: boolean, valorPEN: number, vc?: ViviendaConfig): AmortRow[] {
  if (principal <= 0) return []
  const i = calcTEM(tea), cuotaBase = calcCuota(principal, tea, plazo)
  const tDG = (vc?.incluirSeguros ? vc.tasaDesgravamen : 0) / 100
  const tRI = (vc?.incluirSeguros ? vc.tasaRiesgo      : 0) / 100
  const rows: AmortRow[] = []
  let saldo = principal
  for (let mes = 1; mes <= plazo + 36 && saldo > 0.005; mes++) {
    const interes = saldo * i, capitalAmort = Math.min(cuotaBase - interes, saldo)
    const desgravamen = saldo * tDG, riesgo = valorPEN * tRI
    const esGrat = grat && mes % 6 === 0
    const extraGrat = esGrat ? Math.min(cuotaBase, saldo - capitalAmort) : 0
    const ppConf = prepagos.find(p => p.mes === mes)?.monto ?? 0
    const extraPP = Math.min(ppConf, Math.max(0, saldo - capitalAmort - extraGrat))
    const capTotal = capitalAmort + extraGrat + extraPP
    saldo = Math.max(0, saldo - capTotal)
    rows.push({ mes, cuotaBase, interes, capitalAmort: capitalAmort + extraGrat, prepago: extraPP, esGratificacion: esGrat, saldo, desgravamen, riesgo, cuotaTotal: interes + capTotal + desgravamen + riesgo })
    if (saldo <= 0.005) break
  }
  return rows
}

const UIT = 5350
function gastosCierre(v: number, vc: ViviendaConfig) {
  const alcabala = vc.esPrimeraVivienda ? 0 : Math.max(0, v - 10 * UIT) * 0.03
  return { alcabala, notaria: v * 0.007, rrpp: 1500, total: alcabala + v * 0.007 + 1500 }
}

function oppCost(mensual: number, meses: number, tasaAnual: number) {
  if (!mensual || !meses) return 0
  const i = (1 + tasaAnual / 100) ** (1 / 12) - 1
  return mensual * ((1 + i) ** meses - 1) / i
}

function runScenario(s: SimScenario, valorPEN: number, tea: number, plazo: number, vc?: ViviendaConfig): ScenarioResult {
  const inicialPEN = valorPEN * s.inicialPct / 100
  const principalPEN = Math.max(0, valorPEN - inicialPEN)
  const cuotaMensual = calcCuota(principalPEN, tea, plazo + s.plazoExtra)
  const rows = buildAmort(principalPEN, tea, plazo + s.plazoExtra, s.prepagos, s.aplicaGratificacion, valorPEN, vc)
  const totalIntereses = rows.reduce((a, r) => a + r.interes, 0)
  const totalSeguros   = rows.reduce((a, r) => a + r.desgravamen + r.riesgo, 0)
  const mesesReales    = rows.length
  const gc = vc?.incluirGastosCierre ? gastosCierre(valorPEN, vc).total : 0
  const totalPagar = inicialPEN + principalPEN + totalIntereses + totalSeguros + gc
  const cuotaRealMensual = rows.length ? rows.reduce((a, r) => a + r.cuotaTotal, 0) / rows.length : cuotaMensual
  const pct = vc?.esCompartida ? vc.miPorcentaje / 100 : 1
  return { scenario: s, cuotaMensual, cuotaRealMensual, miCuotaMedia: cuotaRealMensual * pct, inicialPEN, principalPEN, rows, totalIntereses, totalSeguros, totalPagar, mesesReales, gastosCierre: gc }
}

function generarEscenarios(p: SimProfile, valorPEN: number, _tea: number, _plazo: number, tipoId: string, vc?: ViviendaConfig): SimScenario[] {
  const esV = tipoId === 'vivienda'
  const ib = p.capitalDisponible === 'bajo' ? 10 : p.capitalDisponible === 'medio' ? 15 : p.capitalDisponible === 'alto' ? 25 : 10
  const a: SimScenario = { id: 'a', label: `Mínimo (${ib}% inicial)`, inicialPct: ib, prepagos: [], aplicaGratificacion: false, plazoExtra: 0 }
  let b: SimScenario, c: SimScenario
  if (esV) {
    b = { id: 'b', label: `${ib}% + Gratificaciones`, inicialPct: ib, prepagos: [], aplicaGratificacion: true, plazoExtra: 0 }
    if (p.tieneCapitalExtra && !vc?.inversionesRindeMas) {
      c = { id: 'c', label: `${ib}% + Gratif. + Prepago año 2`, inicialPct: ib, prepagos: [{ mes: 24, monto: Math.round(valorPEN * 0.04), label: 'Prepago año 2' }], aplicaGratificacion: true, plazoExtra: 0 }
    } else if (p.capitalDisponible === 'alto') {
      c = { id: 'c', label: `${Math.min(ib + 10, 40)}% inicial + Gratif.`, inicialPct: Math.min(ib + 10, 40), prepagos: [], aplicaGratificacion: true, plazoExtra: 0 }
    } else {
      c = { id: 'c', label: `${ib}% + Gratif. + Plazo −5 años`, inicialPct: ib, prepagos: [], aplicaGratificacion: true, plazoExtra: -60 }
    }
  } else if (p.capitalDisponible === 'alto' || p.capitalDisponible === 'medio') {
    b = { id: 'b', label: `${Math.min(ib + 10, 40)}% inicial`, inicialPct: Math.min(ib + 10, 40), prepagos: [], aplicaGratificacion: p.tieneBono === true, plazoExtra: 0 }
    c = { id: 'c', label: `${ib}% + Gratificaciones`, inicialPct: ib, prepagos: [], aplicaGratificacion: true, plazoExtra: 0 }
  } else if (p.prioridad === 'cuota') {
    b = { id: 'b', label: `${ib}% + Gratificaciones`, inicialPct: ib, prepagos: [], aplicaGratificacion: true, plazoExtra: 0 }
    c = { id: 'c', label: 'Plazo extendido (+5 años)', inicialPct: ib, prepagos: [], aplicaGratificacion: false, plazoExtra: 60 }
  } else {
    b = { id: 'b', label: `${ib}% + Gratificaciones`, inicialPct: ib, prepagos: [], aplicaGratificacion: true, plazoExtra: 0 }
    c = { id: 'c', label: `${ib}% + Prepago año 1`, inicialPct: ib, prepagos: [{ mes: 12, monto: Math.round(valorPEN * 0.05), label: 'Prepago año 1' }], aplicaGratificacion: p.tieneBono === true, plazoExtra: 0 }
  }
  return [a, b, c]
}

function getBadge(results: ScenarioResult[], prioridad: Prioridad | null): string | null {
  if (!results.length) return null
  const fn: Record<string, (r: ScenarioResult) => number> = { cuota: r => r.miCuotaMedia, intereses: r => r.totalIntereses, plazo: r => r.mesesReales }
  const key = prioridad ? fn[prioridad] : (r: ScenarioResult) => r.totalPagar
  const min = Math.min(...results.map(key))
  return results.find(r => key(r) === min)?.scenario.id ?? null
}

const M = (n: number) => Math.round(n).toLocaleString('es-PE')

// ── Componente principal ────────────────────────────────────────────────────────

export function LoanSimulator({ tipoId, tipoLabel, anioT, general: _general, onConfirm, onCancel }: {
  tipoId: string; tipoLabel: string; anioT: number; anioCalendario: number
  general: GeneralParams; onConfirm: (eventos: Omit<EventoVida, 'id'>[]) => void; onCancel: () => void
}) {
  const { tc: tcData, loading: tcLoading, actualizar } = useTipoCambio()
  const tcVenta  = tcData?.venta ?? 3.80
  const esV = tipoId === 'vivienda'

  // Wizard sub-steps: vivienda=[0,1,2] / auto=[0,1]
  const PASOS = esV
    ? [esV ? '🏠 El inmueble' : '🚗 El vehículo', '📋 La vivienda', '👤 Tu perfil']
    : ['🚗 El vehículo', '👤 Tu perfil']

  const [simStep, setSimStep]   = useState<SimStep>('wizard')
  const [wStep, setWStep]       = useState(0)
  const [moneda, setMoneda]     = useState<'PEN' | 'USD'>('PEN')
  const [valorTotal, setValorTotal] = useState(esV ? 300000 : 50000)
  const [teaPct, setTeaPct]     = useState(esV ? 9 : 18)
  const [plazoMeses, setPlazoMeses] = useState(esV ? 240 : 60)
  const [profile, setProfile]   = useState<SimProfile>({ capitalDisponible: null, prioridad: null, tieneBono: null, tieneCapitalExtra: null })
  const [vc, setVc]             = useState<ViviendaConfig>({ ...VC_DEFAULT })
  const [escenarios, setEscenarios] = useState<SimScenario[]>([])
  const [tabActivo, setTabActivo]   = useState('a')
  const [detalleId, setDetalleId]   = useState<string | null>(null)
  const [showFullTable, setShowFullTable] = useState(false)

  const valorPEN = moneda === 'USD' ? valorTotal * tcVenta : valorTotal
  const gc       = esV && vc.incluirGastosCierre ? gastosCierre(valorPEN, vc) : null

  const results: ScenarioResult[] = useMemo(
    () => escenarios.map(s => runScenario(s, valorPEN, teaPct, plazoMeses, esV ? vc : undefined)),
    [escenarios, valorPEN, teaPct, plazoMeses, vc],
  )

  const badgeId       = useMemo(() => getBadge(results, profile.prioridad), [results, profile.prioridad])
  const detalleResult = results.find(r => r.scenario.id === detalleId)

  function siguiente() {
    if (wStep < PASOS.length - 1) setWStep(w => w + 1)
    else {
      const esc = generarEscenarios(profile, valorPEN, teaPct, plazoMeses, tipoId, vc)
      setEscenarios(esc); setTabActivo('a'); setSimStep('escenarios')
    }
  }

  function updateEscenario(id: string, patch: Partial<SimScenario>) {
    setEscenarios(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function confirmarSeleccion(result: ScenarioResult) {
    const eventos: Omit<EventoVida, 'id'>[] = []
    if (esV && vc.incluirGastosCierre && gc && gc.total > 0)
      eventos.push({ nombre: `${tipoLabel} – Gastos de cierre`, tipoEvento: tipoId, retiroUnico: { anioT, monto: Math.round(gc.total) } })
    const miInicial = esV && vc.esCompartida ? result.inicialPEN * vc.miPorcentaje / 100 : result.inicialPEN
    if (miInicial > 0)
      eventos.push({ nombre: `${tipoLabel} – Cuota inicial${vc.esCompartida ? ` (${vc.miPorcentaje}%)` : ''}`, tipoEvento: tipoId, retiroUnico: { anioT, monto: Math.round(miInicial) } })
    const miCuota = esV && vc.esCompartida ? Math.round(result.cuotaRealMensual * vc.miPorcentaje / 100) : Math.round(result.cuotaRealMensual)
    if (miCuota > 0)
      eventos.push({ nombre: `${tipoLabel} – Cuota mensual${vc.esCompartida ? ` (${vc.miPorcentaje}%)` : ''}`, tipoEvento: tipoId, gastoRecurrente: { anioInicioT: anioT, anioFinT: anioT + Math.ceil(result.mesesReales / 12), montoMensual: miCuota } })
    onConfirm(eventos)
  }

  // ── Paso de wizard ──────────────────────────────────────────────────────────

  if (simStep === 'wizard') {
    // Qué paso mostrar según wStep y tipo
    const esPasoVivienda = esV && wStep === 1
    const esPasoPerfil   = esV ? wStep === 2 : wStep === 1
    const esPasoBien     = wStep === 0

    // Validación para habilitar "Siguiente"
    const pasoValido = esPasoBien
      ? valorTotal > 0 && teaPct > 0 && plazoMeses > 0
      : esPasoVivienda
        ? true  // vivienda tiene defaults
        : profile.capitalDisponible !== null && profile.prioridad !== null && profile.tieneBono !== null && profile.tieneCapitalExtra !== null

    return (
      <div className="flex flex-col gap-0" style={{ minHeight: 0 }}>
        {/* Progress bar */}
        <WizardProgress steps={PASOS} current={wStep} />

        {/* Contenido del paso */}
        <div className="py-4 space-y-5">

          {/* ── PASO 0: El bien ─────────────────────────────────────────── */}
          {esPasoBien && (
            <div className="space-y-5">
              <StepHeader
                title={esV ? 'El inmueble' : 'El vehículo'}
                desc={esV ? 'Ingresa el valor, la tasa y el plazo que te ofrece el banco.' : 'Ingresa el valor del vehículo, la tasa y el plazo del crédito.'}
              />

              {/* Valor */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>
                  {esV ? 'Valor del inmueble' : 'Valor del vehículo'}
                </label>
                <div className="flex gap-2">
                  <MonedaToggle value={moneda} onChange={setMoneda} />
                  <input type="number" min={0} value={valorTotal}
                    onChange={e => setValorTotal(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 rounded-xl text-base outline-none font-mono"
                    style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }} />
                </div>
                {moneda === 'USD' && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-muted)' }}>
                    TC Rextie: {tcLoading ? 'cargando…' : <><strong style={{ color: 'var(--color-acento)' }}>S/ {tcVenta.toFixed(3)}</strong> = <strong style={{ color: 'var(--color-texto)' }}>S/ {M(valorTotal * tcVenta)}</strong></>}
                    <button onClick={() => actualizar(true)} style={{ color: 'var(--color-muted)' }}><RefreshCw size={12} className={tcLoading ? 'animate-spin' : ''} /></button>
                  </div>
                )}
              </div>

              {/* TEA */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Tasa de interés anual (TEA %)</label>
                <input type="number" min={0} step={0.1} value={teaPct}
                  onChange={e => setTeaPct(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl text-base outline-none font-mono"
                  style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }} />
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Tasa mensual equivalente: {(calcTEM(teaPct) * 100).toFixed(3)}%</p>
              </div>

              {/* Plazo */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Plazo del crédito</label>
                <div className="grid grid-cols-2 gap-2">
                  {(esV ? [120, 180, 240, 300] : [24, 36, 48, 60, 72, 84]).map(m => (
                    <button key={m} onClick={() => setPlazoMeses(m)}
                      className="py-3 rounded-xl text-sm font-medium"
                      style={{ background: plazoMeses === m ? 'var(--color-acento)' : 'var(--color-fondo)', color: plazoMeses === m ? '#fff' : 'var(--color-muted)', border: `1px solid ${plazoMeses === m ? 'var(--color-acento)' : 'var(--color-borde)'}` }}>
                      {Math.round(m / 12)} años
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={6} max={480} value={plazoMeses}
                    onChange={e => setPlazoMeses(parseInt(e.target.value) || 12)}
                    className="w-28 px-4 py-2.5 rounded-xl text-sm outline-none font-mono"
                    style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-muted)' }}>meses ({Math.round(plazoMeses / 12)} años)</span>
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 1 (vivienda): La vivienda ──────────────────────────── */}
          {esPasoVivienda && (
            <div className="space-y-6">
              <StepHeader title="La vivienda" desc="Cuéntame las condiciones de la compra para armar escenarios más precisos." />

              {/* Compartida */}
              <OptionGroup label="¿Compra individual o compartida?" icon="👥">
                <OptionCard value="solo" current={vc.esCompartida ? 'compartida' : 'solo'} onSelect={() => setVc(p => ({ ...p, esCompartida: false, miPorcentaje: 100 }))}
                  title="Solo" desc="100% de la hipoteca a mi cargo" />
                <OptionCard value="compartida" current={vc.esCompartida ? 'compartida' : 'solo'} onSelect={() => setVc(p => ({ ...p, esCompartida: true, miPorcentaje: 50 }))}
                  title="Compartida" desc="Tengo un co-deudor" />
              </OptionGroup>
              {vc.esCompartida && (
                <div className="space-y-3 px-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--color-texto)' }}>¿Qué porcentaje pagas tú?</span>
                    <span className="text-lg font-bold" style={{ color: 'var(--color-acento)' }}>{vc.miPorcentaje}%</span>
                  </div>
                  <input type="range" min={10} max={90} step={5} value={vc.miPorcentaje}
                    onChange={e => setVc(p => ({ ...p, miPorcentaje: parseInt(e.target.value) }))}
                    className="w-full accent-blue-500 h-2" />
                  <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
                    <span>Yo: {vc.miPorcentaje}%</span><span>Co-deudor: {100 - vc.miPorcentaje}%</span>
                  </div>
                </div>
              )}

              {/* Primera vivienda */}
              <OptionGroup label="¿Es tu primera vivienda?" icon="🔑">
                <OptionCard value="si" current={vc.esPrimeraVivienda ? 'si' : 'no'} onSelect={() => setVc(p => ({ ...p, esPrimeraVivienda: true }))}
                  title="Sí" desc="Exonerado de alcabala" badge="Ahorro" />
                <OptionCard value="no" current={vc.esPrimeraVivienda ? 'si' : 'no'} onSelect={() => setVc(p => ({ ...p, esPrimeraVivienda: false }))}
                  title="No" desc="Aplica alcabala (3%)" />
              </OptionGroup>

              {/* Seguros */}
              <OptionGroup label="¿Incluir seguros en la cuota real?" icon="🛡️">
                <OptionCard value="si" current={vc.incluirSeguros ? 'si' : 'no'} onSelect={() => setVc(p => ({ ...p, incluirSeguros: true }))}
                  title="Sí" desc="Muéstrame la cuota real con desgravamen y riesgo" badge="Recomendado" />
                <OptionCard value="no" current={vc.incluirSeguros ? 'si' : 'no'} onSelect={() => setVc(p => ({ ...p, incluirSeguros: false }))}
                  title="No" desc="Solo la cuota de amortización" />
              </OptionGroup>

              {/* Gastos de cierre */}
              <OptionGroup label="¿Incluir gastos de cierre?" icon="📄">
                <OptionCard value="si" current={vc.incluirGastosCierre ? 'si' : 'no'} onSelect={() => setVc(p => ({ ...p, incluirGastosCierre: true }))}
                  title="Sí" desc="Alcabala, notaría y RRPP como retiro único" badge="Recomendado" />
                <OptionCard value="no" current={vc.incluirGastosCierre ? 'si' : 'no'} onSelect={() => setVc(p => ({ ...p, incluirGastosCierre: false }))}
                  title="No" desc="Solo la hipoteca" />
              </OptionGroup>

              {/* Oportunidad de inversión */}
              <OptionGroup label="¿Tus inversiones rinden más que la TEA?" icon="📈">
                <OptionCard value="no" current={vc.inversionesRindeMas ? 'si' : 'no'} onSelect={() => setVc(p => ({ ...p, inversionesRindeMas: false }))}
                  title="No" desc={`La hipoteca (${teaPct}%) es mi deuda más cara`} />
                <OptionCard value="si" current={vc.inversionesRindeMas ? 'si' : 'no'} onSelect={() => setVc(p => ({ ...p, inversionesRindeMas: true }))}
                  title="Sí" desc={`Mis inversiones superan el ${teaPct}%`} />
              </OptionGroup>
              {vc.inversionesRindeMas && (
                <div className="space-y-2 px-1">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-texto)' }}>Retorno anual estimado (%)</label>
                  <input type="number" min={0} step={0.5} value={vc.tasaInversion}
                    onChange={e => setVc(p => ({ ...p, tasaInversion: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 rounded-xl text-base outline-none font-mono"
                    style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }} />
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>VOO/QQQM histórico: ~10-12% real anual</p>
                </div>
              )}

              {/* Preview gastos de cierre */}
              {vc.incluirGastosCierre && gc && valorPEN > 0 && (
                <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>Estimado de gastos de cierre</p>
                  {[
                    { l: vc.esPrimeraVivienda ? 'Alcabala (exonerada)' : 'Alcabala (3%)', v: gc.alcabala, color: vc.esPrimeraVivienda ? '#22c55e' : undefined },
                    { l: 'Notaría + escritura (~0.7%)', v: gc.notaria },
                    { l: 'Registros Públicos', v: gc.rrpp },
                  ].map(row => (
                    <div key={row.l} className="flex justify-between text-sm">
                      <span style={{ color: 'var(--color-muted)' }}>{row.l}</span>
                      <span className="font-mono font-semibold" style={{ color: row.color ?? 'var(--color-texto)' }}>S/ {M(row.v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: '1px solid var(--color-borde)', color: 'var(--color-acento)' }}>
                    <span>Total</span><span>S/ {M(gc.total)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PASO perfil ──────────────────────────────────────────────── */}
          {esPasoPerfil && (
            <div className="space-y-6">
              <StepHeader title="Tu perfil financiero" desc="Esto me permite generar escenarios adaptados a tu situación real." />

              <OptionGroup label="¿Cuánto capital tienes para la cuota inicial?" icon="💰">
                {([
                  { v: 'bajo',     t: 'Menos del 10%',       d: 'Capital limitado' },
                  { v: 'medio',    t: 'Entre 10% y 20%',     d: 'Capital moderado' },
                  { v: 'alto',     t: 'Más del 20%',         d: 'Buen capital' },
                  { v: 'liquidez', t: 'Mínimo posible',      d: 'Prefiero mantener liquidez' },
                ] as const).map(o => (
                  <OptionCard key={o.v} value={o.v} current={profile.capitalDisponible} onSelect={v => setProfile(p => ({ ...p, capitalDisponible: v as Capital }))} title={o.t} desc={o.d} />
                ))}
              </OptionGroup>

              <OptionGroup label="¿Qué priorizas en el financiamiento?" icon="🎯">
                {([
                  { v: 'cuota',     t: 'Cuota mensual baja',    d: 'Menor impacto en mi flujo' },
                  { v: 'intereses', t: 'Pagar menos intereses', d: 'Menor costo total' },
                  { v: 'plazo',     t: 'Liquidar rápido',       d: 'Librarme de la deuda pronto' },
                ] as const).map(o => (
                  <OptionCard key={o.v} value={o.v} current={profile.prioridad} onSelect={v => setProfile(p => ({ ...p, prioridad: v as Prioridad }))} title={o.t} desc={o.d} />
                ))}
              </OptionGroup>

              <OptionGroup label="¿Recibes gratificaciones o CTS?" icon="🎁">
                <OptionCard value="true"  current={profile.tieneBono === null ? null : String(profile.tieneBono)} onSelect={() => setProfile(p => ({ ...p, tieneBono: true }))}  title="Sí" desc="Puedo destinar parte al préstamo" />
                <OptionCard value="false" current={profile.tieneBono === null ? null : String(profile.tieneBono)} onSelect={() => setProfile(p => ({ ...p, tieneBono: false }))} title="No" desc="Solo mis ingresos fijos" />
              </OptionGroup>

              <OptionGroup label="¿Esperas capital extra en los próximos 2 años?" icon="💵">
                <OptionCard value="true"  current={profile.tieneCapitalExtra === null ? null : String(profile.tieneCapitalExtra)} onSelect={() => setProfile(p => ({ ...p, tieneCapitalExtra: true }))}  title="Sí" desc="Bono, herencia o venta de activo" />
                <OptionCard value="false" current={profile.tieneCapitalExtra === null ? null : String(profile.tieneCapitalExtra)} onSelect={() => setProfile(p => ({ ...p, tieneCapitalExtra: false }))} title="No" desc="Solo mis ingresos regulares" />
              </OptionGroup>
            </div>
          )}
        </div>

        {/* Navegación */}
        <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid var(--color-borde)' }}>
          {wStep > 0
            ? <button onClick={() => setWStep(w => w - 1)} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}><ArrowLeft size={15} /> Atrás</button>
            : <button onClick={onCancel} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}><X size={15} /> Cancelar</button>
          }
          <button onClick={siguiente} disabled={!pasoValido}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'var(--color-acento)' }}>
            {wStep < PASOS.length - 1 ? 'Continuar →' : '⚡ Generar escenarios'}
          </button>
        </div>
      </div>
    )
  }

  // ── Paso de escenarios ──────────────────────────────────────────────────────

  if (simStep === 'escenarios') {
    const activeScenario = escenarios.find(s => s.id === tabActivo)!
    const activeR        = results.find(r => r.scenario.id === tabActivo)

    return (
      <div className="space-y-5">
        {/* Cabecera */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setSimStep('wizard'); setWStep(PASOS.length - 1) }}
            className="p-2 rounded-xl" style={{ color: 'var(--color-muted)', background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Escenarios</p>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>S/ {M(valorPEN)} · {teaPct}% TEA · {Math.round(plazoMeses / 12)} años</p>
          </div>
        </div>

        {/* Oportunidad de inversión */}
        {esV && vc.inversionesRindeMas && results[0] && (
          <OppCostBanner result={results[0]} tasaInversion={vc.tasaInversion} teaPct={teaPct} />
        )}

        {/* Tabs de escenario */}
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
          {results.map(r => (
            <button key={r.scenario.id} onClick={() => setTabActivo(r.scenario.id)}
              className="flex-1 flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: tabActivo === r.scenario.id ? 'var(--color-card)' : 'transparent', color: tabActivo === r.scenario.id ? 'var(--color-texto)' : 'var(--color-muted)', boxShadow: tabActivo === r.scenario.id ? '0 1px 4px rgba(0,0,0,.12)' : 'none' }}>
              <span className="flex items-center gap-1">
                {r.scenario.id === badgeId && <Star size={9} style={{ color: '#22c55e' }} />}
                Escenario {r.scenario.id.toUpperCase()}
              </span>
              <span className="font-mono text-xs" style={{ color: tabActivo === r.scenario.id ? 'var(--color-acento)' : 'var(--color-muted)' }}>
                S/ {M(esV && vc.incluirSeguros ? r.cuotaRealMensual : r.cuotaMensual)}/mes
              </span>
            </button>
          ))}
        </div>

        {/* Detalle del escenario activo */}
        {activeR && (
          <div className="space-y-4">
            {/* Nombre del escenario */}
            <div className="px-1">
              <p className="text-base font-semibold" style={{ color: 'var(--color-texto)' }}>{activeScenario.label}</p>
              {activeScenario.id === badgeId && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Star size={12} style={{ color: '#22c55e' }} />
                  <span className="text-xs font-medium" style={{ color: '#22c55e' }}>Recomendado para tu perfil</span>
                </div>
              )}
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 gap-2.5">
              <MetCard label={esV && vc.incluirSeguros ? 'Cuota real/mes' : 'Cuota base/mes'}
                value={`S/ ${M(esV && vc.incluirSeguros ? activeR.cuotaRealMensual : activeR.cuotaMensual)}`} accent />
              {esV && vc.esCompartida && (
                <MetCard label={`Mi cuota (${vc.miPorcentaje}%)`} value={`S/ ${M(activeR.miCuotaMedia)}`} color="#22c55e" />
              )}
              <MetCard label="Cuota inicial" value={`S/ ${M(activeR.inicialPEN)}`} />
              <MetCard label="Total intereses" value={`S/ ${M(activeR.totalIntereses)}`} color="#ef4444" />
              <MetCard label="Meses reales" value={`${activeR.mesesReales}`} hint={`${Math.round(activeR.mesesReales / 12)} años`} />
              <MetCard label="Total a pagar" value={`S/ ${M(activeR.totalPagar)}`} />
            </div>

            {/* Diff vs A */}
            {activeScenario.id !== 'a' && results[0] && (
              <DiffRow current={activeR} base={results[0]} esV={esV} vc={esV ? vc : undefined} />
            )}

            {/* Personalizar */}
            <div className="rounded-2xl p-4 space-y-4" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Personalizar</p>

              {/* Gratificaciones */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-texto)' }}>Gratificaciones al plazo</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Pago extra cada 6 meses (CTS + gratificación) — reduce el plazo, cuota igual</p>
                </div>
                <Toggle value={activeScenario.aplicaGratificacion} onChange={v => updateEscenario(activeScenario.id, { aplicaGratificacion: v })} />
              </div>

              {/* Prepagos */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-texto)' }}>Prepagos al principal</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Pagos únicos que reducen el plazo (cuota queda igual)</p>
                </div>
                {activeScenario.prepagos.length > 0 && (
                  <div className="space-y-2">
                    {activeScenario.prepagos.map(pp => (
                      <div key={pp.mes} className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--color-texto)' }}>{pp.label}</p>
                          <p className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>Mes {pp.mes} · S/ {M(pp.monto)}</p>
                        </div>
                        <button onClick={() => updateEscenario(activeScenario.id, { prepagos: activeScenario.prepagos.filter(p => p.mes !== pp.mes) })}
                          className="p-2 rounded-lg shrink-0" style={{ color: '#ef4444', background: '#ef444415' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <PrepagosWizard valorPEN={valorPEN} plazoMeses={plazoMeses}
                  existingMeses={activeScenario.prepagos.map(p => p.mes)}
                  onAdd={pp => updateEscenario(activeScenario.id, { prepagos: [...activeScenario.prepagos, pp] })} />
              </div>
            </div>

            {/* Preview amortización */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Vista previa</p>
                <button onClick={() => { setDetalleId(activeScenario.id); setStep('detalle') }}
                  className="text-xs px-3 py-1.5 rounded-lg" style={{ color: 'var(--color-acento)', border: '1px solid var(--color-acento)' }}>
                  Tabla completa
                </button>
              </div>
              <AmortPreview rows={activeR.rows.slice(0, 5)} esV={esV} vc={esV ? vc : undefined} />
            </div>

            {/* Confirmar */}
            <button onClick={() => confirmarSeleccion(activeR)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-semibold text-white"
              style={{ background: 'var(--color-acento)' }}>
              <Check size={18} /> Usar este escenario
            </button>
          </div>
        )}

        <button onClick={onCancel} className="w-full py-2.5 rounded-xl text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
          Cancelar
        </button>
      </div>
    )
  }

  // ── Tabla completa ─────────────────────────────────────────────────────────

  if (simStep === 'detalle' && detalleResult) {
    const visibles  = showFullTable ? detalleResult.rows : detalleResult.rows.slice(0, 24)
    const conSeguros = esV && vc.incluirSeguros
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSimStep('escenarios'); setShowFullTable(false) }}
            className="p-2 rounded-xl" style={{ color: 'var(--color-muted)', background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Tabla de amortización</p>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{detalleResult.scenario.label}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <MetCard label="Cuota base/mes" value={`S/ ${M(detalleResult.cuotaMensual)}`} />
          {conSeguros && <MetCard label="Cuota real inicial" value={`S/ ${M(detalleResult.rows[0]?.cuotaTotal ?? 0)}`} hint="incl. seguros" accent />}
          {esV && vc.esCompartida && <MetCard label={`Mi cuota (${vc.miPorcentaje}%)`} value={`S/ ${M(detalleResult.miCuotaMedia)}`} color="#22c55e" />}
          <MetCard label="Total intereses" value={`S/ ${M(detalleResult.totalIntereses)}`} color="#ef4444" />
          <MetCard label="Meses reales" value={`${detalleResult.mesesReales}`} hint={`${Math.round(detalleResult.mesesReales / 12)} años`} />
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-borde)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--color-fondo)' }}>
                  {['Mes', 'Cuota', 'Interés', 'Capital', 'Prepago', ...(conSeguros ? ['Real'] : []), 'Saldo'].map(h => (
                    <th key={h} className="px-3 py-3 text-left font-semibold" style={{ color: 'var(--color-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((row, idx) => (
                  <tr key={row.mes} style={{ background: row.esGratificacion ? 'color-mix(in srgb, var(--color-acento) 8%, transparent)' : idx % 2 === 0 ? 'var(--color-card)' : 'transparent' }}>
                    <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--color-muted)' }}>{row.mes}{row.esGratificacion && ' ★'}</td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--color-texto)' }}>{M(row.cuotaBase)}</td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: '#ef4444' }}>{M(row.interes)}</td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--color-texto)' }}>{M(row.capitalAmort)}</td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--color-acento)' }}>{row.prepago > 0 ? M(row.prepago) : '—'}</td>
                    {conSeguros && <td className="px-3 py-2.5 font-mono font-semibold" style={{ color: 'var(--color-texto)' }}>{M(row.cuotaTotal)}</td>}
                    <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--color-muted)' }}>{M(row.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detalleResult.rows.length > 24 && (
            <button onClick={() => setShowFullTable(!showFullTable)}
              className="w-full py-3 text-xs flex items-center justify-center gap-1.5"
              style={{ color: 'var(--color-muted)', borderTop: '1px solid var(--color-borde)' }}>
              {showFullTable ? <><ChevronUp size={12} /> Mostrar menos</> : <><ChevronDown size={12} /> Ver todos los {detalleResult.rows.length} meses</>}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => confirmarSeleccion(detalleResult)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white"
            style={{ background: 'var(--color-acento)' }}>
            <Check size={16} /> Usar este escenario
          </button>
          <button onClick={() => { setSimStep('escenarios'); setShowFullTable(false) }}
            className="px-4 py-3.5 rounded-2xl text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ── Helpers de estado ──────────────────────────────────────────────────────────

function setStep(_step: SimStep) { /* used inline */ }

// ── Sub-componentes ────────────────────────────────────────────────────────────

function WizardProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="space-y-3 pb-4" style={{ borderBottom: '1px solid var(--color-borde)' }}>
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: i < current ? '#22c55e' : i === current ? 'var(--color-acento)' : 'var(--color-fondo)', color: i <= current ? '#fff' : 'var(--color-muted)', border: i > current ? '1px solid var(--color-borde)' : 'none' }}>
                {i < current ? '✓' : i + 1}
              </div>
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

function StepHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <p className="text-lg font-bold" style={{ color: 'var(--color-texto)' }}>{title}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{desc}</p>
    </div>
  )
}

function OptionGroup({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-texto)' }}>
        <span>{icon}</span>{label}
      </p>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  )
}

function OptionCard({ value, current, onSelect, title, desc, badge }: {
  value: string; current: string | null; onSelect: (v: string) => void
  title: string; desc: string; badge?: string
}) {
  const sel = value === current
  return (
    <button onClick={() => onSelect(value)}
      className="flex flex-col items-start gap-1 p-3.5 rounded-2xl text-left relative transition-all"
      style={{ background: sel ? 'color-mix(in srgb, var(--color-acento) 10%, var(--color-card))' : 'var(--color-card)', border: `2px solid ${sel ? 'var(--color-acento)' : 'var(--color-borde)'}` }}>
      <div className="flex items-center justify-between w-full gap-1">
        <span className="text-sm font-semibold" style={{ color: sel ? 'var(--color-acento)' : 'var(--color-texto)' }}>{title}</span>
        {badge && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>{badge}</span>}
      </div>
      <span className="text-xs leading-tight" style={{ color: 'var(--color-muted)' }}>{desc}</span>
      {sel && <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--color-acento)' }}><Check size={10} color="#fff" /></div>}
    </button>
  )
}

function MonedaToggle({ value, onChange }: { value: 'PEN' | 'USD'; onChange: (m: 'PEN' | 'USD') => void }) {
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

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="shrink-0 w-12 h-6 rounded-full relative transition-colors"
      style={{ background: value ? 'var(--color-acento)' : 'var(--color-borde)' }}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: value ? '26px' : '2px' }} />
    </button>
  )
}

function MetCard({ label, value, hint, accent, color }: { label: string; value: string; hint?: string; accent?: boolean; color?: string }) {
  const c = color ?? (accent ? 'var(--color-acento)' : 'var(--color-texto)')
  return (
    <div className="rounded-2xl p-3.5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{label}</p>
      <p className="text-base font-bold font-mono mt-1" style={{ color: c }}>{value}</p>
      {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{hint}</p>}
    </div>
  )
}

function DiffRow({ current, base, esV, vc }: { current: ScenarioResult; base: ScenarioResult; esV: boolean; vc?: ViviendaConfig }) {
  const diffI = current.totalIntereses - base.totalIntereses
  const diffM = current.mesesReales    - base.mesesReales
  const cA    = esV && vc?.incluirSeguros ? base.cuotaRealMensual    : base.cuotaMensual
  const cB    = esV && vc?.incluirSeguros ? current.cuotaRealMensual : current.cuotaMensual
  const diffC = cB - cA
  const Ab    = (n: number) => Math.round(Math.abs(n)).toLocaleString('es-PE')
  const Cl    = (v: number) => v < 0 ? '#22c55e' : '#ef4444'
  return (
    <div className="flex flex-wrap gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
      <span style={{ color: 'var(--color-muted)' }}>vs A:</span>
      {Math.abs(diffC) > 1  && <span className="font-mono font-semibold" style={{ color: Cl(diffC) }}>{diffC > 0 ? '+' : '−'}{Ab(diffC)} S//mes</span>}
      {Math.abs(diffI) > 100 && <span className="font-mono font-semibold" style={{ color: Cl(diffI) }}>{diffI > 0 ? '+' : '−'}{Ab(diffI)} S/ intereses</span>}
      {Math.abs(diffM) > 0  && <span className="font-mono font-semibold" style={{ color: Cl(diffM) }}>{diffM > 0 ? '+' : '−'}{Ab(diffM)} meses</span>}
    </div>
  )
}

function AmortPreview({ rows, esV, vc }: { rows: AmortRow[]; esV: boolean; vc?: ViviendaConfig }) {
  const conSeg = esV && vc?.incluirSeguros
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-borde)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--color-fondo)' }}>
              {['Mes', 'Cuota', 'Interés', 'Capital', ...(conSeg ? ['Real'] : []), 'Saldo'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--color-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.mes} style={{ background: i % 2 === 0 ? 'var(--color-card)' : 'transparent' }}>
                <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--color-muted)' }}>{r.mes}</td>
                <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--color-texto)' }}>{M(r.cuotaBase)}</td>
                <td className="px-3 py-2.5 font-mono" style={{ color: '#ef4444' }}>{M(r.interes)}</td>
                <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--color-texto)' }}>{M(r.capitalAmort)}</td>
                {conSeg && <td className="px-3 py-2.5 font-mono font-semibold" style={{ color: 'var(--color-texto)' }}>{M(r.cuotaTotal)}</td>}
                <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--color-muted)' }}>{M(r.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OppCostBanner({ result, tasaInversion, teaPct }: { result: ScenarioResult; tasaInversion: number; teaPct: number }) {
  const mensual = result.cuotaMensual * 0.1
  const valor   = oppCost(mensual, result.mesesReales, tasaInversion)
  return (
    <div className="rounded-2xl p-4 space-y-2" style={{ background: 'color-mix(in srgb, var(--color-acento) 6%, var(--color-card))', border: '1px solid color-mix(in srgb, var(--color-acento) 25%, transparent)' }}>
      <div className="flex items-center gap-2">
        <TrendingDown size={15} style={{ color: 'var(--color-acento)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--color-acento)' }}>Costo de oportunidad</p>
      </div>
      <p className="text-sm" style={{ color: 'var(--color-texto)' }}>
        Con {tasaInversion}% de retorno vs. {teaPct}% del préstamo, <strong>conviene invertir el excedente en vez de prepagar masivamente.</strong>
      </p>
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        Invertir S/ {M(mensual)}/mes al {tasaInversion}% = <strong style={{ color: '#22c55e' }}>S/ {M(valor)} adicional</strong> al terminar el plazo.
      </p>
    </div>
  )
}

// ── Wizard de prepagos ──────────────────────────────────────────────────────────

type PWStep = 'cuando' | 'cuanto' | 'confirmar'

const PRESETS = [
  { label: 'Mes 6 — 1er CTS',       mes: 6 },
  { label: 'Mes 12 — Fin de año',   mes: 12 },
  { label: 'Mes 18 — Año y medio',  mes: 18 },
  { label: 'Mes 24 — 2 años',       mes: 24 },
  { label: 'Mes 36 — 3 años',       mes: 36 },
  { label: 'Mes específico…',       mes: -1 },
]

function PrepagosWizard({ valorPEN, plazoMeses, existingMeses, onAdd }: {
  valorPEN: number; plazoMeses: number; existingMeses: number[]; onAdd: (p: Prepago) => void
}) {
  const [open, setOpen]           = useState(false)
  const [pw, setPw]               = useState<PWStep>('cuando')
  const [mesPct, setMesPct]       = useState<number | null>(null)
  const [mesCustom, setMesCustom] = useState(12)
  const [montoPct, setMontoPct]   = useState<number | null>(null)
  const [montoFijo, setMontoFijo] = useState(Math.round(valorPEN * 0.05))

  const mesReal   = mesPct === -1 ? mesCustom : (mesPct ?? 0)
  const montoReal = montoPct !== null ? Math.round(valorPEN * montoPct / 100) : montoFijo

  const iStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

  function reset() { setOpen(false); setPw('cuando'); setMesPct(null); setMontoPct(null) }
  function confirm() { onAdd({ mes: mesReal, monto: montoReal, label: PRESETS.find(p => p.mes === mesPct)?.label.split('—')[0].trim() ?? `Prepago mes ${mesReal}` }); reset() }

  if (!open)
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-medium"
        style={{ color: 'var(--color-acento)', border: '1.5px dashed var(--color-acento)', background: 'color-mix(in srgb, var(--color-acento) 5%, transparent)' }}>
        <Plus size={15} /> Agregar prepago
      </button>
    )

  return (
    <div className="rounded-2xl p-4 space-y-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
      {/* Indicador de progreso */}
      <div className="flex items-center gap-2">
        {(['cuando', 'cuanto', 'confirmar'] as PWStep[]).map((s, i) => {
          const done = ['cuando', 'cuanto', 'confirmar'].indexOf(pw) > i
          const act  = s === pw
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: done ? '#22c55e' : act ? 'var(--color-acento)' : 'var(--color-fondo)', color: done || act ? '#fff' : 'var(--color-muted)', border: !done && !act ? '1px solid var(--color-borde)' : 'none' }}>
                  {done ? '✓' : i + 1}
                </div>
                <span className="text-xs hidden sm:inline" style={{ color: act ? 'var(--color-acento)' : 'var(--color-muted)' }}>
                  {s === 'cuando' ? '¿Cuándo?' : s === 'cuanto' ? '¿Cuánto?' : 'Confirmar'}
                </span>
              </div>
              {i < 2 && <div className="flex-1 h-px" style={{ background: done ? '#22c55e' : 'var(--color-borde)' }} />}
            </div>
          )
        })}
      </div>

      {/* Paso 1 */}
      {pw === 'cuando' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>¿En qué mes harás el prepago?</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.filter(p => p.mes === -1 || !existingMeses.includes(p.mes)).map(p => (
              <button key={p.mes}
                onClick={() => { setMesPct(p.mes); if (p.mes !== -1) setPw('cuanto') }}
                className="py-3 px-3 rounded-xl text-sm text-left"
                style={{ background: mesPct === p.mes ? 'color-mix(in srgb, var(--color-acento) 12%, var(--color-fondo))' : 'var(--color-fondo)', border: `1.5px solid ${mesPct === p.mes ? 'var(--color-acento)' : 'var(--color-borde)'}`, color: 'var(--color-texto)' }}>
                {p.label}
              </button>
            ))}
          </div>
          {mesPct === -1 && (
            <div className="flex gap-2 items-center">
              <input type="number" min={1} max={plazoMeses} value={mesCustom}
                onChange={e => setMesCustom(parseInt(e.target.value) || 1)}
                className="w-28 px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={iStyle} />
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>mes {mesCustom}</span>
              <button onClick={() => setPw('cuanto')}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--color-acento)' }}>
                Siguiente →
              </button>
            </div>
          )}
          <button onClick={reset} className="text-xs" style={{ color: 'var(--color-muted)' }}>Cancelar</button>
        </div>
      )}

      {/* Paso 2 */}
      {pw === 'cuanto' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>¿Cuánto monto en el mes {mesReal}?</p>
          <div className="grid grid-cols-3 gap-2">
            {[3, 5, 10].map(pct => (
              <button key={pct} onClick={() => setMontoPct(pct)}
                className="py-3 rounded-xl text-center"
                style={{ background: montoPct === pct ? 'color-mix(in srgb, var(--color-acento) 12%, var(--color-fondo))' : 'var(--color-fondo)', border: `1.5px solid ${montoPct === pct ? 'var(--color-acento)' : 'var(--color-borde)'}`, color: 'var(--color-texto)' }}>
                <span className="block text-sm font-bold">{pct}%</span>
                <span className="block text-xs" style={{ color: 'var(--color-muted)' }}>S/ {M(Math.round(valorPEN * pct / 100))}</span>
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>O ingresa un monto fijo:</p>
            <input type="number" min={0} value={montoFijo}
              onChange={e => { setMontoFijo(parseFloat(e.target.value) || 0); setMontoPct(null) }}
              onClick={() => setMontoPct(null)}
              className="w-full px-4 py-3 rounded-xl text-base outline-none font-mono" style={iStyle} placeholder="S/" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPw('cuando')} className="px-4 py-2.5 rounded-xl text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>← Atrás</button>
            <button onClick={() => setPw('confirmar')} disabled={montoReal <= 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: 'var(--color-acento)' }}>
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Paso 3 */}
      {pw === 'confirmar' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Confirmar prepago</p>
          <div className="rounded-xl p-4 space-y-2.5" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Mes del prepago</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Mes {mesReal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Monto al principal</span>
              <span className="text-sm font-bold font-mono" style={{ color: 'var(--color-acento)' }}>S/ {M(montoReal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Estrategia</span>
              <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>Reduce el plazo</span>
            </div>
          </div>
          <div className="rounded-xl px-3 py-2.5 flex items-start gap-2" style={{ background: 'color-mix(in srgb, #22c55e 8%, var(--color-fondo))', border: '1px solid #22c55e33' }}>
            <Info size={13} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Al aplicarse en el mes {mesReal} la cuota se mantiene igual pero terminas el préstamo antes, pagando menos intereses en total.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPw('cuanto')} className="px-4 py-3 rounded-xl text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>← Atrás</button>
            <button onClick={confirm}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--color-acento)' }}>
              <Check size={15} /> Agregar prepago
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
