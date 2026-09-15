import { useState, useEffect } from 'react'
import { Check, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import type { EventoVida, GeneralParams } from '../../data/types'

const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function calendarioToAnioT(year: number, anioActual: number) {
  return Math.max(1, year - anioActual)
}

const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

function MonthYearPicker({ label, mes, anio, onChangeMes, onChangeAnio, minAnio = 2020 }: {
  label: string
  mes: number
  anio: number
  onChangeMes: (m: number) => void
  onChangeAnio: (y: number) => void
  minAnio?: number
}) {
  return (
    <div className="flex-1 rounded-xl p-3" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-muted)' }}>{label}</p>
      <div className="flex items-center justify-between mb-2.5">
        <button
          onClick={() => onChangeAnio(anio - 1)}
          disabled={anio <= minAnio}
          className="p-1 rounded-md disabled:opacity-30 hover:opacity-70"
          style={{ color: 'var(--color-acento)' }}
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-bold font-mono" style={{ color: 'var(--color-texto)' }}>{anio}</span>
        <button
          onClick={() => onChangeAnio(anio + 1)}
          className="p-1 rounded-md hover:opacity-70"
          style={{ color: 'var(--color-acento)' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {MESES_CORTOS.map((m, i) => {
          const selected = mes === i + 1
          return (
            <button
              key={i}
              onClick={() => onChangeMes(i + 1)}
              className="py-1 text-xs rounded-md font-medium transition-colors"
              style={{
                background: selected ? 'var(--color-acento)' : 'var(--color-card)',
                color: selected ? '#fff' : 'var(--color-muted)',
                border: selected ? 'none' : '1px solid var(--color-borde)',
              }}
            >
              {m}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface Props {
  general: GeneralParams
  onConfirm: (eventos: Omit<EventoVida, 'id'>[]) => void
  onCancel: () => void
}

export function AlquilerWizard({ general, onConfirm, onCancel }: Props) {
  const { anioActual } = general
  // mesActual reservado para uso futuro

  const [nombre, setNombre] = useState('Alquiler depa')
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>('PEN')
  const [montoPEN, setMontoPEN] = useState(2000)
  const [montoUSD, setMontoUSD] = useState(0)
  const [anioInicio, setAnioInicio] = useState(anioActual + 1)
  const [mesInicio, setMesInicio] = useState(1)
  const [anioFin, setAnioFin] = useState(anioActual + 3)
  const [mesFin, setMesFin] = useState(12)
  const [miPorcentaje, setMiPorcentaje] = useState(50)

  const { tc: tcData, loading: tcLoading, error: tcError, actualizar } = useTipoCambio()
  const tcCompra = tcData?.compra ?? 3.70

  useEffect(() => { if (!tcData) actualizar() }, [])

  const montoMensualPEN = moneda === 'USD' ? Math.round(montoUSD * tcCompra) : montoPEN
  const pct = Math.min(100, Math.max(0, miPorcentaje)) / 100
  const montoMiParte = Math.round(montoMensualPEN * pct)
  const durMeses = Math.max(0, (anioFin - anioInicio) * 12 + (mesFin - mesInicio) + 1)
  const totalEstimado = montoMiParte * durMeses

  const anioInicioT = calendarioToAnioT(anioInicio, anioActual)
  const anioFinT = calendarioToAnioT(anioFin, anioActual)

  const canConfirm = nombre.trim().length > 0 && montoMensualPEN > 0 && durMeses > 0 && anioFinT >= anioInicioT

  function confirm() {
    if (!canConfirm) return
    onConfirm([{
      nombre: nombre.trim(),
      tipoEvento: 'alquiler',
      gastoRecurrente: {
        anioInicioT,
        mesInicio,
        anioFinT,
        mesFin,
        montoMensual: montoMiParte,
      },
    }])
  }

  const fmt = (n: number) => Math.round(n).toLocaleString('es-PE')

  return (
    <div className="space-y-5">
      {/* Nombre */}
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted)' }}>
          Nombre / descripción
        </label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej. Alquiler depa más grande"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
          autoFocus
        />
      </div>

      {/* Moneda + monto */}
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted)' }}>
          Monto mensual
        </label>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: '1px solid var(--color-borde)' }}>
            {(['PEN', 'USD'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMoneda(m)}
                className="px-3 py-2 text-xs font-semibold"
                style={{
                  background: moneda === m ? 'var(--color-acento)' : 'var(--color-fondo)',
                  color: moneda === m ? '#fff' : 'var(--color-muted)',
                }}
              >{m}</button>
            ))}
          </div>
          <input
            type="number" min={0}
            value={moneda === 'USD' ? montoUSD : montoPEN}
            onChange={e => {
              const v = parseFloat(e.target.value) || 0
              moneda === 'USD' ? setMontoUSD(v) : setMontoPEN(v)
            }}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none font-mono"
            style={inputStyle}
            placeholder="0"
          />
        </div>
        {moneda === 'USD' && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
              TC Rextie (compra):{' '}
              {tcLoading
                ? <span>cargando…</span>
                : tcError
                  ? <span style={{ color: '#E24C4C' }}>sin conexión — usando S/ {tcCompra.toFixed(3)}</span>
                  : <strong style={{ color: 'var(--color-acento)' }}>S/ {tcCompra.toFixed(3)}</strong>
              }
            </span>
            <button onClick={() => actualizar(true)} className="p-0.5 hover:opacity-70" style={{ color: 'var(--color-muted)' }} title="Actualizar TC">
              <RefreshCw size={11} className={tcLoading ? 'animate-spin' : ''} />
            </button>
            {montoUSD > 0 && (
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>= S/ {fmt(montoUSD * tcCompra)}/mes</span>
            )}
          </div>
        )}
      </div>

      {/* Período */}
      <div className="flex gap-3">
        <MonthYearPicker
          label="INICIO"
          mes={mesInicio}
          anio={anioInicio}
          onChangeMes={setMesInicio}
          onChangeAnio={setAnioInicio}
          minAnio={anioActual}
        />
        <MonthYearPicker
          label="FIN"
          mes={mesFin}
          anio={anioFin}
          onChangeMes={setMesFin}
          onChangeAnio={y => setAnioFin(Math.max(anioInicio, y))}
          minAnio={anioInicio}
        />
      </div>

      {/* Distribución */}
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted)' }}>
          Mi parte del alquiler
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range" min={0} max={100} step={5}
            value={miPorcentaje}
            onChange={e => setMiPorcentaje(parseInt(e.target.value))}
            className="flex-1"
          />
          <div className="flex items-center gap-1">
            <input
              type="number" min={0} max={100}
              value={miPorcentaje}
              onChange={e => setMiPorcentaje(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-16 px-2 py-1.5 rounded-lg text-sm outline-none font-mono text-right"
              style={inputStyle}
            />
            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>%</span>
          </div>
        </div>
        {miPorcentaje < 100 && montoMensualPEN > 0 && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
            Total pareja: S/ {fmt(montoMensualPEN)}/mes · Mi parte: <strong style={{ color: 'var(--color-acento)' }}>S/ {fmt(montoMiParte)}/mes</strong>
          </p>
        )}
      </div>

      {/* Resumen */}
      {canConfirm && (
        <div className="rounded-lg p-3 space-y-1" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Resumen</p>
          <p className="text-sm font-mono" style={{ color: 'var(--color-texto)' }}>
            S/ {fmt(montoMiParte)}/mes · {MESES_CORTOS[mesInicio - 1]} {anioInicio} → {MESES_CORTOS[mesFin - 1]} {anioFin}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {durMeses} meses · Total mi parte: S/ {fmt(totalEstimado)}
            {miPorcentaje < 100 && <span> ({miPorcentaje}% de S/ {fmt(montoMensualPEN * durMeses)})</span>}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={confirm}
          disabled={!canConfirm}
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
