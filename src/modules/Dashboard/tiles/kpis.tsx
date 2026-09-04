import { formatAbrev } from '../../../lib/formatMonto'
import type { DashboardData } from '../useDashboardData'
import { fmtPct } from './shared'
import { Kpi } from './frame'

// Los 5 KPIs de la fila 1. Extraídos de Dashboard.tsx sin cambios (Etapa 2).

export function KpiPatrimonio({ d }: { d: DashboardData }) {
  const { patrimonioNeto, cambioMes, cambioAnio, tcCompra, config } = d
  return (
    <Kpi label="Patrimonio neto" value={formatAbrev(patrimonioNeto, config)}
      sub={cambioMes !== null ? (
        <>
          <span style={{ color: cambioMes >= 0 ? '#00C9A7' : '#E24C4C' }}>{cambioMes >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(cambioMes))} mes</span>
          {cambioAnio !== null && (
            <> · <span style={{ color: cambioAnio >= 0 ? '#00C9A7' : '#E24C4C' }}>{cambioAnio >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(cambioAnio))} año</span></>
          )}
        </>
      ) : `TC S/${tcCompra.toFixed(2)}`}
    />
  )
}

export function KpiFlujo({ d }: { d: DashboardData }) {
  const { flujoNeto, ingresosMensuales, egresosMensuales, config } = d
  return (
    <Kpi label="Flujo neto / mes" value={formatAbrev(flujoNeto, config)} valueColor={flujoNeto >= 0 ? '#00C9A7' : '#E24C4C'}
      sub={`Ing. ${formatAbrev(ingresosMensuales, config)} · Egr. ${formatAbrev(egresosMensuales, config)}`} />
  )
}

export function KpiAhorro({ d }: { d: DashboardData }) {
  const { tasaAhorro, ahorroColor } = d
  return (
    <Kpi label="Tasa de ahorro" value={fmtPct(tasaAhorro)} valueColor={ahorroColor}
      sub={<span style={{ color: ahorroColor }}>{tasaAhorro >= 20 ? 'Sobre objetivo' : tasaAhorro >= 10 ? 'Bajo objetivo' : 'Crítico'}</span>} />
  )
}

export function KpiEmergencia({ d }: { d: DashboardData }) {
  const { fondoEmergencia, fondoColor, config } = d
  return (
    <Kpi label="Fondo emergencia"
      value={`${fondoEmergencia.meses.toFixed(1)} meses`}
      valueColor={fondoColor}
      sub={<span style={{ color: fondoColor }}>{formatAbrev(fondoEmergencia.efectivo, config)} en Savings</span>} />
  )
}

export function KpiRetiro({ d }: { d: DashboardData }) {
  const { proyeccion, acento, config } = d
  if (!proyeccion) return <Kpi label="Proyección retiro" value="—" sub="Sin escenario activo" />
  return (
    <Kpi label={`Retiro a los ${proyeccion.edadRetiro} años`} value={formatAbrev(proyeccion.capital, config)} valueColor={acento}
      sub={`${formatAbrev(proyeccion.ingresoMensual, config)}/mes · Faltan ${proyeccion.aniosRestantes} años`} />
  )
}
