import { useState, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuid } from 'uuid'
import {
  Plus, X, ChevronLeft, Building2, Landmark, CheckCircle2,
  Clock, AlertTriangle, Edit2, Trash2, TrendingUp,
} from 'lucide-react'
import type { PrestamypeInstrumento, PrestamypeCuota, Rendimiento } from '../../data/types'
import {
  listarInstrumentos, guardarInstrumento, eliminarInstrumento,
  listarCuotas, insertarCuotasBulk, actualizarCuota,
} from '../../lib/supabase/prestamype'
import { guardarRendimiento } from '../../lib/supabase/finance'
import { useUndo } from '../../contexts/UndoContext'

// ── Helpers ───────────────────────────────────────────────────

function r2(n: number) { return Math.round(n * 100) / 100 }
function fmt(n: number) { return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

function calcTEA(tasaMensual: number): number {
  return r2((Math.pow(1 + tasaMensual, 12) - 1) * 100)
}

function generarCronogramaHipotecario(
  inst: PrestamypeInstrumento
): PrestamypeCuota[] {
  const { capitalInvertido, tasaMensual, plazoMeses, fechaInicio } = inst
  if (!plazoMeses) return []
  const tm = tasaMensual / 100
  const cuotaFija = capitalInvertido * tm / (1 - Math.pow(1 + tm, -plazoMeses))
  const cuotas: PrestamypeCuota[] = []
  let cap = capitalInvertido

  for (let i = 1; i <= plazoMeses; i++) {
    const interes = r2(cap * tm)
    const amort = i < plazoMeses ? r2(cuotaFija - interes) : r2(cap)
    const cuotaTotal = r2(interes + amort)
    cuotas.push({
      id: uuid(),
      instrumentoId: inst.id,
      numeroCuota: i,
      fechaPago: addMonths(fechaInicio, i),
      capitalPendiente: r2(cap),
      interes,
      amortizacion: amort,
      cuotaTotal,
      pagado: false,
      creadoEn: new Date().toISOString(),
    })
    cap = r2(cap - amort)
  }
  return cuotas
}

function generarCronogramaDPF(inst: PrestamypeInstrumento): PrestamypeCuota[] {
  const { capitalInvertido, tasaMensual, frecuenciaPago, fechaInicio, fechaVencimiento } = inst
  if (!fechaVencimiento) return []
  const tm = tasaMensual / 100

  const mesesPorCuota: Record<string, number> = {
    mensual: 1, trimestral: 3, semestral: 6, al_vencimiento: 0,
  }
  const freq = frecuenciaPago ?? 'mensual'
  const paso = mesesPorCuota[freq] ?? 1

  const cuotas: PrestamypeCuota[] = []

  if (freq === 'al_vencimiento') {
    const fechaVenc = new Date(fechaVencimiento + 'T00:00:00')
    const fechaIni = new Date(fechaInicio + 'T00:00:00')
    const meses = (fechaVenc.getFullYear() - fechaIni.getFullYear()) * 12
      + (fechaVenc.getMonth() - fechaIni.getMonth())
    const interesTotal = r2(capitalInvertido * tm * meses)
    cuotas.push({
      id: uuid(), instrumentoId: inst.id, numeroCuota: 1,
      fechaPago: fechaVencimiento,
      capitalPendiente: capitalInvertido,
      interes: interesTotal,
      amortizacion: capitalInvertido,
      cuotaTotal: r2(capitalInvertido + interesTotal),
      pagado: false, creadoEn: new Date().toISOString(),
    })
    return cuotas
  }

  let numCuota = 1
  let fechaActual = addMonths(fechaInicio, paso)

  while (fechaActual <= fechaVencimiento) {
    const isLast = addMonths(fechaActual, paso) > fechaVencimiento
    const interesPeriodo = r2(capitalInvertido * tm * paso)
    const amortizacion = isLast ? capitalInvertido : 0
    cuotas.push({
      id: uuid(), instrumentoId: inst.id, numeroCuota: numCuota++,
      fechaPago: fechaActual,
      capitalPendiente: capitalInvertido,
      interes: interesPeriodo,
      amortizacion,
      cuotaTotal: r2(interesPeriodo + amortizacion),
      pagado: false, creadoEn: new Date().toISOString(),
    })
    fechaActual = addMonths(fechaActual, paso)
  }
  return cuotas
}

// ── Tipos locales ─────────────────────────────────────────────

type Vista = 'lista' | 'detalle' | 'form'

type DraftInst = {
  tipo: 'dpf' | 'hipotecario'
  nombre: string
  capitalInvertido: string
  premioSubasta: string
  tasaMensual: string
  plazoMeses: string
  frecuenciaPago: PrestamypeInstrumento['frecuenciaPago']
  fechaInicio: string
  fechaVencimiento: string
  valorGarantia: string
  monedaGarantia: 'PEN' | 'USD'
  ltv: string
  tipoPropiedad: string
  ubicacion: string
  nivelRiesgo: PrestamypeInstrumento['nivelRiesgo']
  estado: PrestamypeInstrumento['estado']
  notas: string
}

function emptyDraft(): DraftInst {
  return {
    tipo: 'dpf', nombre: '', capitalInvertido: '', premioSubasta: '0',
    tasaMensual: '', plazoMeses: '', frecuenciaPago: 'mensual',
    fechaInicio: todayISO(), fechaVencimiento: '', valorGarantia: '',
    monedaGarantia: 'USD', ltv: '', tipoPropiedad: '', ubicacion: '',
    nivelRiesgo: 'medio', estado: 'activo', notas: '',
  }
}

function draftToInstrumento(d: DraftInst, id?: string): PrestamypeInstrumento {
  const now = new Date().toISOString()
  const tasa = parseFloat(d.tasaMensual)
  const inst: PrestamypeInstrumento = {
    id: id ?? uuid(),
    tipo: d.tipo,
    nombre: d.nombre.trim(),
    capitalInvertido: parseFloat(d.capitalInvertido),
    premioSubasta: parseFloat(d.premioSubasta) || 0,
    tasaMensual: tasa,
    tasaEfectivaAnual: isNaN(tasa) ? undefined : calcTEA(tasa),
    plazoMeses: d.tipo === 'hipotecario' && d.plazoMeses ? parseInt(d.plazoMeses) : undefined,
    frecuenciaPago: d.tipo === 'dpf' ? d.frecuenciaPago : undefined,
    fechaInicio: d.fechaInicio,
    fechaVencimiento: d.tipo === 'dpf' && d.fechaVencimiento ? d.fechaVencimiento : undefined,
    valorGarantia: d.valorGarantia ? parseFloat(d.valorGarantia) : undefined,
    monedaGarantia: d.tipo === 'hipotecario' ? d.monedaGarantia : undefined,
    ltv: d.ltv ? parseFloat(d.ltv) : undefined,
    tipoPropiedad: d.tipoPropiedad || undefined,
    ubicacion: d.ubicacion || undefined,
    nivelRiesgo: d.nivelRiesgo,
    estado: d.estado,
    notas: d.notas || undefined,
    creadoEn: now,
    actualizadoEn: now,
  }
  if (d.tipo === 'hipotecario' && d.plazoMeses) {
    inst.fechaVencimiento = addMonths(d.fechaInicio, parseInt(d.plazoMeses))
  }
  return inst
}

function instToDraft(inst: PrestamypeInstrumento): DraftInst {
  return {
    tipo: inst.tipo,
    nombre: inst.nombre,
    capitalInvertido: String(inst.capitalInvertido),
    premioSubasta: String(inst.premioSubasta),
    tasaMensual: String(inst.tasaMensual),
    plazoMeses: inst.plazoMeses ? String(inst.plazoMeses) : '',
    frecuenciaPago: inst.frecuenciaPago ?? 'mensual',
    fechaInicio: inst.fechaInicio,
    fechaVencimiento: inst.fechaVencimiento ?? '',
    valorGarantia: inst.valorGarantia ? String(inst.valorGarantia) : '',
    monedaGarantia: inst.monedaGarantia ?? 'USD',
    ltv: inst.ltv ? String(inst.ltv) : '',
    tipoPropiedad: inst.tipoPropiedad ?? '',
    ubicacion: inst.ubicacion ?? '',
    nivelRiesgo: inst.nivelRiesgo ?? 'medio',
    estado: inst.estado,
    notas: inst.notas ?? '',
  }
}

// ── Estilos compartidos ───────────────────────────────────────

const inp = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }
const cardStyle = { background: 'var(--color-card)', border: '1px solid var(--color-borde)' }

// ── Componente principal ──────────────────────────────────────

export default function Prestamype() {
  const { showUndo } = useUndo()
  const [vista, setVista] = useState<Vista>('lista')
  const [instrumentos, setInstrumentos] = useState<PrestamypeInstrumento[]>([])
  const [cuotas, setCuotas] = useState<PrestamypeCuota[]>([])
  const [seleccionado, setSeleccionado] = useState<PrestamypeInstrumento | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingCuotas, setLoadingCuotas] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftInst>(emptyDraft())
  const [confirmPagoId, setConfirmPagoId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try { setInstrumentos(await listarInstrumentos()) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirDetalle = useCallback(async (inst: PrestamypeInstrumento) => {
    setSeleccionado(inst)
    setVista('detalle')
    setLoadingCuotas(true)
    try { setCuotas(await listarCuotas(inst.id)) }
    finally { setLoadingCuotas(false) }
  }, [])

  const abrirFormNuevo = useCallback(() => {
    setEditandoId(null)
    setDraft(emptyDraft())
    setVista('form')
  }, [])

  const abrirFormEditar = useCallback((inst: PrestamypeInstrumento) => {
    setEditandoId(inst.id)
    setDraft(instToDraft(inst))
    setVista('form')
  }, [])

  const handleGuardar = useCallback(async () => {
    const { capitalInvertido, tasaMensual, nombre, tipo, plazoMeses, fechaVencimiento } = draft
    if (!nombre || !capitalInvertido || !tasaMensual) return
    if (tipo === 'hipotecario' && !plazoMeses) return
    if (tipo === 'dpf' && !fechaVencimiento) return

    setGuardando(true)
    try {
      const inst = draftToInstrumento(draft, editandoId ?? undefined)
      await guardarInstrumento(inst)

      if (!editandoId) {
        const cronograma = inst.tipo === 'hipotecario'
          ? generarCronogramaHipotecario(inst)
          : generarCronogramaDPF(inst)
        await insertarCuotasBulk(cronograma)
      }

      await cargar()
      setVista('lista')
    } finally {
      setGuardando(false)
    }
  }, [draft, editandoId, cargar])

  const handleEliminar = useCallback(async (inst: PrestamypeInstrumento) => {
    setInstrumentos(prev => prev.filter(i => i.id !== inst.id))
    await eliminarInstrumento(inst.id)
    showUndo(`"${inst.nombre}" eliminado`, async () => {
      await guardarInstrumento(inst)
      await cargar()
    })
    if (vista === 'detalle' && seleccionado?.id === inst.id) setVista('lista')
  }, [instrumentos, vista, seleccionado, showUndo, cargar])

  const handleMarcarPagado = useCallback(async (cuotaId: string) => {
    const cuota = cuotas.find(c => c.id === cuotaId)
    if (!cuota || !seleccionado) return

    const fechaHoy = todayISO()
    const cuotaActualizada: PrestamypeCuota = { ...cuota, pagado: true, fechaPagoReal: fechaHoy }

    // Crear rendimiento automáticamente
    const d = new Date(fechaHoy)
    const rendimiento: Rendimiento = {
      id: uuid(),
      anio: d.getFullYear(),
      mes: d.getMonth() + 1,
      instrumentoNombre: seleccionado.nombre,
      fechaPago: fechaHoy,
      gananciasPEN: cuota.interes,
      inversionPEN: cuota.capitalPendiente + seleccionado.premioSubasta,
      rentabilidad: undefined,
      tasaImpuesto: 0,
      impuestoPagado: false,
      esCierreFiscal: false,
      reinvertido: false,
      marcado: false,
      esTraspaso: false,
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    }

    cuotaActualizada.rendimientoId = rendimiento.id

    // Optimistic update
    setCuotas(prev => prev.map(c => c.id === cuotaId ? cuotaActualizada : c))

    try {
      await guardarRendimiento(rendimiento)
      await actualizarCuota(cuotaActualizada)
    } catch {
      setCuotas(prev => prev.map(c => c.id === cuotaId ? cuota : c))
    }
    setConfirmPagoId(null)
  }, [cuotas, seleccionado])

  // ── KPIs ─────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const activos = instrumentos.filter(i => i.estado === 'activo')
    const capitalTotal = activos.reduce((s, i) => s + i.capitalInvertido + i.premioSubasta, 0)
    const anioActual = new Date().getFullYear()

    // Para calcular interés YTD necesitamos las cuotas — no disponibles en vista lista
    // Aproximamos con tasa mensual * capital * meses transcurridos
    const mesActual = new Date().getMonth() + 1
    const interesYTD = activos.reduce((s, i) => {
      const mesesEnAnio = mesActual
      const interesMes = i.capitalInvertido * (i.tasaMensual / 100)
      return s + interesMes * mesesEnAnio
    }, 0)

    const yieldPonderado = capitalTotal > 0
      ? activos.reduce((s, i) => s + (i.tasaMensual / 100) * i.capitalInvertido, 0) / capitalTotal * 100
      : 0

    return { capitalTotal, interesYTD, yieldPonderado, anioActual }
  }, [instrumentos])

  const dpfs = instrumentos.filter(i => i.tipo === 'dpf')
  const hipotecarios = instrumentos.filter(i => i.tipo === 'hipotecario')

  // ── Render ────────────────────────────────────────────────────

  if (vista === 'form') {
    return <FormInstrumento
      draft={draft}
      onChange={setDraft}
      onGuardar={handleGuardar}
      onCancelar={() => setVista(editandoId ? 'detalle' : 'lista')}
      guardando={guardando}
      esEdicion={!!editandoId}
    />
  }

  if (vista === 'detalle' && seleccionado) {
    return <DetalleInstrumento
      inst={seleccionado}
      cuotas={cuotas}
      loading={loadingCuotas}
      confirmPagoId={confirmPagoId}
      onConfirmPago={setConfirmPagoId}
      onMarcarPagado={handleMarcarPagado}
      onEditar={() => abrirFormEditar(seleccionado)}
      onEliminar={() => handleEliminar(seleccionado)}
      onVolver={() => setVista('lista')}
    />
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Prestamype</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
            DPFs y préstamos con garantía hipotecaria
          </p>
        </div>
        <button
          onClick={abrirFormNuevo}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--color-acento)' }}
        >
          <Plus size={15} /> Nuevo instrumento
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Capital total invertido" value={`S/ ${fmt(kpis.capitalTotal)}`} />
        <KpiCard label={`Interés estimado ${kpis.anioActual}`} value={`S/ ${fmt(kpis.interesYTD)}`} sub="Aprox. a tasa mensual simple" />
        <KpiCard label="Yield mensual ponderado" value={`${kpis.yieldPonderado.toFixed(2)}%`} sub={`TEA: ${calcTEA(kpis.yieldPonderado / 100).toFixed(2)}%`} />
      </div>

      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--color-muted)' }}>Cargando…</p>
      ) : instrumentos.length === 0 ? (
        <div className="py-16 text-center" style={{ color: 'var(--color-muted)' }}>
          <Landmark size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aún no tienes instrumentos Prestamype registrados.</p>
          <button onClick={abrirFormNuevo} className="mt-4 text-sm underline" style={{ color: 'var(--color-acento)' }}>
            Agregar el primero
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {dpfs.length > 0 && (
            <SeccionInstrumentos
              titulo="DPF — Depósitos a Plazo Fijo"
              instrumentos={dpfs}
              onVerDetalle={abrirDetalle}
              onEditar={abrirFormEditar}
              onEliminar={handleEliminar}
            />
          )}
          {hipotecarios.length > 0 && (
            <SeccionInstrumentos
              titulo="Préstamos con Garantía Hipotecaria"
              instrumentos={hipotecarios}
              onVerDetalle={abrirDetalle}
              onEditar={abrirFormEditar}
              onEliminar={handleEliminar}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Subcomponentes ────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={cardStyle}>
      <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: 'var(--color-texto)' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{sub}</p>}
    </div>
  )
}

function BadgeEstado({ estado }: { estado: PrestamypeInstrumento['estado'] }) {
  const map = {
    activo: { label: 'Activo', color: '#10B981', bg: '#10B98115' },
    cancelado: { label: 'Cancelado', color: 'var(--color-muted)', bg: 'var(--color-fondo)' },
    mora: { label: 'Mora', color: '#EF4444', bg: '#EF444415' },
  }
  const s = map[estado]
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

function BadgeRiesgo({ riesgo }: { riesgo?: PrestamypeInstrumento['nivelRiesgo'] }) {
  if (!riesgo) return null
  const map = {
    bajo: { label: 'Bajo', color: '#10B981' },
    medio: { label: 'Medio', color: '#F59E0B' },
    alto: { label: 'Alto', color: '#EF4444' },
  }
  const s = map[riesgo]
  return <span className="text-xs font-medium" style={{ color: s.color }}>{s.label}</span>
}

function SeccionInstrumentos({ titulo, instrumentos, onVerDetalle, onEditar, onEliminar }: {
  titulo: string
  instrumentos: PrestamypeInstrumento[]
  onVerDetalle: (i: PrestamypeInstrumento) => void
  onEditar: (i: PrestamypeInstrumento) => void
  onEliminar: (i: PrestamypeInstrumento) => void
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
        {titulo}
      </h2>
      <div className="space-y-3">
        {instrumentos.map(inst => (
          <div
            key={inst.id}
            className="rounded-xl p-4 cursor-pointer transition-opacity hover:opacity-90"
            style={cardStyle}
            onClick={() => onVerDetalle(inst)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold" style={{ color: 'var(--color-texto)' }}>{inst.nombre}</span>
                  <BadgeEstado estado={inst.estado} />
                  {inst.nivelRiesgo && <BadgeRiesgo riesgo={inst.nivelRiesgo} />}
                </div>
                {inst.ubicacion && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{inst.ubicacion}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                  <span style={{ color: 'var(--color-texto)' }}>
                    <span style={{ color: 'var(--color-muted)' }}>Capital: </span>
                    S/ {fmt(inst.capitalInvertido)}
                    {inst.premioSubasta > 0 && (
                      <span className="ml-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                        +S/ {fmt(inst.premioSubasta)} subasta
                      </span>
                    )}
                  </span>
                  <span style={{ color: 'var(--color-texto)' }}>
                    <span style={{ color: 'var(--color-muted)' }}>Tasa: </span>
                    {inst.tasaMensual}% mensual
                    {inst.tasaEfectivaAnual != null && (
                      <span className="ml-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                        ({inst.tasaEfectivaAnual.toFixed(2)}% TEA)
                      </span>
                    )}
                  </span>
                  {inst.tipo === 'hipotecario' && inst.plazoMeses && (
                    <span style={{ color: 'var(--color-texto)' }}>
                      <span style={{ color: 'var(--color-muted)' }}>Plazo: </span>
                      {inst.plazoMeses} meses
                    </span>
                  )}
                  {inst.tipo === 'dpf' && (
                    <span className="capitalize" style={{ color: 'var(--color-texto)' }}>
                      <span style={{ color: 'var(--color-muted)' }}>Pago: </span>
                      {inst.frecuenciaPago}
                    </span>
                  )}
                  {inst.fechaVencimiento && (
                    <span style={{ color: 'var(--color-texto)' }}>
                      <span style={{ color: 'var(--color-muted)' }}>Vence: </span>
                      {inst.fechaVencimiento}
                    </span>
                  )}
                  {inst.ltv != null && (
                    <span style={{ color: 'var(--color-texto)' }}>
                      <span style={{ color: 'var(--color-muted)' }}>LTV: </span>
                      {inst.ltv}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => onEditar(inst)}
                  className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--color-muted)' }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => onEliminar(inst)}
                  className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--color-muted)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DetalleInstrumento({ inst, cuotas, loading, confirmPagoId, onConfirmPago, onMarcarPagado, onEditar, onEliminar, onVolver }: {
  inst: PrestamypeInstrumento
  cuotas: PrestamypeCuota[]
  loading: boolean
  confirmPagoId: string | null
  onConfirmPago: (id: string | null) => void
  onMarcarPagado: (id: string) => void
  onEditar: () => void
  onEliminar: () => void
  onVolver: () => void
}) {
  const pagadas = cuotas.filter(c => c.pagado)
  const pendientes = cuotas.filter(c => !c.pagado)
  const interesTotal = cuotas.reduce((s, c) => s + c.interes, 0)
  const interesCobrado = pagadas.reduce((s, c) => s + c.interes, 0)
  const proxima = pendientes[0]

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back */}
      <button
        onClick={onVolver}
        className="flex items-center gap-1.5 text-sm"
        style={{ color: 'var(--color-muted)' }}
      >
        <ChevronLeft size={16} /> Volver
      </button>

      {/* Header */}
      <div className="rounded-xl p-5" style={cardStyle}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {inst.tipo === 'dpf'
                ? <Building2 size={18} style={{ color: 'var(--color-acento)' }} />
                : <Landmark size={18} style={{ color: 'var(--color-acento)' }} />
              }
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-texto)' }}>{inst.nombre}</h2>
              <BadgeEstado estado={inst.estado} />
              {inst.nivelRiesgo && <BadgeRiesgo riesgo={inst.nivelRiesgo} />}
            </div>
            {inst.ubicacion && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{inst.ubicacion}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={onEditar} className="p-2 rounded-lg" style={{ color: 'var(--color-muted)' }}>
              <Edit2 size={15} />
            </button>
            <button onClick={onEliminar} className="p-2 rounded-lg" style={{ color: 'var(--color-muted)' }}>
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Capital invertido</p>
            <p className="font-semibold" style={{ color: 'var(--color-texto)' }}>S/ {fmt(inst.capitalInvertido)}</p>
            {inst.premioSubasta > 0 && (
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>+S/ {fmt(inst.premioSubasta)} subasta</p>
            )}
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Tasa mensual / TEA</p>
            <p className="font-semibold" style={{ color: 'var(--color-texto)' }}>
              {inst.tasaMensual}% / {inst.tasaEfectivaAnual?.toFixed(2)}%
            </p>
          </div>
          {inst.tipo === 'hipotecario' && inst.plazoMeses && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Plazo</p>
              <p className="font-semibold" style={{ color: 'var(--color-texto)' }}>{inst.plazoMeses} meses</p>
            </div>
          )}
          {inst.tipo === 'dpf' && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Frecuencia de pago</p>
              <p className="font-semibold capitalize" style={{ color: 'var(--color-texto)' }}>
                {inst.frecuenciaPago}
              </p>
            </div>
          )}
          {inst.fechaInicio && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Inicio / Vencimiento</p>
              <p className="font-semibold text-sm" style={{ color: 'var(--color-texto)' }}>
                {inst.fechaInicio} → {inst.fechaVencimiento ?? '—'}
              </p>
            </div>
          )}
          {inst.ltv != null && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>LTV</p>
              <p className="font-semibold" style={{ color: 'var(--color-texto)' }}>{inst.ltv}%</p>
            </div>
          )}
          {inst.valorGarantia != null && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Valor garantía</p>
              <p className="font-semibold" style={{ color: 'var(--color-texto)' }}>
                {inst.monedaGarantia === 'USD' ? '$' : 'S/'} {fmt(inst.valorGarantia)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Resumen cuotas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Cuotas pagadas" value={`${pagadas.length} / ${cuotas.length}`} />
        <KpiCard label="Interés cobrado" value={`S/ ${fmt(interesCobrado)}`} />
        <KpiCard label="Interés total proyectado" value={`S/ ${fmt(interesTotal)}`} />
        {proxima && (
          <KpiCard
            label="Próxima cuota"
            value={`S/ ${fmt(proxima.cuotaTotal)}`}
            sub={proxima.fechaPago}
          />
        )}
      </div>

      {/* Cronograma */}
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-borde)' }}>
          <TrendingUp size={15} style={{ color: 'var(--color-acento)' }} />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--color-texto)' }}>Cronograma de pagos</h3>
        </div>
        {loading ? (
          <p className="text-sm p-6 text-center" style={{ color: 'var(--color-muted)' }}>Cargando cronograma…</p>
        ) : cuotas.length === 0 ? (
          <p className="text-sm p-6 text-center" style={{ color: 'var(--color-muted)' }}>Sin cuotas generadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-borde)' }}>
                  {['#', 'Fecha', 'Capital pendiente', 'Interés', 'Amortización', 'Cuota total', 'Estado', ''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cuotas.map(c => (
                  <tr
                    key={c.id}
                    className="border-b transition-colors"
                    style={{
                      borderColor: 'var(--color-borde)',
                      background: c.pagado ? 'var(--color-fondo)' : 'transparent',
                      opacity: c.pagado ? 0.6 : 1,
                    }}
                  >
                    <td className="px-3 py-2.5" style={{ color: 'var(--color-muted)' }}>{c.numeroCuota}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--color-texto)' }}>{c.fechaPago}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--color-texto)' }}>S/ {fmt(c.capitalPendiente)}</td>
                    <td className="px-3 py-2.5 font-medium" style={{ color: '#10B981' }}>S/ {fmt(c.interes)}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--color-texto)' }}>
                      {c.amortizacion > 0 ? `S/ ${fmt(c.amortizacion)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--color-texto)' }}>
                      S/ {fmt(c.cuotaTotal)}
                    </td>
                    <td className="px-3 py-2.5">
                      {c.pagado ? (
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#10B981' }}>
                          <CheckCircle2 size={13} /> {c.fechaPagoReal ?? 'Pagado'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                          <Clock size={13} /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {!c.pagado && (
                        confirmPagoId === c.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onMarcarPagado(c.id)}
                              className="text-xs px-2 py-1 rounded-lg font-medium text-white"
                              style={{ background: '#10B981' }}
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => onConfirmPago(null)}
                              className="p-1 rounded"
                              style={{ color: 'var(--color-muted)' }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onConfirmPago(c.id)}
                            className="text-xs px-2 py-1 rounded-lg"
                            style={{ color: 'var(--color-acento)', border: '1px solid var(--color-acento)' }}
                          >
                            Marcar pagado
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function FormInstrumento({ draft, onChange, onGuardar, onCancelar, guardando, esEdicion }: {
  draft: DraftInst
  onChange: (d: DraftInst) => void
  onGuardar: () => void
  onCancelar: () => void
  guardando: boolean
  esEdicion: boolean
}) {
  const set = (k: keyof DraftInst, v: string) => onChange({ ...draft, [k]: v })

  const labelStyle = { color: 'var(--color-muted)', fontSize: '12px', marginBottom: '4px', display: 'block' }
  const inputClass = 'w-full rounded-lg px-3 py-2 text-sm'

  const esValido = draft.nombre.trim()
    && draft.capitalInvertido
    && draft.tasaMensual
    && (draft.tipo === 'hipotecario' ? !!draft.plazoMeses : !!draft.fechaVencimiento)

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onCancelar} className="p-1.5 rounded-lg" style={{ color: 'var(--color-muted)' }}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-texto)' }}>
          {esEdicion ? 'Editar instrumento' : 'Nuevo instrumento Prestamype'}
        </h2>
      </div>

      <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
        {/* Tipo */}
        <div>
          <label style={labelStyle}>Tipo de instrumento</label>
          <div className="flex gap-2">
            {(['dpf', 'hipotecario'] as const).map(t => (
              <button
                key={t}
                onClick={() => onChange({ ...draft, tipo: t })}
                className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors"
                style={{
                  background: draft.tipo === t ? 'var(--color-acento)' : 'var(--color-fondo)',
                  color: draft.tipo === t ? '#fff' : 'var(--color-muted)',
                  border: '1px solid var(--color-borde)',
                }}
              >
                {t === 'dpf' ? 'DPF' : 'Hipotecario'}
              </button>
            ))}
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label style={labelStyle}>Nombre / Identificador *</label>
          <input
            className={inputClass} style={inp}
            placeholder={draft.tipo === 'dpf' ? 'Ej: DPF Prestamype #3' : 'Ej: La Libertad - Guadalupe'}
            value={draft.nombre} onChange={e => set('nombre', e.target.value)}
          />
        </div>

        {/* Capital + Premio */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Capital invertido (S/) *</label>
            <input
              type="number" className={inputClass} style={inp}
              placeholder="216000" value={draft.capitalInvertido}
              onChange={e => set('capitalInvertido', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Premio subasta (S/)</label>
            <input
              type="number" className={inputClass} style={inp}
              placeholder="0" value={draft.premioSubasta}
              onChange={e => set('premioSubasta', e.target.value)}
            />
          </div>
        </div>

        {/* Tasa */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Tasa mensual (%) *</label>
            <input
              type="number" step="0.01" className={inputClass} style={inp}
              placeholder="1.8" value={draft.tasaMensual}
              onChange={e => set('tasaMensual', e.target.value)}
            />
          </div>
          <div className="flex items-end pb-2">
            {draft.tasaMensual && !isNaN(parseFloat(draft.tasaMensual)) && (
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                TEA: {calcTEA(parseFloat(draft.tasaMensual) / 100).toFixed(2)}%
              </p>
            )}
          </div>
        </div>

        {/* Campos según tipo */}
        {draft.tipo === 'hipotecario' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Plazo (meses) *</label>
              <input
                type="number" className={inputClass} style={inp}
                placeholder="48" value={draft.plazoMeses}
                onChange={e => set('plazoMeses', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Riesgo</label>
              <select
                className={inputClass} style={inp}
                value={draft.nivelRiesgo ?? ''}
                onChange={e => onChange({ ...draft, nivelRiesgo: e.target.value as PrestamypeInstrumento['nivelRiesgo'] })}
              >
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Frecuencia de pago *</label>
              <select
                className={inputClass} style={inp}
                value={draft.frecuenciaPago ?? 'mensual'}
                onChange={e => onChange({ ...draft, frecuenciaPago: e.target.value as DraftInst['frecuenciaPago'] })}
              >
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="al_vencimiento">Al vencimiento</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Fecha vencimiento *</label>
              <input
                type="date" className={inputClass} style={inp}
                value={draft.fechaVencimiento}
                onChange={e => set('fechaVencimiento', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Fecha inicio */}
        <div>
          <label style={labelStyle}>Fecha de inicio *</label>
          <input
            type="date" className={inputClass} style={inp}
            value={draft.fechaInicio}
            onChange={e => set('fechaInicio', e.target.value)}
          />
        </div>

        {/* Garantía (solo hipotecario) */}
        {draft.tipo === 'hipotecario' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Valor garantía</label>
              <input
                type="number" className={inputClass} style={inp}
                placeholder="166440" value={draft.valorGarantia}
                onChange={e => set('valorGarantia', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Moneda garantía</label>
              <select
                className={inputClass} style={inp}
                value={draft.monedaGarantia}
                onChange={e => onChange({ ...draft, monedaGarantia: e.target.value as 'PEN' | 'USD' })}
              >
                <option value="USD">USD</option>
                <option value="PEN">PEN</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>LTV (%)</label>
              <input
                type="number" className={inputClass} style={inp}
                placeholder="39" value={draft.ltv}
                onChange={e => set('ltv', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Tipo de propiedad</label>
              <input
                className={inputClass} style={inp}
                placeholder="Casa, Departamento…" value={draft.tipoPropiedad}
                onChange={e => set('tipoPropiedad', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label style={labelStyle}>Ubicación</label>
              <input
                className={inputClass} style={inp}
                placeholder="Ej: La Libertad, Guadalupe" value={draft.ubicacion}
                onChange={e => set('ubicacion', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Estado */}
        <div>
          <label style={labelStyle}>Estado</label>
          <select
            className={inputClass} style={inp}
            value={draft.estado}
            onChange={e => onChange({ ...draft, estado: e.target.value as PrestamypeInstrumento['estado'] })}
          >
            <option value="activo">Activo</option>
            <option value="cancelado">Cancelado</option>
            <option value="mora">En mora</option>
          </select>
        </div>

        {/* Notas */}
        <div>
          <label style={labelStyle}>Notas</label>
          <textarea
            className={inputClass} style={inp}
            rows={2} placeholder="Observaciones opcionales…"
            value={draft.notas}
            onChange={e => set('notas', e.target.value)}
          />
        </div>

        {!esEdicion && (
          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'var(--color-fondo)' }}>
            <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: '#F59E0B' }} />
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Al guardar se generará el cronograma completo de cuotas automáticamente.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onGuardar}
          disabled={!esValido || guardando}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--color-acento)' }}
        >
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear instrumento'}
        </button>
        <button
          onClick={onCancelar}
          className="px-5 py-2 rounded-lg text-sm"
          style={{ color: 'var(--color-muted)' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
