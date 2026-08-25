import { useState, useCallback } from 'react'
import { obtenerTipoCambio, tcCacheado, type TipoCambioData } from '../lib/tipoCambio'

export interface UseTipoCambioResult {
  tc: TipoCambioData | null
  loading: boolean
  error: string | null
  actualizar: (force?: boolean) => Promise<void>
}

export function useTipoCambio(): UseTipoCambioResult {
  const [tc, setTc] = useState<TipoCambioData | null>(() => tcCacheado())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const actualizar = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await obtenerTipoCambio(force)
      setTc(data)
    } catch {
      setError('No se pudo conectar con Rextie')
    } finally {
      setLoading(false)
    }
  }, [])

  return { tc, loading, error, actualizar }
}
