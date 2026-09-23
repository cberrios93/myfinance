import { supabase } from './client'
import type { PrestamypeInstrumento, PrestamypeCuota } from '../../data/types'

async function uid(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  return user.id
}

// ── Instrumentos ──────────────────────────────────────────────

export async function listarInstrumentos(): Promise<PrestamypeInstrumento[]> {
  const { data, error } = await supabase
    .from('prestamype_instrumentos')
    .select('*')
    .order('fecha_inicio', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapInstrumento)
}

export async function guardarInstrumento(inst: PrestamypeInstrumento): Promise<void> {
  const user_id = await uid()
  const { error } = await supabase.from('prestamype_instrumentos').upsert({
    id: inst.id,
    user_id,
    tipo: inst.tipo,
    nombre: inst.nombre,
    capital_invertido: inst.capitalInvertido,
    premio_subasta: inst.premioSubasta,
    tasa_mensual: inst.tasaMensual,
    tasa_efectiva_anual: inst.tasaEfectivaAnual ?? null,
    plazo_meses: inst.plazoMeses ?? null,
    frecuencia_pago: inst.frecuenciaPago ?? null,
    fecha_inicio: inst.fechaInicio,
    fecha_vencimiento: inst.fechaVencimiento ?? null,
    valor_garantia: inst.valorGarantia ?? null,
    moneda_garantia: inst.monedaGarantia ?? null,
    ltv: inst.ltv ?? null,
    tipo_propiedad: inst.tipoPropiedad ?? null,
    ubicacion: inst.ubicacion ?? null,
    nivel_riesgo: inst.nivelRiesgo ?? null,
    estado: inst.estado,
    notas: inst.notas ?? null,
    actualizado_en: new Date().toISOString(),
  })
  if (error) throw error
}

export async function eliminarInstrumento(id: string): Promise<void> {
  const { error } = await supabase.from('prestamype_instrumentos').delete().eq('id', id)
  if (error) throw error
}

// ── Cuotas ────────────────────────────────────────────────────

export async function listarCuotas(instrumentoId: string): Promise<PrestamypeCuota[]> {
  const { data, error } = await supabase
    .from('prestamype_cuotas')
    .select('*')
    .eq('instrumento_id', instrumentoId)
    .order('numero_cuota')
  if (error) throw error
  return (data ?? []).map(mapCuota)
}

export async function insertarCuotasBulk(cuotas: PrestamypeCuota[]): Promise<void> {
  if (cuotas.length === 0) return
  const rows = cuotas.map(c => ({
    id: c.id,
    instrumento_id: c.instrumentoId,
    numero_cuota: c.numeroCuota,
    fecha_pago: c.fechaPago,
    capital_pendiente: c.capitalPendiente,
    interes: c.interes,
    amortizacion: c.amortizacion,
    cuota_total: c.cuotaTotal,
    pagado: c.pagado,
    fecha_pago_real: c.fechaPagoReal ?? null,
    rendimiento_id: c.rendimientoId ?? null,
  }))
  const { error } = await supabase.from('prestamype_cuotas').insert(rows)
  if (error) throw error
}

export async function actualizarCuota(cuota: PrestamypeCuota): Promise<void> {
  const { error } = await supabase.from('prestamype_cuotas').update({
    pagado: cuota.pagado,
    fecha_pago_real: cuota.fechaPagoReal ?? null,
    rendimiento_id: cuota.rendimientoId ?? null,
  }).eq('id', cuota.id)
  if (error) throw error
}

// ── Mappers ───────────────────────────────────────────────────

function mapInstrumento(r: Record<string, unknown>): PrestamypeInstrumento {
  return {
    id: r.id as string,
    tipo: r.tipo as 'dpf' | 'hipotecario',
    nombre: r.nombre as string,
    capitalInvertido: Number(r.capital_invertido),
    premioSubasta: Number(r.premio_subasta ?? 0),
    tasaMensual: Number(r.tasa_mensual),
    tasaEfectivaAnual: r.tasa_efectiva_anual != null ? Number(r.tasa_efectiva_anual) : undefined,
    plazoMeses: r.plazo_meses != null ? Number(r.plazo_meses) : undefined,
    frecuenciaPago: (r.frecuencia_pago as PrestamypeInstrumento['frecuenciaPago']) ?? undefined,
    fechaInicio: r.fecha_inicio as string,
    fechaVencimiento: (r.fecha_vencimiento as string) ?? undefined,
    valorGarantia: r.valor_garantia != null ? Number(r.valor_garantia) : undefined,
    monedaGarantia: (r.moneda_garantia as 'PEN' | 'USD') ?? undefined,
    ltv: r.ltv != null ? Number(r.ltv) : undefined,
    tipoPropiedad: (r.tipo_propiedad as string) ?? undefined,
    ubicacion: (r.ubicacion as string) ?? undefined,
    nivelRiesgo: (r.nivel_riesgo as PrestamypeInstrumento['nivelRiesgo']) ?? undefined,
    estado: r.estado as PrestamypeInstrumento['estado'],
    notas: (r.notas as string) ?? undefined,
    creadoEn: r.creado_en as string,
    actualizadoEn: r.actualizado_en as string,
  }
}

function mapCuota(r: Record<string, unknown>): PrestamypeCuota {
  return {
    id: r.id as string,
    instrumentoId: r.instrumento_id as string,
    numeroCuota: Number(r.numero_cuota),
    fechaPago: r.fecha_pago as string,
    capitalPendiente: Number(r.capital_pendiente),
    interes: Number(r.interes),
    amortizacion: Number(r.amortizacion),
    cuotaTotal: Number(r.cuota_total),
    pagado: Boolean(r.pagado),
    fechaPagoReal: (r.fecha_pago_real as string) ?? undefined,
    rendimientoId: (r.rendimiento_id as string) ?? undefined,
    creadoEn: r.creado_en as string,
  }
}
