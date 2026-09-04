import { formatAbrev } from '../../../lib/formatMonto'
import type { DashboardData } from '../useDashboardData'
import { CARD, INNER, LABEL, CAT_COLORES, FALLBACK_COLOR, fmtVenc, fmtPct } from './shared'

// Tiles de la fila 3: Suscripciones, Cuentas, Rendimientos YTD.
// Extraídos de Dashboard.tsx sin cambios (Etapa 2).

export function ListSuscripciones({ d }: { d: DashboardData }) {
  const { suscripcionesActivas } = d
  return (
    <div style={{ ...CARD, padding: '12px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <p style={LABEL}>Suscripciones activas</p>
      {suscripcionesActivas.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, flex: 1, alignContent: 'start' }}>
          {suscripcionesActivas.map(s => {
            const mensual = s.periodicidad === 'Mensual' ? s.montoTotal : s.montoTotal / 12
            const dias = s.vencimiento ? Math.ceil((new Date(s.vencimiento).getTime() - Date.now()) / 86_400_000) : null
            const urgente = dias !== null && dias <= 7
            return (
              <div key={s.id} style={{ ...INNER, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: urgente ? '#F5A62322' : 'var(--color-borde)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: urgente ? '#F5A623' : 'var(--color-muted)', flexShrink: 0 }}>
                    {s.nombre[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.nombre}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: urgente ? '#F5A623' : 'var(--color-muted)' }}>
                    {dias !== null ? fmtVenc(s.vencimiento) : s.periodicidad}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#F5A623', fontVariantNumeric: 'tabular-nums' }}>
                    {s.moneda === 'PEN' ? 'S/' : '$'}{mensual.toFixed(0)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 12, color: 'var(--color-muted)' }}>Sin suscripciones activas</div>
      )}
    </div>
  )
}

export function ListCuentas({ d }: { d: DashboardData }) {
  const { cuentasTop, patrimonioNeto, config } = d
  return (
    <div style={{ ...CARD, padding: '12px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <p style={LABEL}>
        {cuentasTop.some(c => c.pinned) ? 'Cuentas destacadas' : 'Cuentas principales'}
      </p>
      {cuentasTop.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cuentasTop.map(c => {
            const pct = patrimonioNeto > 0 ? (c.valPEN / patrimonioNeto) * 100 : 0
            const color = CAT_COLORES[c.categoria] ?? FALLBACK_COLOR
            return (
              <div key={c.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <div style={{ width: 3, height: 12, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--color-texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-texto)', fontVariantNumeric: 'tabular-nums', marginLeft: 8, flexShrink: 0 }}>
                    {c.montoUSD != null && c.montoPEN == null ? `$${c.montoUSD.toLocaleString('es-PE', { maximumFractionDigits: 0 })}` : formatAbrev(c.valPEN, config)}
                  </span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: 'var(--color-borde)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(pct, 100)}%`, background: color, opacity: 0.65 }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 12, color: 'var(--color-muted)' }}>Sin cuentas en Patrimonio</div>
      )}
    </div>
  )
}

export function ListRendimientos({ d }: { d: DashboardData }) {
  const { rendimientosYTD, gananciaTotalPEN, rentabilidadProm, rendPorInstrumento, config } = d
  return (
    <div style={{ ...CARD, padding: '12px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ ...LABEL, marginBottom: 0 }}>Rendimientos {new Date().getFullYear()}</p>
        {rendimientosYTD.length > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: gananciaTotalPEN >= 0 ? '#00C9A7' : '#E24C4C', fontVariantNumeric: 'tabular-nums' }}>
            {gananciaTotalPEN >= 0 ? '+' : ''}{formatAbrev(gananciaTotalPEN, config)}
          </span>
        )}
      </div>
      {rendimientosYTD.length > 0 ? (
        <>
          {rentabilidadProm !== 0 && (
            <p style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 8 }}>
              Rentabilidad prom.{' '}
              <span style={{ color: rentabilidadProm >= 0 ? '#00C9A7' : '#E24C4C', fontVariantNumeric: 'tabular-nums' }}>
                {rentabilidadProm >= 0 ? '+' : ''}{fmtPct(rentabilidadProm)}
              </span>
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rendPorInstrumento.map(r => (
              <div key={r.nombre} style={{ ...INNER, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px' }}>
                <span style={{ fontSize: 12, color: 'var(--color-texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.nombre}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: r.ganancia >= 0 ? '#00C9A7' : '#E24C4C', fontVariantNumeric: 'tabular-nums', marginLeft: 8, flexShrink: 0 }}>
                  {r.ganancia >= 0 ? '+' : ''}{formatAbrev(r.ganancia, config)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 12, color: 'var(--color-muted)', textAlign: 'center' }}>
          Sin rendimientos registrados este año
        </div>
      )}
    </div>
  )
}
