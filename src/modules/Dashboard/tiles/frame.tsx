import { CARD, LABEL } from './shared'

// Componentes presentacionales compartidos por los tiles.
// Extraídos de Dashboard.tsx sin cambios de estilo (Etapa 2).

/** Card contenedor de un tile. Es el elemento raíz del tile — no agrega wrappers extra. */
export function TileFrame({ title, style, children }: {
  title?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div style={{ ...CARD, padding: '12px 14px', display: 'flex', flexDirection: 'column', ...style }}>
      {title && <p style={LABEL}>{title}</p>}
      {children}
    </div>
  )
}

export function Kpi({ label, value, sub, valueColor, dot, insight }: {
  label: string
  value: string
  sub?: React.ReactNode
  valueColor?: string
  dot?: string
  insight?: { text: string; color: string }
}) {
  return (
    <div style={{ ...CARD, padding: '13px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 5, lineHeight: 1.3 }}>{label}</p>
        {dot && <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 1 }} />}
      </div>
      <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: valueColor ?? 'var(--color-texto)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      {sub != null && (
        <p style={{ fontSize: 11, marginTop: 5, lineHeight: 1.4, color: 'var(--color-muted)' }}>{sub}</p>
      )}
      {insight && (
        <div style={{
          marginTop: 8, padding: '5px 8px', borderRadius: 5,
          borderLeft: `2px solid ${insight.color}`,
          background: `${insight.color}18`,
          fontSize: 10.5, color: insight.color, lineHeight: 1.4,
        }}>
          {insight.text}
        </div>
      )}
    </div>
  )
}
