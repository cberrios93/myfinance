import { v4 as uuid } from 'uuid'
import type { Escenario } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSeed(raw: any): Omit<Escenario, 'id' | 'nombre' | 'creadoEn' | 'actualizadoEn'> {
  return {
    general: raw.general,
    instrumentos: (raw.instrumentos ?? []).map((i: any) => ({ ...i, id: i.id ?? uuid() })),
    movimientos: (raw.movimientos ?? []).map((m: any) => ({ ...m, id: m.id ?? uuid() })),
    eventosVida: (raw.eventosVida ?? []).map((ev: any) => ({ ...ev, id: ev.id ?? uuid() })),
    carrera: raw.carrera,
  }
}
