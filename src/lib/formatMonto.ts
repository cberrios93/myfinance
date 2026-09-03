import type { AppConfig } from '../config/themes'

export function simboloMoneda(config: Pick<AppConfig, 'monedaPrincipal'>): string {
  return config.monedaPrincipal === 'USD' ? '$' : 'S/'
}

// Número completo con símbolo y decimales configurados: "S/ 1,234" o "$ 1,234.00"
export function formatMonto(n: number, config: Pick<AppConfig, 'monedaPrincipal' | 'decimales'>): string {
  const sym = simboloMoneda(config)
  return `${sym} ${n.toLocaleString('es-PE', {
    minimumFractionDigits: config.decimales,
    maximumFractionDigits: config.decimales,
  })}`
}

// Abreviado para KPIs y ejes de charts: "S/ 1.2M", "S/ 450k", "S/ 320"
export function formatAbrev(n: number, config: Pick<AppConfig, 'monedaPrincipal' | 'decimales'>): string {
  const sym = simboloMoneda(config)
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sym}${(n / 1_000).toFixed(1)}k`
  return `${sym}${n.toFixed(config.decimales)}`
}
