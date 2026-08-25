import { supabase } from './client'
import type { CuentaPatrimonio, HistorialMensual, CategoriaPatrimonio } from '../../data/types'

// --- Cuentas ---

function rowToCuenta(r: Record<string, unknown>): CuentaPatrimonio {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    categoria: r.categoria as CategoriaPatrimonio,
    montoPEN: r.monto_pen != null ? Number(r.monto_pen) : undefined,
    montoUSD: r.monto_usd != null ? Number(r.monto_usd) : undefined,
    esRiesgo: r.es_riesgo as boolean,
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
    orden: cuenta.orden,
    actualizado_en: new Date().toISOString(),
  })
  if (error) throw error
}

export async function eliminarCuenta(id: string): Promise<void> {
  const { error } = await supabase.from('cuentas').delete().eq('id', id)
  if (error) throw error
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
