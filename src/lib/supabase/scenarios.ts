import { supabase } from './client'
import type { Escenario } from '../../data/types'

export async function listarEscenarios(): Promise<Escenario[]> {
  const { data, error } = await supabase
    .from('escenarios')
    .select('*')
    .order('actualizado_en', { ascending: false })
  if (error) throw error
  return (data ?? []).map(dbToEscenario)
}

export async function guardarEscenario(escenario: Escenario): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const row = {
    id: escenario.id,
    user_id: user.id,
    nombre: escenario.nombre,
    datos: {
      general: escenario.general,
      instrumentos: escenario.instrumentos,
      movimientos: escenario.movimientos,
      eventosVida: escenario.eventosVida,
      carrera: escenario.carrera,
    },
    creado_en: escenario.creadoEn,
    actualizado_en: new Date().toISOString(),
  }

  const { error } = await supabase.from('escenarios').upsert(row)
  if (error) throw error
}

export async function eliminarEscenario(id: string): Promise<void> {
  const { error } = await supabase.from('escenarios').delete().eq('id', id)
  if (error) throw error
}

function dbToEscenario(row: Record<string, unknown>): Escenario {
  const datos = row.datos as Record<string, unknown>
  return {
    id: row.id as string,
    nombre: row.nombre as string,
    general: datos.general as Escenario['general'],
    instrumentos: datos.instrumentos as Escenario['instrumentos'],
    movimientos: datos.movimientos as Escenario['movimientos'],
    eventosVida: datos.eventosVida as Escenario['eventosVida'],
    carrera: datos.carrera as Escenario['carrera'],
    creadoEn: row.creado_en as string,
    actualizadoEn: row.actualizado_en as string,
  }
}
