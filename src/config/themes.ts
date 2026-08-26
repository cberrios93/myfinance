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
    id: 'marino',
    nombre: 'Marino',
    acento: '#3B82F6',
    acentoHover: '#2563EB',
    fondo: '#0F172A',
    fondoCard: '#1E293B',
    texto: '#F1F5F9',
    textoMuted: '#94A3B8',
    borde: '#334155',
  },
  {
    id: 'bosque',
    nombre: 'Bosque',
    acento: '#10B981',
    acentoHover: '#059669',
    fondo: '#0A1F1A',
    fondoCard: '#132B22',
    texto: '#ECFDF5',
    textoMuted: '#6EE7B7',
    borde: '#1F4535',
  },
  {
    id: 'vino',
    nombre: 'Vino',
    acento: '#C084FC',
    acentoHover: '#A855F7',
    fondo: '#1A0B2E',
    fondoCard: '#2D1B4E',
    texto: '#FAF5FF',
    textoMuted: '#C4B5FD',
    borde: '#4C2888',
  },
  {
    id: 'arena',
    nombre: 'Arena (claro)',
    acento: '#D97706',
    acentoHover: '#B45309',
    fondo: '#FAFAF7',
    fondoCard: '#FFFFFF',
    texto: '#1C1917',
    textoMuted: '#78716C',
    borde: '#E7E5E4',
  },
  {
    id: 'hielo',
    nombre: 'Hielo (claro)',
    acento: '#0EA5E9',
    acentoHover: '#0284C7',
    fondo: '#F0F9FF',
    fondoCard: '#FFFFFF',
    texto: '#0C4A6E',
    textoMuted: '#64748B',
    borde: '#BAE6FD',
  },
  {
    id: 'carbon',
    nombre: 'Carbón',
    acento: '#F59E0B',
    acentoHover: '#D97706',
    fondo: '#111111',
    fondoCard: '#1C1C1C',
    texto: '#FAFAFA',
    textoMuted: '#A3A3A3',
    borde: '#2A2A2A',
  },
]

export const TIPOGRAFIAS = [
  { id: 'sans', nombre: 'Moderna (Sans-serif)', family: "'Inter', 'Helvetica Neue', sans-serif" },
  { id: 'editorial', nombre: 'Editorial (Serif)', family: "'Georgia', 'Palatino', serif" },
  { id: 'mono', nombre: 'Mono (Números precisos)', family: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" },
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
  modulosOcultos: string[]
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
  modulosOcultos: [],
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
