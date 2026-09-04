// Inventario de tiles disponibles para el Dashboard personalizable.
// `minW/minH` = tamaño mínimo al redimensionar. `defW/defH` = tamaño al agregar desde la paleta.
// Grilla de 60 columnas (= mcm 5·3·4), rowHeight 36px.

export interface TileDef {
  id: string
  nombre: string
  minW: number
  minH: number
  defW: number
  defH: number
}

export const TILE_CATALOG: TileDef[] = [
  { id: 'kpi-patrimonio',   nombre: 'Patrimonio neto',        minW: 8,  minH: 2, defW: 12, defH: 2 },
  { id: 'kpi-flujo',        nombre: 'Flujo neto / mes',       minW: 8,  minH: 2, defW: 12, defH: 2 },
  { id: 'kpi-ahorro',       nombre: 'Tasa de ahorro',         minW: 8,  minH: 2, defW: 12, defH: 2 },
  { id: 'kpi-emergencia',   nombre: 'Fondo de emergencia',    minW: 8,  minH: 2, defW: 12, defH: 2 },
  { id: 'kpi-retiro',       nombre: 'Proyección de retiro',   minW: 8,  minH: 2, defW: 12, defH: 2 },
  { id: 'chart-evolucion',  nombre: 'Evolución del patrimonio', minW: 15, minH: 5, defW: 20, defH: 8 },
  { id: 'chart-proyeccion', nombre: 'Proyección · escenario',  minW: 15, minH: 5, defW: 20, defH: 8 },
  { id: 'chart-composicion', nombre: 'Composición',            minW: 15, minH: 4, defW: 20, defH: 8 },
  { id: 'list-suscripciones', nombre: 'Suscripciones activas', minW: 12, minH: 3, defW: 20, defH: 6 },
  { id: 'list-cuentas',     nombre: 'Cuentas principales',     minW: 12, minH: 3, defW: 20, defH: 6 },
  { id: 'list-rendimientos', nombre: 'Rendimientos YTD',       minW: 12, minH: 3, defW: 20, defH: 6 },
  { id: 'chip-tc',          nombre: 'TC Rextie',              minW: 10, minH: 1, defW: 15, defH: 1 },
  { id: 'chip-vencimiento', nombre: 'Próximo vencimiento',    minW: 10, minH: 1, defW: 15, defH: 1 },
  { id: 'chip-historial',   nombre: 'Alerta de historial',    minW: 10, minH: 1, defW: 15, defH: 1 },
  { id: 'chip-salud',       nombre: 'Salud financiera',       minW: 10, minH: 1, defW: 15, defH: 1 },
]

export const TILE_BY_ID: Record<string, TileDef> = Object.fromEntries(TILE_CATALOG.map(t => [t.id, t]))
