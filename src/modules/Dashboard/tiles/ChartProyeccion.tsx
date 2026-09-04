import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { formatAbrev } from '../../../lib/formatMonto'
import type { DashboardData } from '../useDashboardData'
import { CARD, LABEL } from './shared'

// Tile "Proyección · escenario activo". Extraído de Dashboard.tsx sin cambios (Etapa 2).

export function ChartProyeccion({ d }: { d: DashboardData }) {
  const { proyeccion, proyeccionChart, hitos, acento, config, isMobile } = d
  return (
    <div style={{ ...CARD, padding: '12px 14px 8px', display: 'flex', flexDirection: 'column', minHeight: isMobile ? 260 : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ ...LABEL, marginBottom: 0 }}>Proyección · escenario activo</p>
        {proyeccion && (
          <span style={{ fontSize: 10, color: acento, background: `${acento}18`, padding: '2px 7px', borderRadius: 4, fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {proyeccion.nombre}
          </span>
        )}
      </div>
      {proyeccionChart.length > 0 && proyeccion ? (
        <>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : undefined} style={isMobile ? undefined : { flex: 1, minHeight: 0 }}>
            <AreaChart data={proyeccionChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradProj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00C9A7" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#00C9A7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
              <XAxis dataKey="edad" tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
                tickFormatter={v => `${v}`} interval="preserveStartEnd" />
              <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickFormatter={v => formatAbrev(v, config)} width={36} />
              <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', borderRadius: 8, color: 'var(--color-texto)', fontSize: 11 }}
                formatter={(v) => [formatAbrev(v as number, config), 'Capital']}
                labelFormatter={l => `Edad: ${l}`} />
              {/* Posición actual */}
              <ReferenceLine x={proyeccion.edadActual} stroke="var(--color-muted)" strokeDasharray="3 3" strokeWidth={1.5}
                label={{ value: `Hoy (${proyeccion.edadActual}a)`, fill: 'var(--color-muted)', fontSize: 9, position: 'top' }} />
              {/* Hitos de metas — solo los que no son Retiro */}
              {hitos.filter(h => h.label !== 'Retiro').map(h => (
                <ReferenceLine key={h.label} x={h.edad} stroke={acento} strokeDasharray="4 2" strokeWidth={1}
                  label={{ value: `${h.label.slice(0, 8)} (${h.edad}a)`, fill: acento, fontSize: 9, position: 'insideTopLeft' }} />
              ))}
              {/* Retiro */}
              <ReferenceLine x={proyeccion.edadRetiro} stroke="#E24C4C" strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value: `Retiro (${proyeccion.edadRetiro}a)`, fill: '#E24C4C', fontSize: 9, position: 'top' }} />
              <Area type="monotone" dataKey="total" stroke="#00C9A7" strokeWidth={2} fill="url(#gradProj)"
                dot={false} activeDot={{ r: 4, fill: '#00C9A7' }} />
            </AreaChart>
          </ResponsiveContainer>
          {/* Hitos compactos */}
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {hitos.map(h => (
              <div key={h.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--color-muted)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: h.color, flexShrink: 0 }} />
                <span style={{ color: h.color, fontWeight: 600 }}>{h.edad}a</span>
                <span>{formatAbrev(h.capital, config)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 11, color: 'var(--color-muted)', textAlign: 'center' }}>
          Activa un escenario en Simulación para ver la proyección
        </div>
      )}
    </div>
  )
}
