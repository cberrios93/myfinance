import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type AppConfig, type Paleta, PALETAS, TIPOGRAFIAS, loadConfig, saveConfig } from './themes'

interface ConfigContextValue {
  config: AppConfig
  setConfig: (c: AppConfig) => void
  paleta: Paleta
  tipografiaFamily: string
  acento: string
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<AppConfig>(loadConfig)

  function setConfig(c: AppConfig) {
    setConfigState(c)
    saveConfig(c)
  }

  const paleta = PALETAS.find(p => p.id === config.paletaId) ?? PALETAS[0]
  const tipografiaFamily = TIPOGRAFIAS.find(t => t.id === config.tipografiaId)?.family ?? TIPOGRAFIAS[0].family
  const acento = config.acentoCustom ?? paleta.acento

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-fondo', paleta.fondo)
    root.style.setProperty('--color-card', paleta.fondoCard)
    root.style.setProperty('--color-texto', paleta.texto)
    root.style.setProperty('--color-muted', paleta.textoMuted)
    root.style.setProperty('--color-borde', paleta.borde)
    root.style.setProperty('--color-acento', acento)
    root.style.setProperty('--color-acento-hover', paleta.acentoHover)
    root.style.setProperty('--font-family', tipografiaFamily)
    root.style.setProperty('--font-size-base', `${config.tamanoTexto}%`)
    root.style.setProperty('--spacing-base', config.densidad === 'compacto' ? '0.75rem' : '1rem')
    if (config.altoContraste) root.classList.add('high-contrast')
    else root.classList.remove('high-contrast')
  }, [config, paleta, acento, tipografiaFamily])

  return (
    <ConfigContext.Provider value={{ config, setConfig, paleta, tipografiaFamily, acento }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider')
  return ctx
}
