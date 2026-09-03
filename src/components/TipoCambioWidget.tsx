import { useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { useTipoCambio } from '../hooks/useTipoCambio'

interface Props {
  /** Si se pasa, muestra un botón "Usar este TC" que llama a onUsar con la tasa seleccionada */
  onUsar?: (tc: number) => void
  /** Qué tasa usar al presionar "Usar" (default: compra — para valorizar activos USD) */
  usarRate?: 'compra' | 'venta'
  /** Fetch automático al montar */
  autoFetch?: boolean
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 60000)
  if (diff < 1) return 'hace menos de 1 min'
  if (diff < 60) return `hace ${diff} min`
  return `hace ${Math.floor(diff / 60)}h`
}

export default function TipoCambioWidget({ onUsar, usarRate = 'compra', autoFetch = true }: Props) {
  const { tc, loading, error, actualizar } = useTipoCambio()

  useEffect(() => {
    if (autoFetch && !tc) {
      actualizar()
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5" style={{
      background: 'var(--color-fondo)',
      border: '1px solid var(--color-borde)',
    }}>
      <span style={{ color: 'var(--color-muted)' }}>Rextie</span>

      {loading && (
        <span style={{ color: 'var(--color-muted)' }}>Consultando…</span>
      )}

      {!loading && error && (
        <span style={{ color: '#E24C4C' }}>{error}</span>
      )}

      {!loading && tc && (
        <>
          <span className="font-mono font-semibold" style={{ color: 'var(--color-texto)' }}>
            C: {tc.compra.toFixed(4)}
          </span>
          <span className="font-mono" style={{ color: 'var(--color-muted)' }}>
            V: {tc.venta.toFixed(4)}
          </span>
          <span style={{ color: 'var(--color-muted)' }}>
            · {relativeTime(tc.timestamp)}
          </span>
          {onUsar && (
            <button
              onClick={() => onUsar(usarRate === 'venta' ? tc.venta : tc.compra)}
              className="px-2 py-0.5 rounded text-xs font-semibold"
              style={{ background: 'var(--color-acento)20', color: 'var(--color-acento)' }}
            >
              Usar {usarRate}
            </button>
          )}
        </>
      )}

      <button
        onClick={() => actualizar(true)}
        disabled={loading}
        className="p-0.5 rounded hover:opacity-70 disabled:opacity-40"
        style={{ color: 'var(--color-muted)' }}
        title="Actualizar tipo de cambio"
      >
        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
      </button>
    </div>
  )
}
