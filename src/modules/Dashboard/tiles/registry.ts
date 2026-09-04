import type { DashboardData } from '../useDashboardData'
import { KpiPatrimonio, KpiFlujo, KpiAhorro, KpiEmergencia, KpiRetiro } from './kpis'
import { ChartEvolucion } from './ChartEvolucion'
import { ChartProyeccion } from './ChartProyeccion'
import { Composicion } from './Composicion'
import { ListSuscripciones, ListCuentas, ListRendimientos } from './lists'
import { ChipTipoCambio, ChipVencimiento, ChipHistorial, ChipSalud } from './chips'

// Mapa id de tile → componente. Usado por el canvas para renderizar cada mosaico.

type TileComponent = (props: { d: DashboardData }) => React.ReactNode

export const TILE_COMPONENTS: Record<string, TileComponent> = {
  'kpi-patrimonio': KpiPatrimonio,
  'kpi-flujo': KpiFlujo,
  'kpi-ahorro': KpiAhorro,
  'kpi-emergencia': KpiEmergencia,
  'kpi-retiro': KpiRetiro,
  'chart-evolucion': ChartEvolucion,
  'chart-proyeccion': ChartProyeccion,
  'chart-composicion': Composicion,
  'list-suscripciones': ListSuscripciones,
  'list-cuentas': ListCuentas,
  'list-rendimientos': ListRendimientos,
  'chip-tc': ChipTipoCambio,
  'chip-vencimiento': ChipVencimiento,
  'chip-historial': ChipHistorial,
  'chip-salud': ChipSalud,
}
