import type { DashboardData } from '../useDashboardData'
import { CARD } from './shared'

// Los 4 chips de la barra de estado inferior.
// Extraídos de Dashboard.tsx sin cambios de estilo (Etapa 2).

const CHIP_LABEL: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-muted)' }

export function ChipTipoCambio({ d }: { d: DashboardData }) {
  const { tc } = d
  return (
    <div style={{ ...CARD, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
      <span style={CHIP_LABEL}>TC Rextie</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-texto)', fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ color: '#00C9A7' }}>C </span>S/{(tc?.compra ?? 3.70).toFixed(3)}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-texto)', fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ color: '#E24C4C' }}>V </span>S/{(tc?.venta ?? 3.75).toFixed(3)}
      </span>
    </div>
  )
}

export function ChipVencimiento({ d }: { d: DashboardData }) {
  const prox = d.proxVencimiento
  const dias = prox ? Math.ceil((new Date(prox.vencimiento!).getTime() - Date.now()) / 86_400_000) : null
  const color = dias !== null ? (dias <= 3 ? '#E24C4C' : dias <= 7 ? '#F5A623' : '#00C9A7') : 'var(--color-muted)'
  return (
    <div style={{ ...CARD, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
      <span style={CHIP_LABEL}>Próx. vencimiento</span>
      {prox ? (
        <>
          <span style={{ fontSize: 12, color: 'var(--color-texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{prox.nombre}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
            {dias === 0 ? 'Hoy' : dias! < 0 ? 'Vencida' : `${dias}d`}
          </span>
        </>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Sin vencimientos</span>
      )}
    </div>
  )
}

export function ChipHistorial({ d }: { d: DashboardData }) {
  const { faltaHistorial } = d
  return (
    <div style={{ ...CARD, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, flex: 1, borderColor: faltaHistorial ? '#F5A62355' : undefined }}>
      <span style={CHIP_LABEL}>Historial</span>
      {faltaHistorial ? (
        <>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5A623', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#F5A623', flex: 1 }}>Falta registrar este período</span>
        </>
      ) : (
        <>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C9A7', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#00C9A7' }}>Al día</span>
        </>
      )}
    </div>
  )
}

export function ChipSalud({ d }: { d: DashboardData }) {
  const { scoreSalud } = d
  const color = scoreSalud >= 80 ? '#00C9A7' : scoreSalud >= 60 ? '#F5A623' : '#E24C4C'
  const label = scoreSalud >= 80 ? 'Excelente' : scoreSalud >= 60 ? 'Aceptable' : 'Mejorable'
  return (
    <div style={{ ...CARD, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
      <span style={CHIP_LABEL}>Salud financiera</span>
      <span style={{ fontSize: 18, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{scoreSalud}</span>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--color-borde)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${scoreSalud}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}
