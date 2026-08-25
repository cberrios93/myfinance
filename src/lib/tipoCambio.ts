const CACHE_KEY = 'rextie_tc_v1'
const CACHE_TTL = 60 * 60 * 1000 // 1 hora

export interface TipoCambioData {
  compra: number   // fx_rate_buy — vendes USD, recibes PEN (para valorizar portafolio)
  venta: number    // fx_rate_sell — compras USD, pagas PEN
  timestamp: number
}

function fromCache(): TipoCambioData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const data: TipoCambioData = JSON.parse(raw)
    if (Date.now() - data.timestamp > CACHE_TTL) return null
    return data
  } catch {
    return null
  }
}

function toCache(data: TipoCambioData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {}
}

async function parseRextieResponse(res: Response): Promise<TipoCambioData> {
  const json = await res.json()
  return {
    compra: parseFloat(json.fx_rate_buy),
    venta: parseFloat(json.fx_rate_sell),
    timestamp: Date.now(),
  }
}

async function fetchDirect(): Promise<TipoCambioData> {
  const res = await fetch('https://app.rextie.com/api/v1/fxrates/rate/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ source_currency: 'USD', target_currency: 'PEN', source_amount: 1 }),
  })
  if (!res.ok) throw new Error(`Rextie ${res.status}`)
  return parseRextieResponse(res)
}

async function fetchViaProxy(): Promise<TipoCambioData> {
  const res = await fetch('/api/tipo-cambio')
  if (!res.ok) throw new Error(`Proxy ${res.status}`)
  return parseRextieResponse(res)
}

export async function obtenerTipoCambio(forceRefresh = false): Promise<TipoCambioData> {
  if (!forceRefresh) {
    const cached = fromCache()
    if (cached) return cached
  }

  // Intento 1: fetch directo (funciona si Rextie permite CORS desde este origen)
  try {
    const data = await fetchDirect()
    toCache(data)
    return data
  } catch {}

  // Intento 2: proxy Vercel (producción) — evita CORS
  try {
    const data = await fetchViaProxy()
    toCache(data)
    return data
  } catch {}

  throw new Error('No se pudo obtener el tipo de cambio')
}

export function tcCacheado(): TipoCambioData | null {
  return fromCache()
}
