import { useState } from 'react'
import { formatAbrev } from '../../../lib/formatMonto'
import type { DashboardData } from '../useDashboardData'
import { CARD, LABEL } from './shared'

// Tile "Composición" — barra horizontal tipo Mac storage con hover.
// Antes era ComposicionBar en Dashboard.tsx. Sin cambios de lógica (Etapa 2).

export function Composicion({ d }: { d: DashboardData }) {
  const { composicionDonut: donut, baseDonut: base, config } = d
  const [hovered, setHovered] = useState<number | null>(null)
  return (
    <div style={{ ...CARD, padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
      <p style={LABEL}>Composición</p>
      {donut.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
          {/* Barra horizontal */}
          <div style={{ position: 'relative', height: 28, borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
            {donut.map((e, i) => {
              const pct = base > 0 ? (e.valor / base) * 100 : 0
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width: `${pct}%`,
                    background: e.color,
                    opacity: hovered === null || hovered === i ? 1 : 0.4,
                    transition: 'opacity 0.15s',
                    cursor: 'default',
                    position: 'relative',
                  }}
                >
                  {hovered === i && (
                    <div style={{
                      position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--color-card)', border: '1px solid var(--color-borde)',
                      borderRadius: 6, padding: '5px 9px', whiteSpace: 'nowrap', zIndex: 10,
                      fontSize: 11, color: 'var(--color-texto)', pointerEvents: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    }}>
                      <span style={{ fontWeight: 600, color: e.color }}>{e.label}</span>
                      <span style={{ color: 'var(--color-muted)', marginLeft: 6 }}>{pct.toFixed(1)}% · {formatAbrev(e.valor, config)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Leyenda en 2 columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 12px' }}>
            {donut.map((e, i) => {
              const pct = base > 0 ? (e.valor / base) * 100 : 0
              return (
                <div key={i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'default', opacity: hovered === null || hovered === i ? 1 : 0.4, transition: 'opacity 0.15s' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--color-texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{e.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{pct.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 11, color: 'var(--color-muted)', textAlign: 'center' }}>
          Agrega cuentas en Patrimonio
        </div>
      )}
    </div>
  )
}
