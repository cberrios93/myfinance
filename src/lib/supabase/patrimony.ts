import { supabase } from './client'
import type { CuentaPatrimonio, CuentaLog, HistorialMensual, CategoriaPatrimonio } from '../../data/types'

// --- Cuentas ---

function rowToCuenta(r: Record<string, unknown>): CuentaPatrimonio {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    categoria: r.categoria as CategoriaPatrimonio,
    montoPEN: r.monto_pen != null ? Number(r.monto_pen) : undefined,
    montoUSD: r.monto_usd != null ? Number(r.monto_usd) : undefined,
    esRiesgo: r.es_riesgo as boolean,
    pinned: r.pinned as boolean ?? false,
    isHidden: r.is_hidden as boolean ?? false,
    orden: r.orden as number,
    creadoEn: r.creado_en as string,
    actualizadoEn: r.actualizado_en as string,
  }
}

export async function listarCuentas(): Promise<CuentaPatrimonio[]> {
  const { data, error } = await supabase
    .from('cuentas')
    .select('*')
    .order('orden', { ascending: true })
    .order('creado_en', { ascending: true })
  if (error) throw error
  return (data ?? []).map(rowToCuenta)
}

export async function guardarCuenta(cuenta: CuentaPatrimonio): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('cuentas').upsert({
    id: cuenta.id,
    user_id: user.id,
    nombre: cuenta.nombre,
    categoria: cuenta.categoria,
    monto_pen: cuenta.montoPEN ?? null,
    monto_usd: cuenta.montoUSD ?? null,
    es_riesgo: cuenta.esRiesgo,
    pinned: cuenta.pinned,
    is_hidden: cuenta.isHidden,
    orden: cuenta.orden,
    actualizado_en: new Date().toISOString(),
  })
  if (error) throw error
}

export async function togglePinnedCuenta(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('cuentas').update({ pinned }).eq('id', id)
  if (error) throw error
}

export async function toggleHiddenCuenta(id: string, isHidden: boolean): Promise<void> {
  const { error } = await supabase.from('cuentas').update({ is_hidden: isHidden }).eq('id', id)
  if (error) throw error
}

export async function eliminarCuenta(id: string): Promise<void> {
  const { error } = await supabase.from('cuentas').delete().eq('id', id)
  if (error) throw error
}

// --- Log de cambios por cuenta ---

function rowToLog(r: Record<string, unknown>): CuentaLog {
  return {
    id: r.id as string,
    cuentaId: r.cuenta_id as string,
    montoPEN: r.monto_pen != null ? Number(r.monto_pen) : undefined,
    montoUSD: r.monto_usd != null ? Number(r.monto_usd) : undefined,
    creadoEn: r.creado_en as string,
  }
}

export async function registrarLogCuenta(
  cuentaId: string,
  montoPEN?: number,
  montoUSD?: number,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await supabase.from('cuenta_log').insert({
    user_id: user.id,
    cuenta_id: cuentaId,
    monto_pen: montoPEN ?? null,
    monto_usd: montoUSD ?? null,
  })

  // Mantener solo los últimos 5 por cuenta
  const { data: all } = await supabase
    .from('cuenta_log')
    .select('id')
    .eq('cuenta_id', cuentaId)
    .order('creado_en', { ascending: false })

  if (all && all.length > 5) {
    const toDelete = all.slice(5).map((r: { id: string }) => r.id)
    await supabase.from('cuenta_log').delete().in('id', toDelete)
  }
}

export async function listarLogCuenta(cuentaId: string): Promise<CuentaLog[]> {
  const { data, error } = await supabase
    .from('cuenta_log')
    .select('*')
    .eq('cuenta_id', cuentaId)
    .order('creado_en', { ascending: false })
    .limit(5)
  if (error) throw error
  return (data ?? []).map(rowToLog)
}

// --- Historial ---

function rowToHistorial(r: Record<string, unknown>): HistorialMensual {
  return {
    id: r.id as string,
    fecha: r.fecha as string,
    periodo: r.periodo as string,
    totalPEN: Number(r.total_pen),
    totalUSD: Number(r.total_usd),
    tipoCambio: Number(r.tipo_cambio),
    nota: r.nota as string | undefined,
    creadoEn: r.creado_en as string,
    actualizadoEn: r.actualizado_en as string,
  }
}

export async function listarHistorial(): Promise<HistorialMensual[]> {
  const { data, error } = await supabase
    .from('historial_mensual')
    .select('*')
    .order('fecha', { ascending: true })
  if (error) throw error
  return (data ?? []).map(rowToHistorial)
}

export async function guardarHistorial(h: HistorialMensual): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('historial_mensual').upsert({
    id: h.id,
    user_id: user.id,
    fecha: h.fecha,
    periodo: h.periodo,
    total_pen: h.totalPEN,
    total_usd: h.totalUSD,
    tipo_cambio: h.tipoCambio,
    nota: h.nota ?? null,
    actualizado_en: new Date().toISOString(),
  })
  if (error) throw error
}

export async function eliminarHistorial(id: string): Promise<void> {
  const { error } = await supabase.from('historial_mensual').delete().eq('id', id)
  if (error) throw error
}
