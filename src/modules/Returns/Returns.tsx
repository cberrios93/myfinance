import { useState, useMemo } from 'react'
import { Plus, Trash2, Edit2, Check, X, BarChart3 } from 'lucide-react'
import { EmptyState } from '../../components/common/EmptyState'
import { useFinanceData } from '../../data/FinanceDataContext'
import { useScenario } from '../../data/ScenarioContext'
import { usePatrimony } from '../../data/PatrimonyContext'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import type { Rendimiento, TipoRenta } from '../../data/types'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import TipoCambioWidget from '../../components/TipoCambioWidget'
import { useConfig } from '../../config/ConfigContext'
import { formatMonto } from '../../lib/formatMonto'

function fmt(n: number, dec = 2) { return n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec }) }
function fmtPct(n: number) { return `${(n * 100).toFixed(2)}%` }

const NOW = new Date()
const CURRENT_YEAR = NOW.getFullYear()
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

type Draft = Omit<Rendimiento, 'id' | 'creadoEn' | 'actualizadoEn'>

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function emptyDraft(): Draft {
  const hoy = todayISO()
  const d = new Date()
  return {
    anio: d.getFullYear(), mes: d.getMonth() + 1, instrumentoNombre: '',
    fechaPago: hoy, gananciasPEN: undefined, gananciasUSD: undefined,
    inversionPEN: undefined, inversionUSD: undefined,
    aporteMesPEN: undefined, aporteMesUSD: undefined,
    rentabilidad: undefined, tasaImpuesto: 0, reinvertido: false, marcado: false, esTraspaso: false, comentario: undefined,
  }
}

type InstrInfo = { moneda: 'PEN' | 'USD'; montoInicial: number; montoActual?: number; tipoRenta: TipoRenta; cuentaId?: string }

function aplicarImpuesto(monto: number, tasa: number) {
  return monto * (1 - tasa / 100)
}

function calcRent(r: Pick<Rendimiento, 'gananciasPEN' | 'gananciasUSD' | 'inversionPEN' | 'inversionUSD' | 'rentabilidad' | 'tasaImpuesto'>): number | null {
  const tasa = r.tasaImpuesto ?? 0
  if (r.rentabilidad != null) return tasa > 0 ? r.rentabilidad * (1 - tasa / 100) : r.rentabilidad
  const gan = aplicarImpuesto(r.gananciasPEN ?? 0, tasa); const inv = r.inversionPEN ?? 0
  if (inv > 0) return gan / inv
  const ganU = aplicarImpuesto(r.gananciasUSD ?? 0, tasa); const invU = r.inversionUSD ?? 0
  if (invU > 0) return ganU / invU
  return null
}

function RendForm({ value, onChange, onSave, onCancel, instrumentoOpciones, instrInfoMap, rendimientos, tc }: {
  value: Draft
  onChange: (v: Draft) => void
  onSave: () => void
  onCancel: () => void
  instrumentoOpciones: string[]
  instrInfoMap: Map<string, InstrInfo>
  rendimientos: Rendimiento[]
  tc: number
}) {
  useSubmitOnCmdEnter(onSave)
  const { config } = useConfig()

  const info = value.instrumentoNombre ? instrInfoMap.get(value.instrumentoNombre) : undefined
  const moneda = info?.moneda ?? 'PEN'
  const simbolo = moneda === 'PEN' ? 'S/' : '$'
  const tipo = info?.tipoRenta ?? 'pago'
  const base = info?.montoActual ?? info?.montoInicial

  const ganancia = moneda === 'PEN' ? value.gananciasPEN : value.gananciasUSD
  const invActual = moneda === 'PEN' ? value.inversionPEN : value.inversionUSD
  const aporteMes = moneda === 'PEN' ? value.aporteMesPEN : value.aporteMesUSD
  const baseConAporte = (invActual ?? base ?? 0) + (aporteMes ?? 0)

  const ganAcumPEN = rendimientos
    .filter(r => r.instrumentoNombre === value.instrumentoNombre && !r.esTraspaso)
    .reduce((s, r) => s + (r.gananciasPEN ?? 0) + (r.gananciasUSD ?? 0) * tc, 0)
  const basePEN = base != null ? (moneda === 'USD' ? base * tc : base) : null
  const rentAcum = basePEN != null && basePEN > 0 ? ganAcumPEN / basePEN : null

  // Detectar si el último registro del instrumento es un traspaso (ciclo cerrado)
  const rendInstr = rendimientos
    .filter(r => r.instrumentoNombre === value.instrumentoNombre)
    .sort((a, b) => a.anio !== b.anio ? b.anio - a.anio : (b.mes ?? 0) - (a.mes ?? 0))
  const ultimoEsTraspaso = rendInstr.length > 0 && rendInstr[0].esTraspaso
  const nombreSugerido = value.instrumentoNombre
    ? (() => {
        const hoy = value.fechaPago ?? new Date().toISOString().slice(0, 10)
        const d = new Date(hoy + 'T12:00:00')
        const mes = String(d.getMonth() + 1).padStart(2, '0')
        return `${value.instrumentoNombre} · ${mes}/${d.getFullYear()}`
      })()
    : ''

  // Para tipo 'variable': valor actual = base + aporte + ganancia
  const valorActual = base != null && ganancia != null ? (base + (aporteMes ?? 0) + ganancia) : undefined

  function handleInstrumento(nombre: string) {
    const i = instrInfoMap.get(nombre)
    const b = i?.montoActual ?? i?.montoInicial
    onChange({
      ...value,
      instrumentoNombre: nombre,
      inversionPEN: i?.moneda === 'PEN' ? b : undefined,
      inversionUSD: i?.moneda === 'USD' ? b : undefined,
      gananciasPEN: undefined,
      gananciasUSD: undefined,
      rentabilidad: undefined,
    })
  }

  function handleFecha(fecha: string) {
    if (!fecha) { onChange({ ...value, fechaPago: undefined }); return }
    const d = new Date(fecha + 'T12:00:00')
    onChange({ ...value, fechaPago: fecha, mes: d.getMonth() + 1, anio: d.getFullYear() })
  }

  function handleAporteMes(raw: string) {
    const ap = raw !== '' ? parseFloat(raw) : undefined
    // Si ya hay un valor actual implícito (base + aportePrevio + ganancia), recalcular ganancia con el nuevo aporte
    if (ganancia != null && base != null) {
      const impliedVa = base + (aporteMes ?? 0) + ganancia
      const newAp = ap ?? 0
      const newGan = impliedVa - base - newAp
      const newBase_ = base + newAp
      const newRent = newBase_ > 0 ? newGan / newBase_ : undefined
      if (moneda === 'PEN') onChange({ ...value, aporteMesPEN: ap, aporteMesUSD: undefined, gananciasPEN: newGan, gananciasUSD: undefined, rentabilidad: newRent })
      else onChange({ ...value, aporteMesUSD: ap, aporteMesPEN: undefined, gananciasUSD: newGan, gananciasPEN: undefined, rentabilidad: newRent })
    } else {
      if (moneda === 'PEN') onChange({ ...value, aporteMesPEN: ap, aporteMesUSD: undefined })
      else onChange({ ...value, aporteMesUSD: ap, aporteMesPEN: undefined })
    }
  }

  function handleGanancia(raw: string) {
    const gan = raw !== '' ? parseFloat(raw) : undefined
    const base_ = baseConAporte > 0 ? baseConAporte : (invActual ?? 0)
    const rent = gan != null && base_ > 0 ? gan / base_ : undefined
    if (moneda === 'PEN') onChange({ ...value, gananciasPEN: gan, gananciasUSD: undefined, rentabilidad: rent })
    else onChange({ ...value, gananciasUSD: gan, gananciasPEN: undefined, rentabilidad: rent })
  }

  function handleRentabilidad(raw: string) {
    const pct = raw !== '' ? parseFloat(raw) / 100 : undefined
    const base_ = baseConAporte > 0 ? baseConAporte : (invActual ?? 0)
    const gan = pct != null && base_ > 0 ? pct * base_ : undefined
    if (moneda === 'PEN') onChange({ ...value, rentabilidad: pct, gananciasPEN: gan, gananciasUSD: undefined })
    else onChange({ ...value, rentabilidad: pct, gananciasUSD: gan, gananciasPEN: undefined })
  }

  // Tipo 'variable': el usuario ingresa el valor actual → ganancia = valor - base - aporte
  function handleValorActual(raw: string) {
    const va = raw !== '' ? parseFloat(raw) : undefined
    const gan = va != null && base != null ? va - base - (aporteMes ?? 0) : undefined
    const base_ = base != null ? base + (aporteMes ?? 0) : undefined
    const rent = gan != null && base_ != null && base_ > 0 ? gan / base_ : undefined
    if (moneda === 'PEN') onChange({ ...value, gananciasPEN: gan, gananciasUSD: undefined, rentabilidad: rent })
    else onChange({ ...value, gananciasUSD: gan, gananciasPEN: undefined, rentabilidad: rent })
  }

  const disabled = !value.instrumentoNombre

  return (
    <div className="space-y-4">
      {/* Instrumento + fecha */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Instrumento</label>
          <select
            value={value.instrumentoNombre}
            onChange={e => handleInstrumento(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            autoFocus
          >
            <option value="">— Seleccionar —</option>
            {instrumentoOpciones.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>
            Fecha de pago <span className="opacity-50">(define mes y año)</span>
          </label>
          <input
            type="date"
            value={value.fechaPago ?? ''}
            onChange={e => handleFecha(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Info del instrumento (read-only) */}
      {info && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg px-3 py-2.5 sm:grid-cols-5" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>Monto inicial</p>
            <p className="text-sm font-mono font-semibold" style={{ color: 'var(--color-texto)' }}>
              {simbolo} {fmt(info.montoInicial)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>Balance actual</p>
            <p className="text-sm font-mono font-semibold" style={{ color: info.montoActual != null ? '#00C9A7' : 'var(--color-muted)' }}>
              {info.montoActual != null ? `${simbolo} ${fmt(info.montoActual)}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>Ganancia acumulada</p>
            <p className="text-sm font-mono font-semibold" style={{ color: ganAcumPEN >= 0 ? '#00C9A7' : '#E24C4C' }}>
              {formatMonto(ganAcumPEN, config)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>Rentab. acumulada</p>
            <p className="text-sm font-mono font-semibold" style={{ color: rentAcum != null && rentAcum >= 0 ? '#00C9A7' : '#E24C4C' }}>
              {rentAcum != null ? `${(rentAcum * 100).toFixed(2)}%` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--color-muted)' }}>Tipo</p>
            <p className="text-xs font-medium" style={{ color: tipo === 'pago' ? '#8B5CF6' : tipo === 'capitalizacion' ? '#00C9A7' : '#00C9A7' }}>
              {tipo === 'pago' && 'Renta fija — pago'}
              {tipo === 'capitalizacion' && 'Capitalización'}
              {tipo === 'variable' && 'Renta variable'}
            </p>
          </div>
        </div>
      )}

      {/* Alerta: ciclo cerrado — el último registro del instrumento es un traspaso */}
      {ultimoEsTraspaso && (
        <div className="rounded-lg px-3 py-2.5 flex flex-col gap-1" style={{ background: '#fef3c7', border: '1px solid #F5A623' }}>
          <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
            ⚠ Ciclo cerrado — último registro es un Traspaso
          </p>
          <p className="text-xs" style={{ color: '#78350f' }}>
            Este instrumento ya fue cerrado con un traspaso. Si vas a iniciar un nuevo ciclo, crea un instrumento nuevo en Simulación con el nombre sugerido:
          </p>
          <p className="text-xs font-mono font-semibold rounded px-2 py-1 select-all" style={{ background: '#fde68a', color: '#78350f' }}>
            {nombreSugerido}
          </p>
          <p className="text-xs" style={{ color: '#92400e' }}>
            Luego registra los rendimientos del nuevo ciclo bajo ese nombre para mantener el historial separado.
          </p>
        </div>
      )}

      {/* Checkbox traspaso — cambia el modo del formulario */}
      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: value.esTraspaso ? '#F5A623' : 'var(--color-texto)' }}>
        <input
          type="checkbox"
          checked={value.esTraspaso}
          onChange={e => onChange({ ...value, esTraspaso: e.target.checked, gananciasPEN: undefined, gananciasUSD: undefined, rentabilidad: undefined, aporteMesPEN: undefined, aporteMesUSD: undefined })}
          disabled={disabled}
        />
        Es un traspaso <span className="text-xs opacity-60">(el saldo sale de este instrumento hacia otro — no es ganancia ni pérdida)</span>
      </label>

      {!value.esTraspaso && (
        <>
          {/* Aporte del mes — opcional, para cuando se inyecta capital nuevo mid-mes */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>
              Aporte del mes ({simbolo}) <span className="opacity-50">— opcional, si pusiste capital nuevo este mes</span>
            </label>
            <input
              type="number" step={0.01}
              value={aporteMes != null ? aporteMes : ''}
              onChange={e => handleAporteMes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
              style={inputStyle}
              placeholder="0.00"
              disabled={disabled}
            />
          </div>
        </>
      )}

      {/* Traspaso: solo valor actual para actualizar Patrimonio */}
      {value.esTraspaso && (
        <div className="rounded-lg px-3 py-3 space-y-3" style={{ background: '#F5A62310', border: '1px solid #F5A62330' }}>
          <p className="text-xs" style={{ color: '#F5A623' }}>
            Ingresa el saldo final en este instrumento tras el traspaso. Si salió todo, pon <strong>0</strong>. Patrimonio se actualizará a ese valor.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Saldo final ({simbolo})</label>
              <input
                type="number" step={0.01}
                value={valorActual != null ? valorActual : ''}
                onChange={e => handleValorActual(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
                style={inputStyle}
                placeholder="0.00"
                disabled={disabled}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Notas</label>
              <input
                value={value.comentario ?? ''}
                onChange={e => onChange({ ...value, comentario: e.target.value || undefined })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
                placeholder="Ej: traspaso a Cobra"
              />
            </div>
          </div>
          {base != null && valorActual != null && (
            <p className="text-xs" style={{ color: '#F5A623' }}>
              Patrimonio se actualizará de {simbolo} {fmt(base)} → {simbolo} {fmt(valorActual)}
            </p>
          )}
        </div>
      )}

      {/* Campos de entrada — varían según tipoRenta */}
      {!value.esTraspaso && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tipo === 'variable' || tipo === 'capitalizacion' ? (
          <>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>
                Valor actual ({simbolo})
                {tipo === 'capitalizacion' && <span className="ml-1 opacity-50">— opcional</span>}
              </label>
              <input
                type="number" step={0.01}
                value={valorActual != null ? valorActual : ''}
                onChange={e => handleValorActual(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
                style={inputStyle}
                placeholder="0.00"
                disabled={disabled}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>
                {tipo === 'variable' ? `Delta (${simbolo})` : `Ganancia (${simbolo})`}
              </label>
              <input
                type="number" step={0.01}
                value={ganancia != null ? ganancia : ''}
                onChange={e => handleGanancia(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
                style={{ ...inputStyle, color: ganancia != null ? (ganancia >= 0 ? '#00C9A7' : '#E24C4C') : 'var(--color-muted)' }}
                placeholder={tipo === 'variable' ? 'calculado' : '0.00'}
                disabled={disabled}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Ganancia ({simbolo})</label>
              <input
                type="number" step={0.01}
                value={ganancia != null ? ganancia : ''}
                onChange={e => handleGanancia(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
                style={inputStyle}
                placeholder="0.00"
                disabled={disabled}
              />
            </div>
          </>
        )}
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Rentabilidad %</label>
          <input
            type="number" step={0.01}
            value={value.rentabilidad != null ? parseFloat((value.rentabilidad * 100).toFixed(4)) : ''}
            onChange={e => handleRentabilidad(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
            style={inputStyle}
            placeholder="0.00"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>
            Impuesto % <span className="opacity-50">— 0 si ya es neto</span>
          </label>
          <input
            type="number" step={0.5} min={0} max={100}
            value={value.tasaImpuesto > 0 ? value.tasaImpuesto : ''}
            onChange={e => onChange({ ...value, tasaImpuesto: e.target.value !== '' ? parseFloat(e.target.value) : 0 })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
            style={inputStyle}
            placeholder="0"
            disabled={disabled}
          />
        </div>
        <div className={tipo === 'variable' || tipo === 'capitalizacion' ? '' : 'sm:col-span-2'}>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Notas</label>
          <input
            value={value.comentario ?? ''}
            onChange={e => onChange({ ...value, comentario: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            placeholder="Opcional"
          />
        </div>
      </div>}

      {/* Avisos de actualización de Patrimonio — solo si no es traspaso */}
      {!value.esTraspaso && tipo === 'capitalizacion' && ganancia != null && base != null && (
        <p className="text-xs rounded-lg px-3 py-2" style={{ background: '#00C9A715', color: '#00C9A7', border: '1px solid #00C9A730' }}>
          Al guardar se propondrá actualizar Patrimonio a {simbolo} {fmt(base + (aporteMes ?? 0) + ganancia)} (base + aporte + ganancia reinvertida).
        </p>
      )}
      {!value.esTraspaso && tipo === 'variable' && ganancia != null && base != null && (
        <p className="text-xs rounded-lg px-3 py-2" style={{ background: '#00C9A715', color: '#00C9A7', border: '1px solid #00C9A730' }}>
          Al guardar se propondrá actualizar Patrimonio a {simbolo} {fmt(base + (aporteMes ?? 0) + ganancia)} (base + aporte + ganancia).
        </p>
      )}

      {/* Checkboxes + acciones */}
      <div className="flex items-center gap-6">
        {tipo === 'pago' && (
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-texto)' }}>
            <input type="checkbox" checked={value.reinvertido} onChange={e => onChange({ ...value, reinvertido: e.target.checked })} />
            Reinvertido
          </label>
        )}
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-texto)' }}>
          <input type="checkbox" checked={value.marcado} onChange={e => onChange({ ...value, marcado: e.target.checked })} />
          Pendiente
        </label>
        <div className="flex gap-2 ml-auto">
          <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: 'var(--color-acento)' }}>
            <Check size={14} /> Guardar
          </button>
          <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
            <X size={14} /> Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Returns() {
  const { rendimientos, flujosCapital, loading, agregarRendimiento, actualizarRendimiento, borrarRendimiento } = useFinanceData()
  const { escenarios } = useScenario()
  const { cuentas, actualizarCuenta } = usePatrimony()
  const { tc: tcData } = useTipoCambio()
  const tc = tcData?.compra ?? 3.7
  const { config } = useConfig()

  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Rendimiento | null>(null)
  const [anioFiltro, setAnioFiltro] = useState<number | 'todos'>(CURRENT_YEAR)
  const [instrFiltro, setInstrFiltro] = useState('todos')
  const [bulkTasa, setBulkTasa] = useState('')
  const [bulkApplying, setBulkApplying] = useState(false)
  // Propuesta post-save de actualización de Patrimonio
  const [propuestaPatrimonio, setPropuestaPatrimonio] = useState<{ cuentaId: string; nuevoMonto: number; moneda: 'PEN' | 'USD' } | null>(null)

  // Instrumentos únicos de todos los escenarios
  const instrumentoOpciones = useMemo(() => {
    const seen = new Set<string>()
    for (const esc of escenarios)
      for (const instr of esc.instrumentos)
        if (instr.nombre) seen.add(instr.nombre)
    return [...seen].sort()
  }, [escenarios])

  // Info por instrumento: moneda, monto inicial, monto actual, tipoRenta, cuentaId
  const instrInfoMap = useMemo<Map<string, InstrInfo>>(() => {
    const map = new Map<string, InstrInfo>()
    for (const esc of escenarios) {
      for (const instr of esc.instrumentos) {
        if (!instr.nombre || map.has(instr.nombre)) continue
        const cuenta = instr.cuentaPatrimonioId ? cuentas.find(c => c.id === instr.cuentaPatrimonioId) : undefined
        let moneda: 'PEN' | 'USD' = 'PEN'
        let montoActual: number | undefined
        if (cuenta) {
          if (cuenta.montoUSD != null && cuenta.montoPEN == null) {
            moneda = 'USD'; montoActual = cuenta.montoUSD
          } else {
            moneda = 'PEN'; montoActual = cuenta.montoPEN ?? undefined
          }
        }
        // montoInicial en el escenario siempre está en PEN; si la cuenta es USD, convertir
        const montoInicialDisplay = moneda === 'USD' ? instr.montoInicial / tc : instr.montoInicial
        map.set(instr.nombre, {
          moneda, montoInicial: montoInicialDisplay, montoActual,
          tipoRenta: instr.tipoRenta ?? 'pago',
          cuentaId: instr.cuentaPatrimonioId,
        })
      }
    }
    return map
  }, [escenarios, cuentas, tc])

  const years = [...new Set(rendimientos.map(r => r.anio))].sort((a, b) => b - a)
  if (!years.includes(CURRENT_YEAR)) years.unshift(CURRENT_YEAR)

  const del_anio = anioFiltro === 'todos' ? rendimientos : rendimientos.filter(r => r.anio === anioFiltro)
  const filtered = instrFiltro === 'todos' ? del_anio : del_anio.filter(r => r.instrumentoNombre === instrFiltro)
  const instrNombres = [...new Set(rendimientos.map(r => r.instrumentoNombre))].sort()

  const filteredSinTraspaso = filtered.filter(r => !r.esTraspaso)
  const totalGanPEN = filteredSinTraspaso.reduce((s, r) => s + aplicarImpuesto(r.gananciasPEN ?? 0, r.tasaImpuesto ?? 0), 0)
  const totalGanUSD = filteredSinTraspaso.reduce((s, r) => s + aplicarImpuesto(r.gananciasUSD ?? 0, r.tasaImpuesto ?? 0), 0)

  // Monto base: base del registro más reciente por instrumento (no suma acumulada)
  const latestPerInstr = Object.values(
    filteredSinTraspaso.reduce((acc, r) => {
      const prev = acc[r.instrumentoNombre]
      if (!prev || r.anio > prev.anio || (r.anio === prev.anio && (r.mes ?? 0) > (prev.mes ?? 0)))
        acc[r.instrumentoNombre] = r
      return acc
    }, {} as Record<string, Rendimiento>)
  )
  const totalInvPEN = latestPerInstr.reduce((s, r) => s + (r.inversionPEN ?? 0), 0)
  const totalInvUSD = latestPerInstr.reduce((s, r) => s + (r.inversionUSD ?? 0), 0)

  function checkPropuestaPatrimonio(draft: Draft) {
    const info = instrInfoMap.get(draft.instrumentoNombre)
    if (!info?.cuentaId) return
    const base = info.montoActual ?? info.montoInicial
    if (draft.esTraspaso) {
      // En traspaso: el nuevo monto es el saldo final ingresado (ganancia contiene el delta vs base)
      const ganancia = info.moneda === 'PEN' ? draft.gananciasPEN : draft.gananciasUSD
      if (ganancia == null) return
      setPropuestaPatrimonio({ cuentaId: info.cuentaId, nuevoMonto: base + ganancia, moneda: info.moneda })
      return
    }
    if (info.tipoRenta !== 'capitalizacion' && info.tipoRenta !== 'variable') return
    const ganancia = info.moneda === 'PEN' ? draft.gananciasPEN : draft.gananciasUSD
    const aporteMes = info.moneda === 'PEN' ? draft.aporteMesPEN : draft.aporteMesUSD
    if (ganancia == null) return
    setPropuestaPatrimonio({ cuentaId: info.cuentaId, nuevoMonto: base + (aporteMes ?? 0) + ganancia, moneda: info.moneda })
  }

  async function handleAdd() {
    if (!newDraft.instrumentoNombre.trim()) return
    const toSave = newDraft.esTraspaso
      ? { ...newDraft, gananciasPEN: undefined, gananciasUSD: undefined, rentabilidad: undefined }
      : newDraft
    await agregarRendimiento(toSave)
    checkPropuestaPatrimonio(newDraft)
    setAdding(false); setNewDraft(emptyDraft())
  }

  async function handleSaveEdit() {
    if (!editDraft) return
    const toSave = editDraft.esTraspaso
      ? { ...editDraft, gananciasPEN: undefined, gananciasUSD: undefined, rentabilidad: undefined }
      : editDraft
    await actualizarRendimiento(toSave)
    checkPropuestaPatrimonio(editDraft)
    setEditingId(null); setEditDraft(null)
  }

  async function confirmarActualizarPatrimonio() {
    if (!propuestaPatrimonio) return
    const cuenta = cuentas.find(c => c.id === propuestaPatrimonio.cuentaId)
    if (!cuenta) { setPropuestaPatrimonio(null); return }
    const actualizada = propuestaPatrimonio.moneda === 'PEN'
      ? { ...cuenta, montoPEN: propuestaPatrimonio.nuevoMonto }
      : { ...cuenta, montoUSD: propuestaPatrimonio.nuevoMonto }
    await actualizarCuenta(actualizada)
    setPropuestaPatrimonio(null)
  }

  async function aplicarTasaBulk() {
    const tasa = parseFloat(bulkTasa)
    if (isNaN(tasa) || instrFiltro === 'todos') return
    setBulkApplying(true)
    try {
      const targets = rendimientos.filter(r => r.instrumentoNombre === instrFiltro && !r.esTraspaso)
      await Promise.all(targets.map(r => actualizarRendimiento({ ...r, tasaImpuesto: tasa })))
      setBulkTasa('')
    } finally {
      setBulkApplying(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>Cargando…</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Rendimiento de Inversiones</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Ganancias reales por instrumento y mes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={instrFiltro} onChange={e => setInstrFiltro(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            <option value="todos">Todos los instrumentos</option>
            {instrNombres.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={anioFiltro} onChange={e => setAnioFiltro(e.target.value === 'todos' ? 'todos' : parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle}>
            <option value="todos">Todos los años</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => { setAdding(true); setNewDraft(emptyDraft()) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--color-acento)' }}
          >
            <Plus size={16} /> Registrar
          </button>
        </div>
      </div>

      {/* Bulk impuesto — solo cuando hay instrumento seleccionado */}
      {instrFiltro !== 'todos' && (
        <div className="flex items-center gap-2 flex-wrap rounded-lg px-3 py-2" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Aplicar impuesto a <strong style={{ color: 'var(--color-texto)' }}>{instrFiltro}</strong>:
          </span>
          <input
            type="number" step={0.5} min={0} max={100}
            value={bulkTasa}
            onChange={e => setBulkTasa(e.target.value)}
            className="w-20 px-2 py-1 rounded text-sm outline-none text-right font-mono"
            style={inputStyle}
            placeholder="5"
          />
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>%</span>
          <button
            onClick={aplicarTasaBulk}
            disabled={bulkApplying || !bulkTasa}
            className="px-3 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--color-acento)' }}
          >
            {bulkApplying ? 'Aplicando…' : 'Aplicar a todos los registros'}
          </button>
          <span className="text-xs" style={{ color: 'var(--color-muted)', opacity: 0.6 }}>
            (excluye traspasos · usa 0 para quitar impuesto)
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {(() => {
          const ganTotal = totalGanPEN + totalGanUSD * tc
          const baseTotal = totalInvPEN + totalInvUSD * tc
          const rentPromedio = baseTotal > 0 ? ganTotal / baseTotal : null
          // Capital propio neto (aportes − retiros en PEN eq.)
          const capitalPropio = flujosCapital.reduce((s, f) => {
            const pen = f.moneda === 'USD' ? f.monto * tc : f.monto
            return f.tipo === 'aporte' ? s + pen : s - pen
          }, 0)
          const retornoCapitalPropio = capitalPropio > 0 ? ganTotal / capitalPropio : null
          return [
            { label: 'Ganancias totales (PEN eq.)', main: formatMonto(ganTotal, config), color: ganTotal >= 0 ? '#00C9A7' : '#E24C4C' },
            { label: 'Ganancias USD', main: `$ ${fmt(totalGanUSD)}`, sub: `≈ ${formatMonto(totalGanUSD * tc, config)}`, color: totalGanUSD >= 0 ? '#00C9A7' : '#E24C4C' },
            { label: 'Monto base (PEN eq.)', main: formatMonto(baseTotal, config), color: 'var(--color-texto)' },
            { label: 'Rentabilidad promedio', main: rentPromedio != null ? fmtPct(rentPromedio) : '—', color: rentPromedio != null && rentPromedio >= 0 ? '#00C9A7' : '#E24C4C' },
            { label: 'Retorno s/ capital propio', main: retornoCapitalPropio != null ? fmtPct(retornoCapitalPropio) : '—', sub: capitalPropio > 0 ? `Base: ${formatMonto(capitalPropio, config)}` : 'Registra flujos de capital', color: retornoCapitalPropio != null && retornoCapitalPropio >= 0 ? '#00C9A7' : 'var(--color-muted)' },
          ].map(({ label, main, sub, color }) => (
            <div key={label} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label}</p>
              <p className="font-bold text-sm font-mono" style={{ color }}>{main}</p>
              {sub && <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{sub}</p>}
            </div>
          ))
        })()}
      </div>

      <div className="flex justify-end">
        <TipoCambioWidget autoFetch={false} />
      </div>


      {/* Formulario */}
      {adding && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-texto)' }}>Nuevo rendimiento</p>
          <RendForm
            value={newDraft} onChange={setNewDraft} onSave={handleAdd}
            onCancel={() => { setAdding(false); setNewDraft(emptyDraft()) }}
            instrumentoOpciones={instrumentoOpciones}
            instrInfoMap={instrInfoMap}
            rendimientos={rendimientos}
            tc={tc}
          />
        </div>
      )}

      {/* Propuesta de actualización de Patrimonio */}
      {propuestaPatrimonio && (() => {
        const cuenta = cuentas.find(c => c.id === propuestaPatrimonio.cuentaId)
        const simbolo = propuestaPatrimonio.moneda === 'PEN' ? 'S/' : '$'
        return (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap" style={{ background: '#00C9A715', border: '1px solid #00C9A740' }}>
            <p className="text-sm flex-1" style={{ color: '#00C9A7' }}>
              ¿Actualizar <strong>{cuenta?.nombre ?? 'cuenta'}</strong> en Patrimonio a {simbolo} {fmt(propuestaPatrimonio.nuevoMonto)}?
            </p>
            <div className="flex gap-2">
              <button onClick={confirmarActualizarPatrimonio}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: '#00C9A7' }}>
                Sí, actualizar
              </button>
              <button onClick={() => setPropuestaPatrimonio(null)}
                className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
                No por ahora
              </button>
            </div>
          </div>
        )
      })()}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-borde)' }}>
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr style={{ background: '#1e3a5f', color: '#fff' }}>
              <th className="text-left px-3 py-3 font-semibold">Instrumento</th>
              <th className="text-left px-3 py-3 font-semibold text-xs">Período</th>
              <th className="text-left px-3 py-3 font-semibold text-xs">Fecha pago</th>
              <th className="text-right px-3 py-3 font-semibold text-xs">Ganancia</th>
              <th className="text-right px-3 py-3 font-semibold text-xs">Base</th>
              <th className="text-right px-3 py-3 font-semibold text-xs">Rentab.</th>
              <th className="text-center px-3 py-3 font-semibold text-xs">Reinv.</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const rent = calcRent(r)
              const periodo = r.mes ? `${MESES[r.mes - 1]} ${r.anio}` : `${r.anio}`
              const tasa = r.tasaImpuesto ?? 0
              const ganancia = r.esTraspaso
                ? { label: 'Traspaso', color: '#F5A623', bruto: null }
                : r.gananciasPEN != null
                  ? { label: formatMonto(aplicarImpuesto(r.gananciasPEN, tasa), config), color: r.gananciasPEN >= 0 ? '#00C9A7' : '#E24C4C', bruto: tasa > 0 ? formatMonto(r.gananciasPEN, config) : null }
                  : r.gananciasUSD != null
                    ? { label: `$ ${fmt(aplicarImpuesto(r.gananciasUSD, tasa))}`, color: r.gananciasUSD >= 0 ? '#00C9A7' : '#E24C4C', bruto: tasa > 0 ? `$ ${fmt(r.gananciasUSD)}` : null }
                    : { label: '—', color: 'var(--color-muted)', bruto: null }
              const base = r.inversionPEN != null ? formatMonto(r.inversionPEN, config) : r.inversionUSD != null ? `$ ${fmt(r.inversionUSD)}` : '—'

              if (editingId === r.id && editDraft) {
                return (
                  <tr key={r.id} style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-borde)' }}>
                    <td colSpan={8} className="px-4 py-3">
                      <RendForm
                        value={editDraft} onChange={v => setEditDraft({ ...editDraft, ...v })}
                        onSave={handleSaveEdit}
                        onCancel={() => { setEditingId(null); setEditDraft(null) }}
                        instrumentoOpciones={instrumentoOpciones}
                        instrInfoMap={instrInfoMap}
                        rendimientos={rendimientos}
                        tc={tc}
                      />
                    </td>
                  </tr>
                )
              }
              return (
                <tr key={r.id} style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-borde)', color: r.marcado ? '#F5A623' : 'var(--color-texto)' }}>
                  <td className="px-3 py-2.5 font-medium text-sm">
                    {r.marcado && <span className="mr-1 text-yellow-400">*</span>}{r.instrumentoNombre}
                    {r.comentario && <span className="block text-xs font-normal mt-0.5" style={{ color: 'var(--color-muted)' }}>{r.comentario}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{periodo}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-muted)' }}>{r.fechaPago ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs" style={{ color: ganancia.color }}>
                    {ganancia.label}
                    {ganancia.bruto && (
                      <span className="block text-xs" style={{ color: 'var(--color-muted)', textDecoration: 'line-through' }}>{ganancia.bruto}</span>
                    )}
                    {tasa > 0 && !r.esTraspaso && (
                      <span className="inline-block mt-0.5 px-1 rounded text-xs font-normal" style={{ background: '#E24C4C15', color: '#E24C4C', fontSize: 10 }}>−{tasa}%</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs" style={{ color: 'var(--color-muted)' }}>{base}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs" style={{ color: rent != null && rent >= 0 ? '#00C9A7' : '#E24C4C' }}>
                    {rent != null ? fmtPct(rent) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs">{r.reinvertido ? '✓' : ''}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="flex justify-end gap-1">
                      <button onClick={() => { setEditingId(r.id); setEditDraft({ ...r }) }} className="p-1 rounded" style={{ color: 'var(--color-muted)' }}><Edit2 size={13} /></button>
                      <button onClick={() => borrarRendimiento(r.id)} className="p-1 rounded" style={{ color: 'var(--color-muted)' }}><Trash2 size={13} /></button>
                    </span>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && !adding && (
              <tr>
                <td colSpan={8}>
                  {rendimientos.length === 0 ? (
                    <EmptyState
                      icon={BarChart3}
                      title="Sin registros de rendimientos"
                      description="Registra el historial de tus portafolios e inversiones para ver cómo han crecido en el tiempo."
                      actionLabel="+ Registrar primero"
                      onAction={() => setAdding(true)}
                    />
                  ) : (
                    <div className="text-center py-8 text-sm" style={{ color: 'var(--color-muted)' }}>
                      Sin registros{anioFiltro !== 'todos' ? ` para ${anioFiltro}` : ''}{instrFiltro !== 'todos' ? ` · ${instrFiltro}` : ''}.
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
