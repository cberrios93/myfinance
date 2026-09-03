import { useState, useMemo, useEffect } from 'react'
import { Check, X, ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react'
import type { EventoVida, GeneralParams } from '../../data/types'
import { useTipoCambio } from '../../hooks/useTipoCambio'

// ── Helpers ───────────────────────────────────────────────────────────────────

function anioTToEdad(t: number, edadActual: number) { return edadActual + t }
function anioTToCalendario(t: number, anioActual: number) { return anioActual + t }
function calendarioToAnioT(year: number, anioActual: number) { return Math.max(1, year - anioActual) }
function fmt(n: number) { return n.toLocaleString('es-PE', { maximumFractionDigits: 0 }) }

// ── Rangos estimados por escala ───────────────────────────────────────────────

type Escala = 'intima' | 'estandar' | 'grande' | 'gran'

interface RangoCategoria {
  venueyCatering: number
  fotoYVideo: number
  ceremoniaDecoMusica: number
  vestimentaYLogistica: number
}

const RANGOS: Record<Escala, RangoCategoria> = {
  intima:    { venueyCatering: 8_000,  fotoYVideo: 3_000, ceremoniaDecoMusica: 2_500, vestimentaYLogistica: 3_000 },
  estandar:  { venueyCatering: 25_000, fotoYVideo: 5_000, ceremoniaDecoMusica: 6_000, vestimentaYLogistica: 6_000 },
  grande:    { venueyCatering: 55_000, fotoYVideo: 8_000, ceremoniaDecoMusica: 12_000, vestimentaYLogistica: 9_000 },
  gran:      { venueyCatering: 90_000, fotoYVideo: 12_000, ceremoniaDecoMusica: 20_000, vestimentaYLogistica: 14_000 },
}

function escalaDeInvitados(n: number): Escala {
  if (n <= 30)  return 'intima'
  if (n <= 80)  return 'estandar'
  if (n <= 150) return 'grande'
  return 'gran'
}

// ── Estado del wizard ─────────────────────────────────────────────────────────

interface MatrimonioState {
  anioCalendario: number
  numInvitados: number
  venueyCatering: number
  fotoYVideo: number
  ceremoniaDecoMusica: number
  vestimentaYLogistica: number
  bufferPct: number
  ahorroActual: number
  aportesExternos: number
  mesesPreparacion: number
  pctAdelantos: number
}

type WizardStep = 'base' | 'categorias' | 'financiamiento'

// ── Componente ────────────────────────────────────────────────────────────────

export function MatrimonioWizard({
  general,
  onConfirm,
  onCancel,
}: {
  general: GeneralParams
  onConfirm: (eventos: Omit<EventoVida, 'id'>[]) => void
  onCancel: () => void
}) {
  const anioDefault = general.anioActual + 2
  const escalaDefault = escalaDeInvitados(80)
  const rangosDefault = RANGOS[escalaDefault]

  const [step, setStep] = useState<WizardStep>('base')
  const [s, setS] = useState<MatrimonioState>({
    anioCalendario: anioDefault,
    numInvitados: 80,
    ...rangosDefault,
    bufferPct: 10,
    ahorroActual: 0,
    aportesExternos: 0,
    mesesPreparacion: 12,
    pctAdelantos: 35,
  })
  const [totalEditando, setTotalEditando] = useState<string | null>(null)
  const [ajustadoPorTotal, setAjustadoPorTotal] = useState(false)
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>('PEN')

  const { tc: tcData, loading: tcLoading, error: tcError, actualizar: actualizarTC } = useTipoCambio()
  useEffect(() => { if (!tcData) actualizarTC() }, [])
  const tcCompra = tcData?.compra ?? 3.75

  const inputStyle = {
    background: 'var(--color-fondo)',
    color: 'var(--color-texto)',
    border: '1px solid var(--color-borde)',
  }

  const subtotal = s.venueyCatering + s.fotoYVideo + s.ceremoniaDecoMusica + s.vestimentaYLogistica
  const buffer = Math.round(subtotal * s.bufferPct / 100)
  const totalBoda = subtotal + buffer

  // Conversión PEN ↔ USD para inputs de categorías
  function penToDisplay(pen: number): number {
    return moneda === 'USD' ? Math.round((pen / tcCompra) * 100) / 100 : pen
  }
  function displayToPen(val: number): number {
    return moneda === 'USD' ? Math.round(val * tcCompra) : val
  }

  function setCategoriaFromDisplay(key: keyof MatrimonioState, val: number) {
    setAjustadoPorTotal(false)
    setS(prev => ({ ...prev, [key]: displayToPen(val) }))
  }

  function setCategoriaFromPct(key: keyof MatrimonioState, pctNuevo: number) {
    if (subtotal <= 0) return
    const nuevoMonto = Math.round(subtotal * pctNuevo / 100)
    setAjustadoPorTotal(false)
    setS(prev => ({ ...prev, [key]: nuevoMonto }))
  }

  function redistribuirDesdeTotal(totalObjetivo: number) {
    const totalObjetivoPEN = moneda === 'USD' ? Math.round(totalObjetivo * tcCompra) : totalObjetivo
    if (totalObjetivoPEN <= 0 || subtotal <= 0) return
    const nuevoSubtotal = totalObjetivoPEN / (1 + s.bufferPct / 100)
    const factor = nuevoSubtotal / subtotal
    setS(prev => ({
      ...prev,
      venueyCatering: Math.round(prev.venueyCatering * factor),
      fotoYVideo: Math.round(prev.fotoYVideo * factor),
      ceremoniaDecoMusica: Math.round(prev.ceremoniaDecoMusica * factor),
      vestimentaYLogistica: Math.round(prev.vestimentaYLogistica * factor),
    }))
    setAjustadoPorTotal(true)
  }

  function resetearEstimados() {
    const escala = escalaDeInvitados(s.numInvitados)
    setS(prev => ({ ...prev, ...RANGOS[escala] }))
    setAjustadoPorTotal(false)
  }

  const anioT = calendarioToAnioT(s.anioCalendario, general.anioActual)
  const edad = anioTToEdad(anioT, general.edadActual)

  const resultado = useMemo(() => {
    const montoAdelantos = Math.round(totalBoda * s.pctAdelantos / 100)
    const montoFinal = totalBoda - montoAdelantos
    const montoMensual = s.mesesPreparacion > 0 ? Math.round(montoAdelantos / s.mesesPreparacion) : 0

    const aniosPrep = Math.ceil(s.mesesPreparacion / 12)
    const anioInicioT = Math.max(1, anioT - aniosPrep)

    const falta = Math.max(0, totalBoda - s.ahorroActual - s.aportesExternos)
    const mesesHastaBoda = Math.max(1, (s.anioCalendario - general.anioActual) * 12)
    const ahorroMensualRequerido = falta > 0 ? Math.ceil(falta / mesesHastaBoda) : 0

    return {
      montoAdelantos,
      montoFinal,
      montoMensual,
      anioInicioT,
      falta,
      ahorroMensualRequerido,
    }
  }, [totalBoda, s.pctAdelantos, s.mesesPreparacion, anioT, s.ahorroActual, s.aportesExternos, s.anioCalendario, general.anioActual])

  function applyEscala(invitados: number) {
    const escala = escalaDeInvitados(invitados)
    const rangos = RANGOS[escala]
    setS(prev => ({ ...prev, numInvitados: invitados, ...rangos }))
  }

  function confirm() {
    const eventos: Omit<EventoVida, 'id'>[] = []

    if (resultado.montoMensual > 0 && resultado.anioInicioT < anioT) {
      eventos.push({
        nombre: 'Matrimonio – Adelantos y separatas',
        tipoEvento: 'matrimonio',
        gastoRecurrente: {
          anioInicioT: resultado.anioInicioT,
          anioFinT: anioT,
          montoMensual: resultado.montoMensual,
        },
      })
    }

    if (resultado.montoFinal > 0) {
      eventos.push({
        nombre: 'Matrimonio – Pago final',
        tipoEvento: 'matrimonio',
        retiroUnico: {
          anioT,
          monto: resultado.montoFinal,
        },
      })
    }

    onConfirm(eventos)
  }

  const escalaActual = escalaDeInvitados(s.numInvitados)
  const ESCALA_LABELS: Record<Escala, string> = {
    intima: 'Íntima (≤30)',
    estandar: 'Estándar (31–80)',
    grande: 'Grande (81–150)',
    gran: 'Gran boda (151+)',
  }

  return (
    <div className="space-y-5">
      {/* Header de pasos */}
      <div className="flex items-center gap-2">
        {step !== 'base' && (
          <button
            onClick={() => setStep(step === 'financiamiento' ? 'categorias' : 'base')}
            className="p-1 hover:opacity-70"
            style={{ color: 'var(--color-muted)' }}
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>
          {(['base', 'categorias', 'financiamiento'] as WizardStep[]).map((st, i) => (
            <span key={st} className="flex items-center gap-1.5">
              {i > 0 && <span>›</span>}
              <span
                style={{
                  color: step === st ? 'var(--color-acento)' : 'var(--color-muted)',
                  fontWeight: step === st ? 600 : 400,
                }}
              >
                {i + 1}. {st === 'base' ? 'Datos base' : st === 'categorias' ? 'Estimación' : 'Financiamiento'}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Paso 1: Datos base ── */}
      {step === 'base' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>
                Año de la boda
              </label>
              <input
                type="number"
                min={general.anioActual + 1}
                max={general.anioActual + 20}
                value={s.anioCalendario}
                onChange={e => setS(prev => ({ ...prev, anioCalendario: parseInt(e.target.value) || anioDefault }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                style={inputStyle}
              />
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-acento)' }}>
                Tendrás {edad} años
              </p>
            </div>
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>
                Número de invitados
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={s.numInvitados}
                onChange={e => applyEscala(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                style={inputStyle}
              />
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                Escala: <strong style={{ color: 'var(--color-acento)' }}>{ESCALA_LABELS[escalaActual]}</strong>
              </p>
            </div>
          </div>

          {/* Selector de escala rápida */}
          <div>
            <p className="text-xs mb-2 font-medium" style={{ color: 'var(--color-muted)' }}>
              O elige una escala directamente
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.entries(ESCALA_LABELS) as [Escala, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    const ref = { intima: 20, estandar: 60, grande: 100, gran: 200 }
                    applyEscala(ref[key])
                  }}
                  className="px-2 py-2 rounded-lg text-xs font-medium text-left"
                  style={{
                    background: escalaActual === key ? 'var(--color-acento)' : 'var(--color-fondo)',
                    color: escalaActual === key ? '#fff' : 'var(--color-muted)',
                    border: `1px solid ${escalaActual === key ? 'var(--color-acento)' : 'var(--color-borde)'}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setStep('categorias')}
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

      {/* ── Paso 2: Categorías ── */}
      {step === 'categorias' && (
        <div className="space-y-4">
          {/* Header con escala + toggle moneda */}
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Estimados para boda <strong>{ESCALA_LABELS[escalaActual]}</strong> en Lima. Ajusta según tu plan real.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {/* Badge TC */}
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                TC:{' '}
                {tcLoading
                  ? '…'
                  : tcError
                    ? <span style={{ color: '#ef4444' }}>sin TC</span>
                    : <strong style={{ color: 'var(--color-acento)' }}>S/ {tcCompra.toFixed(3)}</strong>
                }
              </span>
              <button onClick={() => actualizarTC(true)} className="p-0.5 hover:opacity-70" style={{ color: 'var(--color-muted)' }} title="Actualizar TC">
                <RefreshCw size={11} className={tcLoading ? 'animate-spin' : ''} />
              </button>
              {/* Toggle PEN/USD */}
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

          {/* Cabecera de columnas */}
          <div className="flex items-center gap-2 pb-1" style={{ borderBottom: '1px solid var(--color-borde)' }}>
            <div className="flex-1" />
            <span className="text-xs font-medium w-16 text-right shrink-0" style={{ color: 'var(--color-muted)' }}>%</span>
            <span className="text-xs font-medium w-28 text-right shrink-0" style={{ color: 'var(--color-muted)' }}>{moneda === 'USD' ? 'USD' : 'S/'}</span>
          </div>

          <div className="space-y-3">
            {([
              { key: 'venueyCatering', label: 'Venue + catering + bebidas', ref: '40–50%' },
              { key: 'fotoYVideo', label: 'Fotografía + video', ref: '10–15%' },
              { key: 'ceremoniaDecoMusica', label: 'Ceremonia + decoración + música', ref: '8–12%' },
              { key: 'vestimentaYLogistica', label: 'Vestimenta + belleza + papelería + logística', ref: '5–8%' },
            ] as { key: keyof MatrimonioState; label: string; ref: string }[]).map(({ key, label, ref }) => {
              const montoActual = s[key] as number
              const pctActual = subtotal > 0 ? Math.round((montoActual / subtotal) * 100) : 0
              const displayVal = penToDisplay(montoActual)
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-texto)' }}>{label}</p>
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Ref: {ref}
                      {ajustadoPorTotal && (
                        <span className="ml-1.5 px-1 rounded" style={{ background: 'var(--color-acento)', color: '#fff', fontSize: '0.6rem', opacity: 0.75 }}>ajustado</span>
                      )}
                    </p>
                  </div>
                  {/* % editable */}
                  <div className="shrink-0 flex items-center gap-0.5">
                    <input
                      type="number" min={0} max={100}
                      value={pctActual}
                      onChange={e => setCategoriaFromPct(key, parseFloat(e.target.value) || 0)}
                      className="w-14 px-2 py-1.5 rounded-lg text-xs outline-none font-mono text-right"
                      style={inputStyle}
                    />
                    <span className="text-xs" style={{ color: 'var(--color-muted)' }}>%</span>
                  </div>
                  {/* Monto editable en moneda seleccionada */}
                  <div className="shrink-0 flex items-center gap-0.5">
                    <input
                      type="number" min={0}
                      value={moneda === 'USD' ? displayVal : montoActual}
                      step={moneda === 'USD' ? 100 : 1000}
                      onChange={e => setCategoriaFromDisplay(key, parseFloat(e.target.value) || 0)}
                      className="w-28 px-2 py-1.5 rounded-lg text-xs outline-none font-mono text-right"
                      style={inputStyle}
                    />
                  </div>
                </div>
              )
            })}

            {/* Buffer */}
            <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--color-borde)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: 'var(--color-texto)' }}>Buffer / imprevistos</p>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>% sobre el subtotal</p>
              </div>
              <div className="shrink-0 flex items-center gap-0.5">
                <input
                  type="number" min={0} max={30}
                  value={s.bufferPct}
                  onChange={e => setS(prev => ({ ...prev, bufferPct: parseFloat(e.target.value) || 0 }))}
                  className="w-14 px-2 py-1.5 rounded-lg text-xs outline-none font-mono text-right"
                  style={inputStyle}
                />
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>%</span>
              </div>
              <span className="text-xs w-28 text-right font-mono shrink-0" style={{ color: 'var(--color-muted)' }}>
                {moneda === 'USD' ? `$ ${fmt(Math.round(buffer / tcCompra))}` : `S/ ${fmt(buffer)}`}
              </span>
            </div>
          </div>

          {/* Total editable */}
          <div className="rounded-xl p-4" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Total estimado boda</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  {s.anioCalendario} · {edad} años · {s.numInvitados} invitados
                  {moneda === 'USD' && (
                    <span> · S/ {fmt(totalBoda)} </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>
                  {moneda === 'USD' ? '$' : 'S/'}
                </span>
                <input
                  type="number" min={0}
                  value={totalEditando ?? (moneda === 'USD' ? Math.round(totalBoda / tcCompra) : totalBoda)}
                  onFocus={() => setTotalEditando(String(moneda === 'USD' ? Math.round(totalBoda / tcCompra) : totalBoda))}
                  onChange={e => setTotalEditando(e.target.value)}
                  onBlur={() => {
                    const v = parseFloat(totalEditando ?? '') || 0
                    if (v > 0) redistribuirDesdeTotal(v)
                    setTotalEditando(null)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    if (e.key === 'Escape') setTotalEditando(null)
                  }}
                  className="w-32 px-3 py-2 rounded-lg text-lg font-bold outline-none font-mono text-right"
                  style={{ ...inputStyle, color: 'var(--color-acento)', border: '1px solid var(--color-acento)' }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                Edita el total → categorías se redistribuyen · Enter para aplicar
              </p>
              {ajustadoPorTotal && (
                <button onClick={resetearEstimados} className="text-xs hover:opacity-80" style={{ color: 'var(--color-acento)' }}>
                  ↺ Restablecer estimados
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep('financiamiento')}
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

      {/* ── Paso 3: Financiamiento ── */}
      {step === 'financiamiento' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>
                ¿Cuánto tienes ahorrado ya? (S/)
              </label>
              <input
                type="number"
                min={0}
                value={s.ahorroActual}
                onChange={e => setS(prev => ({ ...prev, ahorroActual: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>
                ¿Aportes externos? (S/)
              </label>
              <input
                type="number"
                min={0}
                value={s.aportesExternos}
                onChange={e => setS(prev => ({ ...prev, aportesExternos: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                style={inputStyle}
              />
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Familia, etc.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>
                Período de adelantos (meses)
              </label>
              <input
                type="number"
                min={1}
                max={36}
                value={s.mesesPreparacion}
                onChange={e => setS(prev => ({ ...prev, mesesPreparacion: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                style={inputStyle}
              />
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Meses antes de la boda</p>
            </div>
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>
                % del total en adelantos
              </label>
              <input
                type="number"
                min={0}
                max={80}
                value={s.pctAdelantos}
                onChange={e => setS(prev => ({ ...prev, pctAdelantos: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                style={inputStyle}
              />
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                S/ {fmt(resultado.montoAdelantos)} adelantados → S/ {fmt(Math.round(resultado.montoAdelantos / s.mesesPreparacion))}/mes
              </p>
            </div>
          </div>

          {/* Resumen del plan */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-acento)' }}>Resumen del plan</p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Total boda</p>
                <p className="font-semibold font-mono" style={{ color: 'var(--color-texto)' }}>S/ {fmt(totalBoda)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Ya cubierto</p>
                <p className="font-semibold font-mono" style={{ color: s.ahorroActual + s.aportesExternos > 0 ? '#22c55e' : 'var(--color-muted)' }}>
                  S/ {fmt(s.ahorroActual + s.aportesExternos)}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Falta ahorrar</p>
                <p className="font-semibold font-mono" style={{ color: resultado.falta > 0 ? '#ef4444' : '#22c55e' }}>
                  S/ {fmt(resultado.falta)}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Ahorro mensual requerido</p>
                <p className="text-lg font-bold font-mono" style={{ color: 'var(--color-acento)' }}>
                  S/ {fmt(resultado.ahorroMensualRequerido)}/mes
                </p>
              </div>
            </div>

            <div className="pt-2 space-y-1" style={{ borderTop: '1px solid var(--color-borde)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Se crearán 2 entradas en el escenario:</p>
              {resultado.montoMensual > 0 && resultado.anioInicioT < anioT && (
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  💍 Adelantos: S/ {fmt(resultado.montoMensual)}/mes ·{' '}
                  {anioTToCalendario(resultado.anioInicioT, general.anioActual)}–{s.anioCalendario}{' '}
                  ({anioTToEdad(resultado.anioInicioT, general.edadActual)}–{edad} años)
                </p>
              )}
              {resultado.montoFinal > 0 && (
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  💍 Pago final: S/ {fmt(resultado.montoFinal)} en {s.anioCalendario} ({edad} años)
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={confirm}
              disabled={totalBoda <= 0}
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
