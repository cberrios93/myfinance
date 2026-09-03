export interface Paleta {
  id: string
  nombre: string
  acento: string
  fondo: string
  fondoCard: string
  texto: string
  textoMuted: string
  borde: string
  acentoHover: string
}

export const PALETAS: Paleta[] = [
  {
    id: 'marino-day',
    nombre: 'Day',
    acento: '#00C9A7',
    acentoHover: '#009E83',
    fondo: '#F2F6FA',
    fondoCard: '#FFFFFF',
    texto: '#060E1B',
    textoMuted: '#5A7088',
    borde: '#D0DCE8',
  },
  {
    id: 'marino',
    nombre: 'Night',
    acento: '#00C9A7',
    acentoHover: '#009E83',
    fondo: '#060E1B',
    fondoCard: '#0C1A2E',
    texto: '#EDF2F8',
    textoMuted: '#8A9BB0',
    borde: '#1E3A5A',
  },
]

export const TIPOGRAFIAS = [
  { id: 'sans', nombre: 'DM Sans', family: "'DM Sans', 'Helvetica Neue', sans-serif" },
]

export interface AppConfig {
  paletaId: string
  acentoCustom: string | null
  tipografiaId: string
  tamanoTexto: number
  densidad: 'compacto' | 'comodo'
  altoContraste: boolean
  monedaPrincipal: 'PEN' | 'USD'
  decimales: 0 | 1 | 2
  diaCorteHistorial: number
  diasStalePatrimonio: number
  modulosOcultos: string[]
  inflacionAnual: number
  undoTimeoutMs: number
}

export const DEFAULT_CONFIG: AppConfig = {
  paletaId: 'marino',
  acentoCustom: null,
  tipografiaId: 'sans',
  tamanoTexto: 100,
  densidad: 'comodo',
  altoContraste: false,
  monedaPrincipal: 'PEN',
  decimales: 0,
  diaCorteHistorial: 10,
  diasStalePatrimonio: 30,
  modulosOcultos: [],
  inflacionAnual: 6,
  undoTimeoutMs: 8000,
}

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem('myfinance_config')
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_CONFIG
}

export function saveConfig(config: AppConfig) {
  localStorage.setItem('myfinance_config', JSON.stringify(config))
}
