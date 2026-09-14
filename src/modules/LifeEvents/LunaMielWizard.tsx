import { useState, useEffect } from 'react'
import { Check, X, ArrowLeft, ChevronRight, RefreshCw, Sparkles } from 'lucide-react'
import type { EventoVida, GeneralParams } from '../../data/types'
import { useTipoCambio } from '../../hooks/useTipoCambio'

// ── Helpers ───────────────────────────────────────────────────────────────────

function anioTToCalendario(t: number, anioActual: number) { return anioActual + t }
function anioTToEdad(t: number, edadActual: number) { return edadActual + t }
function calendarioToAnioT(year: number, anioActual: number) { return Math.max(1, year - anioActual) }
function fmt(n: number) { return n.toLocaleString('es-PE', { maximumFractionDigits: 0 }) }

const MESES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ── Tipos de destino ──────────────────────────────────────────────────────────

type TipoDestino = 'nacional' | 'latam' | 'internacional' | 'largo_radio'
type CategoriaHotel = 'tres' | 'cuatro' | 'cinco' | 'all_inclusive'
type WizardStep = 'destino' | 'presupuesto'

interface DestinoConfig {
  label: string
  flag: string
  placeholder: string
  vuelosUSD: number
  hotelNocheUSD: number
  gastosDiaUSD: number
}

const DESTINO_CONFIG: Record<TipoDestino, DestinoConfig> = {
  nacional:      { label: 'Nacional',    flag: '🇵🇪', placeholder: 'Ej: Cusco, Paracas',        vuelosUSD: 80,   hotelNocheUSD: 60,  gastosDiaUSD: 40  },
  latam:         { label: 'LATAM',       flag: '🌎', placeholder: 'Ej: Cartagena, Buenos Aires', vuelosUSD: 600,  hotelNocheUSD: 120, gastosDiaUSD: 80  },
  internacional: { label: 'Internacional', flag: '🌍', placeholder: 'Ej: España, México, Grecia', vuelosUSD: 1800, hotelNocheUSD: 180, gastosDiaUSD: 120 },
  largo_radio:   { label: 'Largo radio', flag: '✈️', placeholder: 'Ej: Japón, Tailandia, Maldivas', vuelosUSD: 3500, hotelNocheUSD: 250, gastosDiaUSD: 160 },
}

const HOTEL_LABELS: Record<CategoriaHotel, string> = {
  tres: '3★ Estándar',
  cuatro: '4★ Superior',
  cinco: '5★ / Boutique',
  all_inclusive: 'All Inclusive',
}

const HOTEL_MULTIPLIER: Record<CategoriaHotel, number> = {
  tres: 0.6,
  cuatro: 1.0,
  cinco: 1.8,
  all_inclusive: 1.4,
}

// ── Estado ────────────────────────────────────────────────────────────────────

interface LunaMielState {
  tipoDestino: TipoDestino
  destinoTexto: string
  noches: number
  mesCalendario: number
  anioCalendario: number
  mesReserva: number
  anioReserva: number
  categoriaHotel: CategoriaHotel
  vuelos: number        // PEN
  hotel: number         // PEN
  gastos: number        // PEN
  bufferPct: number
  tuPorcentaje: number
}

function reservaDefault(mesViaje: number, anioViaje: number): { mes: number; anio: number } {
  let mes = mesViaje - 3
  let anio = anioViaje
  if (mes <= 0) { mes += 12; anio -= 1 }
  return { mes, anio }
}

function calcDefaults(tipo: TipoDestino, noches: number, hotel: CategoriaHotel, tc: number): Pick<LunaMielState, 'vuelos' | 'hotel' | 'gastos'> {
  const cfg = DESTINO_CONFIG[tipo]
  const mult = HOTEL_MULTIPLIER[hotel]
  return {
    vuelos: Math.round(cfg.vuelosUSD * 2 * tc),          // 2 personas ida+vuelta
    hotel: Math.round(cfg.hotelNocheUSD * mult * noches * tc),
    gastos: Math.round(cfg.gastosDiaUSD * (noches + 1) * tc),
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

export function LunaMielWizard({
  general,
  onConfirm,
  onCancel,
}: {
  general: GeneralParams
  onConfirm: (eventos: Omit<EventoVida, 'id'>[]) => void
  onCancel: () => void
}) {
  const anioDefault = general.anioActual + 2
  const mesDefault = new Date().getMonth() + 1
  const reserva = reservaDefault(mesDefault, anioDefault)

  const [step, setStep] = useState<WizardStep>('destino')
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>('USD')
  const [cotizando, setCotizando] = useState(false)
  const [cotizadoPorIA, setCotizadoPorIA] = useState(false)
  const [cotizacionNota, setCotizacionNota] = useState<string | null>(null)
  const [cotizacionError, setCotizacionError] = useState<string | null>(null)

  const { tc: tcData, loading: tcLoading, error: tcError, actualizar: actualizarTC } = useTipoCambio()
  useEffect(() => { if (!tcData) actualizarTC() }, [])
  const tcCompra = tcData?.compra ?? 3.75

  const [s, setS] = useState<LunaMielState>(() => {
    const tipo: TipoDestino = 'internacional'
    const hotel: CategoriaHotel = 'cuatro'
    const noches = 7
    const defs = calcDefaults(tipo, noches, hotel, 3.75)
    return {
      tipoDestino: tipo,
      destinoTexto: '',
      noches,
      mesCalendario: mesDefault,
      anioCalendario: anioDefault,
      mesReserva: reserva.mes,
      anioReserva: reserva.anio,
      categoriaHotel: hotel,
      ...defs,
      bufferPct: 10,
      tuPorcentaje: 100,
    }
  })

  const inputStyle = {
    background: 'var(--color-fondo)',
    color: 'var(--color-texto)',
    border: '1px solid var(--color-borde)',
  }

  // Recalcula defaults al cambiar tipo/hotel/noches (solo si no hay cotización IA)
  function actualizarDefaults(patch: Partial<LunaMielState>) {
    setS(prev => {
      const next = { ...prev, ...patch }
      if (!cotizadoPorIA) {
        const defs = calcDefaults(next.tipoDestino, next.noches, next.categoriaHotel, tcCompra)
        return { ...next, ...defs }
      }
      return next
    })
    setCotizadoPorIA(false)
    setCotizacionNota(null)
  }

  function setDestinoTipo(tipo: TipoDestino) {
    const defs = calcDefaults(tipo, s.noches, s.categoriaHotel, tcCompra)
    setS(prev => ({ ...prev, tipoDestino: tipo, destinoTexto: '', ...defs }))
    setCotizadoPorIA(false)
    setCotizacionNota(null)
  }

  // ── Conversión PEN ↔ moneda display ───────────────────────────────────────
  function penToDisplay(pen: number): number {
    return moneda === 'USD' ? Math.round((pen / tcCompra) * 10) / 10 : pen
  }
  function displayToPen(val: number): number {
    return moneda === 'USD' ? Math.round(val * tcCompra) : val
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const subtotal = s.vuelos + s.hotel + s.gastos
  const buffer = Math.round(subtotal * s.bufferPct / 100)
  const total = subtotal + buffer
  const tuTotal = Math.round(total * s.tuPorcentaje / 100)
  const tuReservas = Math.round((s.vuelos + s.hotel) * s.tuPorcentaje / 100)
  const tuGastos = tuTotal - tuReservas

  const anioTViaje = calendarioToAnioT(s.anioCalendario, general.anioActual)
  const anioTReserva = calendarioToAnioT(s.anioReserva, general.anioActual)
  const edadViaje = anioTToEdad(anioTViaje, general.edadActual)

  // ── Cotizar con IA ────────────────────────────────────────────────────────
  async function cotizarConIA() {
    setCotizando(true)
    setCotizacionError(null)
    const destino = s.destinoTexto || DESTINO_CONFIG[s.tipoDestino].placeholder
    const systemPrompt = `Travel cost estimator for honeymoon trips from Lima, Peru. Return ONLY raw JSON — no markdown, no explanation.\nSchema: {"vuelos":{"min":number,"max":number},"hotel":{"min":number,"max":number},"gastos_destino":{"min":number,"max":number},"total":{"min":number,"max":number},"nota":"string max 90 chars in Spanish"}`
    const userMsg = `Honeymoon: ${destino} | ${MESES_NOMBRES[s.mesCalendario - 1]} ${s.anioCalendario} | ${s.noches} nights | 2 travelers | hotel: ${HOTEL_LABELS[s.categoriaHotel]}`
    try {
      const res = await fetch('/api/cotizar-viaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMsg }],
        }),
      })
      const data = await res.json()
      const text: string = data.content?.[0]?.text ?? ''
      const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      const parsed = JSON.parse(cleaned)

      const mid = (a: number, b: number) => Math.round((a + b) / 2)
      setS(prev => ({
        ...prev,
        vuelos: Math.round(mid(parsed.vuelos.min, parsed.vuelos.max) * tcCompra),
        hotel: Math.round(mid(parsed.hotel.min, parsed.hotel.max) * tcCompra),
        gastos: Math.round(mid(parsed.gastos_destino.min, parsed.gastos_destino.max) * tcCompra),
      }))
      setCotizadoPorIA(true)
      setCotizacionNota(parsed.nota ?? null)
      setStep('presupuesto')
    } catch (err) {
      console.error('[LunaMiel] cotizarConIA error:', err)
      setCotizacionError('No se pudo obtener cotización. Ajusta los valores manualmente.')
    } finally {
      setCotizando(false)
    }
  }

  // ── Confirmar ─────────────────────────────────────────────────────────────
  function confirm() {
    const pctLabel = s.tuPorcentaje < 100 ? ` (${s.tuPorcentaje}%)` : ''
    const proporcionPropia = s.tuPorcentaje < 100 ? s.tuPorcentaje : undefined
    const eventos: Omit<EventoVida, 'id'>[] = []

    if (tuReservas > 0) {
      eventos.push({
        nombre: `Luna de Miel – Vuelos + hotel${pctLabel}`,
        tipoEvento: 'luna_miel',
        retiroUnico: { anioT: anioTReserva, mes: s.mesReserva, monto: tuReservas },
        ...(proporcionPropia !== undefined && { proporcionPropia }),
      })
    }

    if (tuGastos > 0) {
      eventos.push({
        nombre: `Luna de Miel – Gastos en destino${pctLabel}`,
        tipoEvento: 'luna_miel',
        retiroUnico: { anioT: anioTViaje, mes: s.mesCalendario, monto: tuGastos },
        ...(proporcionPropia !== undefined && { proporcionPropia }),
      })
    }

    onConfirm(eventos)
  }

  const canConfirm = tuTotal > 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Steps header */}
      <div className="flex items-center gap-2">
        {step === 'presupuesto' && (
          <button onClick={() => setStep('destino')} className="p-1 hover:opacity-70" style={{ color: 'var(--color-muted)' }}>
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>
          {(['destino', 'presupuesto'] as WizardStep[]).map((st, i) => (
            <span key={st} className="flex items-center gap-1.5">
              {i > 0 && <span>›</span>}
              <span style={{
                color: step === st ? 'var(--color-acento)' : 'var(--color-muted)',
                fontWeight: step === st ? 600 : 400,
              }}>
                {i + 1}. {st === 'destino' ? 'Destino y fechas' : 'Presupuesto'}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Paso 1: Destino y fechas ── */}
      {step === 'destino' && (
        <div className="space-y-4">

          {/* Selector de tipo destino */}
          <div>
            <label className="text-xs mb-2 block font-medium" style={{ color: 'var(--color-muted)' }}>Tipo de destino</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(DESTINO_CONFIG) as [TipoDestino, DestinoConfig][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setDestinoTipo(key)}
                  className="px-3 py-2.5 rounded-lg text-xs font-medium text-left"
                  style={{
                    background: s.tipoDestino === key ? 'var(--color-acento)' : 'var(--color-fondo)',
                    color: s.tipoDestino === key ? '#fff' : 'var(--color-muted)',
                    border: `1px solid ${s.tipoDestino === key ? 'var(--color-acento)' : 'var(--color-borde)'}`,
                  }}
                >
                  <span className="mr-1.5">{cfg.flag}</span>{cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Destino texto + noches */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>
                Destino específico <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                type="text"
                value={s.destinoTexto}
                onChange={e => setS(prev => ({ ...prev, destinoTexto: e.target.value }))}
                placeholder={DESTINO_CONFIG[s.tipoDestino].placeholder}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Mejora la cotización IA</p>
            </div>
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>Noches</label>
              <input
                type="number" min={1} max={60}
                value={s.noches}
                onChange={e => actualizarDefaults({ noches: parseInt(e.target.value) || 7 })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Fecha del viaje + reserva */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>Fecha del viaje</label>
              <div className="flex gap-2">
                <select
                  value={s.mesCalendario}
                  onChange={e => {
                    const mes = parseInt(e.target.value)
                    const rv = reservaDefault(mes, s.anioCalendario)
                    setS(prev => ({ ...prev, mesCalendario: mes, mesReserva: rv.mes, anioReserva: rv.anio }))
                  }}
                  className="flex-1 px-2 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                >
                  {MESES_NOMBRES.map((m, i) => <option key={i + 1} value={i + 1}>{m.slice(0, 3)}</option>)}
                </select>
                <input
                  type="number" min={general.anioActual + 1} max={general.anioActual + 15}
                  value={s.anioCalendario}
                  onChange={e => {
                    const anio = parseInt(e.target.value) || anioDefault
                    const rv = reservaDefault(s.mesCalendario, anio)
                    setS(prev => ({ ...prev, anioCalendario: anio, mesReserva: rv.mes, anioReserva: rv.anio }))
                  }}
                  className="w-20 px-2 py-2 rounded-lg text-sm outline-none font-mono"
                  style={inputStyle}
                />
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-acento)' }}>
                Tendrás {edadViaje} años
              </p>
            </div>
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>
                Mes de reservas <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(vuelos/hotel)</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={s.mesReserva}
                  onChange={e => setS(prev => ({ ...prev, mesReserva: parseInt(e.target.value) }))}
                  className="flex-1 px-2 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                >
                  {MESES_NOMBRES.map((m, i) => <option key={i + 1} value={i + 1}>{m.slice(0, 3)}</option>)}
                </select>
                <input
                  type="number" min={general.anioActual} max={general.anioActual + 15}
                  value={s.anioReserva}
                  onChange={e => setS(prev => ({ ...prev, anioReserva: parseInt(e.target.value) || s.anioCalendario }))}
                  className="w-20 px-2 py-2 rounded-lg text-sm outline-none font-mono"
                  style={inputStyle}
                />
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Auto: 3 meses antes</p>
            </div>
          </div>

          {/* Categoría de hotel */}
          <div>
            <label className="text-xs mb-2 block font-medium" style={{ color: 'var(--color-muted)' }}>Categoría de alojamiento</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(HOTEL_LABELS) as [CategoriaHotel, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => actualizarDefaults({ categoriaHotel: key })}
                  className="px-3 py-2 rounded-lg text-xs font-medium"
                  style={{
                    background: s.categoriaHotel === key ? 'color-mix(in srgb, var(--color-acento) 15%, transparent)' : 'var(--color-fondo)',
                    color: s.categoriaHotel === key ? 'var(--color-acento)' : 'var(--color-muted)',
                    border: `1px solid ${s.categoriaHotel === key ? 'var(--color-acento)' : 'var(--color-borde)'}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Botón Cotizar con IA */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-texto)' }}>
                  ✨ Cotizar con IA
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  Haiku estima vuelos, hotel y gastos según tu destino y fechas. Puedes ajustar después.
                </p>
              </div>
              <button
                onClick={cotizarConIA}
                disabled={cotizando}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: 'var(--color-acento)', color: '#fff' }}
              >
                {cotizando
                  ? <><RefreshCw size={12} className="animate-spin" /> Cotizando…</>
                  : <><Sparkles size={12} /> Cotizar</>
                }
              </button>
            </div>
            {cotizacionError && (
              <p className="text-xs" style={{ color: '#E24C4C' }}>{cotizacionError}</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setStep('presupuesto')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--color-acento)' }}
            >
              Continuar <ChevronRight size={14} />
            </button>
            <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 2: Presupuesto ── */}
      {step === 'presupuesto' && (
        <div className="space-y-4">

          {/* Header con moneda + TC */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--color-texto)' }}>
                {DESTINO_CONFIG[s.tipoDestino].flag} {s.destinoTexto || DESTINO_CONFIG[s.tipoDestino].label} · {s.noches} noches · {MESES_NOMBRES[s.mesCalendario - 1]} {s.anioCalendario}
              </p>
              {cotizadoPorIA && cotizacionNota && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-acento)' }}>
                  ✨ {cotizacionNota}
                </p>
              )}
              {cotizadoPorIA && !cotizacionNota && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-acento)' }}>
                  ✨ Estimado por IA · Ajusta si lo necesitas
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                TC: {tcLoading ? '…' : tcError
                  ? <span style={{ color: '#E24C4C' }}>sin TC</span>
                  : <strong style={{ color: 'var(--color-acento)' }}>S/ {tcCompra.toFixed(3)}</strong>
                }
              </span>
              <button onClick={() => actualizarTC(true)} className="p-0.5 hover:opacity-70" style={{ color: 'var(--color-muted)' }}>
                <RefreshCw size={11} className={tcLoading ? 'animate-spin' : ''} />
              </button>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-borde)' }}>
                {(['PEN', 'USD'] as const).map(m => (
                  <button key={m} onClick={() => setMoneda(m)} className="px-2.5 py-1 text-xs font-semibold"
                    style={{ background: moneda === m ? 'var(--color-acento)' : 'var(--color-fondo)', color: moneda === m ? '#fff' : 'var(--color-muted)' }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Categorías */}
          <div className="space-y-3">
            {([
              { key: 'vuelos' as const, label: 'Vuelos (2 personas, ida y vuelta)', sub: 'Se pagan al reservar' },
              { key: 'hotel' as const, label: `Hotel · ${s.noches} noches · ${HOTEL_LABELS[s.categoriaHotel]}`, sub: 'Se pagan al reservar' },
              { key: 'gastos' as const, label: 'Gastos en destino', sub: 'Comidas, actividades, transporte local' },
            ]).map(({ key, label, sub }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: 'var(--color-texto)' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{sub}</p>
                </div>
                <input
                  type="number" min={0}
                  value={moneda === 'USD' ? penToDisplay(s[key]) : s[key]}
                  step={moneda === 'USD' ? 50 : 200}
                  onChange={e => setS(prev => ({ ...prev, [key]: displayToPen(parseFloat(e.target.value) || 0) }))}
                  className="w-32 px-3 py-2 rounded-lg text-sm outline-none font-mono text-right shrink-0"
                  style={inputStyle}
                />
              </div>
            ))}

            {/* Buffer */}
            <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid var(--color-borde)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: 'var(--color-texto)' }}>Buffer / imprevistos</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input type="number" min={0} max={30}
                  value={s.bufferPct}
                  onChange={e => setS(prev => ({ ...prev, bufferPct: parseFloat(e.target.value) || 0 }))}
                  className="w-16 px-2 py-2 rounded-lg text-sm outline-none font-mono text-right"
                  style={inputStyle}
                />
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>%</span>
                <span className="text-xs w-28 text-right font-mono" style={{ color: 'var(--color-muted)' }}>
                  {moneda === 'USD' ? `$ ${fmt(Math.round(buffer / tcCompra))}` : `S/ ${fmt(buffer)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="rounded-xl p-4" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Total estimado</p>
                {moneda === 'USD' && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>S/ {fmt(total)}</p>
                )}
              </div>
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--color-acento)' }}>
                {moneda === 'USD' ? `$ ${fmt(Math.round(total / tcCompra))}` : `S/ ${fmt(total)}`}
              </p>
            </div>
          </div>

          {/* Split */}
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-texto)' }}>¿Cuánto pagas tú?</p>
              <span className="text-lg font-bold font-mono" style={{ color: 'var(--color-acento)' }}>{s.tuPorcentaje}%</span>
            </div>
            <input type="range" min={10} max={100} step={5} value={s.tuPorcentaje}
              onChange={e => setS(prev => ({ ...prev, tuPorcentaje: parseInt(e.target.value) }))}
              className="w-full accent-[var(--color-acento)]" />
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
              <span>Tú: {s.tuPorcentaje}% = {moneda === 'USD' ? `$ ${fmt(Math.round(tuTotal / tcCompra))}` : `S/ ${fmt(tuTotal)}`}</span>
              {s.tuPorcentaje < 100 && <span>Pareja: {100 - s.tuPorcentaje}% = {moneda === 'USD' ? `$ ${fmt(Math.round((total - tuTotal) / tcCompra))}` : `S/ ${fmt(total - tuTotal)}`}</span>}
            </div>
          </div>

          {/* Resumen de eventos */}
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-acento)' }}>Se crearán 2 entradas en el escenario</p>
            {tuReservas > 0 && (
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                🌙 Reservas (vuelos + hotel): {moneda === 'USD' ? `$ ${fmt(Math.round(tuReservas / tcCompra))}` : `S/ ${fmt(tuReservas)}`} · {MESES_NOMBRES[s.mesReserva - 1]} {s.anioReserva}
                {' '}({anioTToEdad(anioTReserva, general.edadActual)} años)
              </p>
            )}
            {tuGastos > 0 && (
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                🌙 Gastos en destino: {moneda === 'USD' ? `$ ${fmt(Math.round(tuGastos / tcCompra))}` : `S/ ${fmt(tuGastos)}`} · {MESES_NOMBRES[s.mesCalendario - 1]} {s.anioCalendario}
                {' '}({edadViaje} años)
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={confirm}
              disabled={!canConfirm}
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
      )}
    </div>
  )
}
