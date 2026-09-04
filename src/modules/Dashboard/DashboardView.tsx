import type { DashboardData } from './useDashboardData'
import { KpiPatrimonio, KpiFlujo, KpiAhorro, KpiEmergencia, KpiRetiro } from './tiles/kpis'
import { ChartEvolucion } from './tiles/ChartEvolucion'
import { ChartProyeccion } from './tiles/ChartProyeccion'
import { Composicion } from './tiles/Composicion'
import { ListSuscripciones, ListCuentas, ListRendimientos } from './tiles/lists'
import { ChipTipoCambio, ChipVencimiento, ChipHistorial, ChipSalud } from './tiles/chips'

// Layout fijo del Dashboard (3 grids + barra de chips), idéntico al de siempre.
// Separado de Dashboard.tsx para que la Etapa 3 (canvas) pueda reutilizar los
// mismos tiles, y para poder verificar la vista con datos mock sin pasar por auth.

export function DashboardView({ d }: { d: DashboardData }) {
  const { isMobile } = d
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, ...(isMobile ? {} : { height: '100%', minHeight: 0 }) }}>

      {/* ── Fila 1: KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 10, flexShrink: 0 }}>
        <KpiPatrimonio d={d} />
        <KpiFlujo d={d} />
        <KpiAhorro d={d} />
        <KpiEmergencia d={d} />
        <KpiRetiro d={d} />
      </div>

      {/* ── Filas 2 y 3: grid de contenido ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gridTemplateRows: isMobile ? undefined : '1.1fr 1fr', gap: 10, ...(isMobile ? {} : { flex: 1, minHeight: 0 }) }}>
        <ChartEvolucion d={d} />
        <ChartProyeccion d={d} />
        <Composicion d={d} />
        <ListSuscripciones d={d} />
        <ListCuentas d={d} />
        <ListRendimientos d={d} />
      </div>

      {/* ── Barra de estado: 4 chips ── */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'stretch', flexWrap: isMobile ? 'wrap' : undefined }}>
        <ChipTipoCambio d={d} />
        <ChipVencimiento d={d} />
        <ChipHistorial d={d} />
        <ChipSalud d={d} />
      </div>
    </div>
  )
}
