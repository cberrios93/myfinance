// Constantes y helpers compartidos por los tiles del Dashboard.
// Extraído de Dashboard.tsx sin cambios (Etapa 2 — paridad visual).

export const CAT_COLORES: Record<string, string> = {
  'Savings': '#00C9A7',
  'Investment (Stock Exchange)': '#C47FD5',
  'Investment (Fintech)': '#F5A623',
  'Investment (Business)': '#5B8CF7',
  'Asset': '#6B7280',
  'Liability': '#E24C4C',
}

export const CAT_LABELS: Record<string, string> = {
  'Savings': 'Ahorros',
  'Investment (Stock Exchange)': 'ETFs / Bolsa',
  'Investment (Fintech)': 'Fintech',
  'Investment (Business)': 'Negocios',
  'Asset': 'Activos',
  'Liability': 'Pasivos',
}

export const FALLBACK_COLOR = '#64748B'

export const CARD: React.CSSProperties = { background: 'var(--color-card)', border: '1px solid var(--color-borde)', borderRadius: 12 }
export const INNER: React.CSSProperties = { background: 'var(--color-fondo)', border: '1px solid var(--color-borde)', borderRadius: 8 }
export const LABEL: React.CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 8 }

export function fmtPct(n: number) { return `${n.toFixed(1)}%` }

export function fmtVenc(iso?: string) {
  if (!iso) return '—'
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return 'Vencida'
  if (diff === 0) return 'Hoy'
  if (diff <= 7) return `${diff}d`
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

export function vencOrden(iso?: string) { return iso ? new Date(iso).getTime() : 9999999999999 }
