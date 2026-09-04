import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatAbrev } from '../../../lib/formatMonto'
import type { DashboardData } from '../useDashboardData'
import { CARD, LABEL } from './shared'

// Tile "Evolución del patrimonio". Extraído de Dashboard.tsx sin cambios (Etapa 2).

export function ChartEvolucion({ d }: { d: DashboardData }) {
  const { historialChart, config, isMobile } = d
  return (
    <div style={{ ...CARD, padding: '12px 14px 8px', display: 'flex', flexDirection: 'column', minHeight: isMobile ? 240 : undefined }}>
      <p style={LABEL}>Evolución del patrimonio</p>
      {historialChart.length >= 2 ? (
        <ResponsiveContainer width="100%" height={isMobile ? 180 : undefined} style={isMobile ? undefined : { flex: 1, minHeight: 0 }}>
          <LineChart data={historialChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" />
            <XAxis dataKey="periodo" tick={{ fill: 'var(--color-muted)', fontSize: 10 }} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickFormatter={v => formatAbrev(v, config)} width={36} />
            <Tooltip
              contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)', borderRadius: 8, color: 'var(--color-texto)', fontSize: 11 }}
              formatter={(v, name) => [formatAbrev(v as number, config), name === 'total' ? 'Total' : name === 'pen' ? 'S/ directo' : 'USD en S/']}
            />
            <Legend wrapperStyle={{ fontSize: 10, color: 'var(--color-muted)', paddingTop: 2 }}
              formatter={(v: string) => v === 'total' ? 'Total' : v === 'pen' ? 'S/ directo' : 'USD en S/'} />
            <Line type="monotone" dataKey="total" stroke="#00C9A7" strokeWidth={2} dot={{ r: 3, fill: '#00C9A7', strokeWidth: 0 }} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="pen" stroke="#F5A623" strokeWidth={1.5} strokeDasharray="4 2" dot={false} activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="usd" stroke="#5B8CF7" strokeWidth={1.5} strokeDasharray="4 2" dot={false} activeDot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 11, color: 'var(--color-muted)', textAlign: 'center' }}>
          Registra al menos 2 meses en Historial para ver la evolución
        </div>
      )}
    </div>
  )
}
