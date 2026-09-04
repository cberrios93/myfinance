import { formatAbrev } from '../../../lib/formatMonto'
import type { DashboardData } from '../useDashboardData'
import { fmtPct } from './shared'
import { Kpi } from './frame'

// Los 5 KPIs de la fila 1. Extraídos de Dashboard.tsx sin cambios (Etapa 2).

export function KpiPatrimonio({ d }: { d: DashboardData }) {
  const { patrimonioNeto, cambioMes, cambioAnio, tcCompra, config } = d
  const dotColor = cambioMes !== null ? (cambioMes >= 0 ? '#00C9A7' : '#E24C4C') : undefined
  const insightColor = cambioMes !== null ? (cambioMes >= 0 ? '#00C9A7' : '#E24C4C') : undefined
  const insightText = cambioMes !== null
    ? `${cambioMes >= 0 ? 'Subió' : 'Bajó'} ${fmtPct(Math.abs(cambioMes))} respecto al mes anterior`
    : undefined
  return (
    <Kpi label="Patrimonio neto" value={formatAbrev(patrimonioNeto, config)}
      dot={dotColor}
      insight={insightText && insightColor ? { text: insightText, color: insightColor } : undefined}
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
  const dotColor = flujoNeto >= 0 ? '#00C9A7' : '#E24C4C'
  const insightText = flujoNeto >= 0 ? 'Ingresas más de lo que gastas' : 'Gastas más de lo que ingresas este mes'
  return (
    <Kpi label="Flujo neto / mes" value={formatAbrev(flujoNeto, config)} valueColor={flujoNeto >= 0 ? '#00C9A7' : '#E24C4C'}
      dot={dotColor}
      insight={{ text: insightText, color: dotColor }}
      sub={`Ing. ${formatAbrev(ingresosMensuales, config)} · Egr. ${formatAbrev(egresosMensuales, config)}`} />
  )
}

export function KpiAhorro({ d }: { d: DashboardData }) {
  const { tasaAhorro, ahorroColor } = d
  const insightText = tasaAhorro >= 20
    ? 'Meta de ahorro alcanzada (20% del ingreso)'
    : tasaAhorro >= 10
      ? `Apunta al 20% — te faltan ${(20 - tasaAhorro).toFixed(0)} p.p.`
      : 'Tasa crítica — revisa tus gastos fijos'
  return (
    <Kpi label="Tasa de ahorro" value={fmtPct(tasaAhorro)} valueColor={ahorroColor}
      dot={ahorroColor}
      insight={{ text: insightText, color: ahorroColor }}
      sub={<span style={{ color: ahorroColor }}>{tasaAhorro >= 20 ? 'Sobre objetivo' : tasaAhorro >= 10 ? 'Bajo objetivo' : 'Crítico'}</span>} />
  )
}

export function KpiEmergencia({ d }: { d: DashboardData }) {
  const { fondoEmergencia, fondoColor, config } = d
  const insightText = fondoEmergencia.meses >= 6
    ? 'Excelente — más de 6 meses de cobertura'
    : fondoEmergencia.meses >= 3
      ? `Adecuado — cubre tus gastos por ${fondoEmergencia.meses.toFixed(1)} meses`
      : 'Bajo el mínimo recomendado de 3 meses'
  return (
    <Kpi label="Fondo emergencia"
      value={`${fondoEmergencia.meses.toFixed(1)} meses`}
      valueColor={fondoColor}
      dot={fondoColor}
      insight={{ text: insightText, color: fondoColor }}
      sub={<span style={{ color: fondoColor }}>{formatAbrev(fondoEmergencia.efectivo, config)} en Savings</span>} />
  )
}

export function KpiRetiro({ d }: { d: DashboardData }) {
  const { proyeccion, acento, config } = d
  if (!proyeccion) return <Kpi label="Proyección retiro" value="—" sub="Sin escenario activo" />
  const insightText = proyeccion.aniosRestantes > 15
    ? `Buen horizonte — consolida tus aportes ahora`
    : proyeccion.aniosRestantes > 5
      ? `Quedan ${proyeccion.aniosRestantes} años — maximiza tus aportes`
      : `Retiro próximo — revisa tu plan de transición`
  return (
    <Kpi label={`Retiro a los ${proyeccion.edadRetiro} años`} value={formatAbrev(proyeccion.capital, config)} valueColor={acento}
      dot={acento}
      insight={{ text: insightText, color: acento }}
      sub={`${formatAbrev(proyeccion.ingresoMensual, config)}/mes · Faltan ${proyeccion.aniosRestantes} años`} />
  )
}
