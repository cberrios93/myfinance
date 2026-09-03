import { useEffect, useState } from 'react'
import { useConfig } from '../../config/ConfigContext'
import { PALETAS } from '../../config/themes'
import { obtenerHistorialAuto, setHistorialAuto } from '../../lib/supabase/preferences'

const MODULOS_OPCIONALES = [
  { to: '/haberes', label: 'Haberes' },
  { to: '/suscripciones', label: 'Suscripciones' },
  { to: '/gastos-familia', label: 'Gastos Familia' },
  { to: '/deudas', label: 'Deudas' },
  { to: '/notas', label: 'Ideas & Notas' },
  { to: '/analisis', label: 'Análisis' },
  { to: '/impuesto-5ta', label: 'Impuesto 5ta' },
]

export default function Settings() {
  const { config, setConfig } = useConfig()
  const [historialAuto, setHistorialAutoState] = useState(false)
  const [guardandoAuto, setGuardandoAuto] = useState(false)

  useEffect(() => {
    obtenerHistorialAuto().then(setHistorialAutoState)
  }, [])

  async function toggleHistorialAuto() {
    const nuevoValor = !historialAuto
    setHistorialAutoState(nuevoValor)
    setGuardandoAuto(true)
    try {
      await setHistorialAuto(nuevoValor)
    } catch {
      setHistorialAutoState(!nuevoValor)
    } finally {
      setGuardandoAuto(false)
    }
  }

  function toggleModulo(ruta: string) {
    const ocultos = config.modulosOcultos.includes(ruta)
      ? config.modulosOcultos.filter(r => r !== ruta)
      : [...config.modulosOcultos, ruta]
    setConfig({ ...config, modulosOcultos: ocultos })
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Configuración</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Preferencias de la app. Se guardan localmente en este navegador.
        </p>
      </div>

      {/* Modo Day / Night */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Modo</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Misma paleta de marca, distinta intensidad de fondo.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {PALETAS.map(p => {
            const isNight = p.id === 'marino-night'
            const isSelected = config.paletaId === p.id
            return (
              <button
                key={p.id}
                onClick={() => setConfig({ ...config, paletaId: p.id, acentoCustom: null })}
                className="rounded-xl p-4 flex items-center gap-3 transition-all text-left"
                style={{
                  background: p.fondo,
                  border: isSelected ? `2px solid ${p.acento}` : '2px solid transparent',
                  outline: isSelected ? `1px solid ${p.acento}20` : 'none',
                }}
              >
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{isNight ? '🌙' : '☀️'}</span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: p.texto }}>{p.nombre}</div>
                  <div className="text-xs mt-0.5" style={{ color: p.textoMuted }}>
                    {isNight ? 'Para la noche' : 'Uso general'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>


      {/* Tamaño de texto */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Tamaño de texto</h2>
          <span className="text-sm font-mono" style={{ color: 'var(--color-acento)' }}>{config.tamanoTexto}%</span>
        </div>
        <input
          type="range" min={80} max={150} step={5}
          value={config.tamanoTexto}
          onChange={e => setConfig({ ...config, tamanoTexto: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
          <span>80%</span><span>100%</span><span>150%</span>
        </div>
      </div>

      {/* Densidad */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Densidad de espaciado</h2>
        <div className="flex gap-3">
          {(['compacto', 'comodo'] as const).map(d => (
            <button
              key={d}
              onClick={() => setConfig({ ...config, densidad: d })}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium capitalize transition-all"
              style={{
                background: config.densidad === d ? 'var(--color-acento)' : 'transparent',
                color: config.densidad === d ? '#fff' : 'var(--color-muted)',
                border: `1px solid ${config.densidad === d ? 'var(--color-acento)' : 'var(--color-borde)'}`,
              }}
            >
              {d === 'compacto' ? 'Compacto' : 'Cómodo'}
            </button>
          ))}
        </div>
      </div>

      {/* Alto contraste */}
      <div className="rounded-xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-texto)' }}>Modo alto contraste</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Aumenta el contraste entre elementos</p>
          </div>
          <div
            onClick={() => setConfig({ ...config, altoContraste: !config.altoContraste })}
            className="relative w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0"
            style={{ background: config.altoContraste ? 'var(--color-acento)' : 'var(--color-borde)' }}
          >
            <div
              className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ transform: config.altoContraste ? 'translateX(21px)' : 'translateX(3px)' }}
            />
          </div>
        </label>
      </div>

      {/* Moneda principal */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Moneda principal</h2>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>La moneda que aparece primero en totales y resúmenes</p>
        <div className="flex gap-3">
          {(['PEN', 'USD'] as const).map(m => (
            <button
              key={m}
              onClick={() => setConfig({ ...config, monedaPrincipal: m })}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: config.monedaPrincipal === m ? 'var(--color-acento)' : 'transparent',
                color: config.monedaPrincipal === m ? '#fff' : 'var(--color-muted)',
                border: `1px solid ${config.monedaPrincipal === m ? 'var(--color-acento)' : 'var(--color-borde)'}`,
              }}
            >
              {m === 'PEN' ? 'S/ Soles (PEN)' : '$ Dólares (USD)'}
            </button>
          ))}
        </div>
      </div>

      {/* Decimales */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Decimales en montos</h2>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Ejemplo: <span className="font-mono">S/ 12,500</span> vs <span className="font-mono">S/ 12,500.43</span></p>
        <div className="flex gap-3">
          {([0, 1, 2] as const).map(d => (
            <button
              key={d}
              onClick={() => setConfig({ ...config, decimales: d })}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: config.decimales === d ? 'var(--color-acento)' : 'transparent',
                color: config.decimales === d ? '#fff' : 'var(--color-muted)',
                border: `1px solid ${config.decimales === d ? 'var(--color-acento)' : 'var(--color-borde)'}`,
              }}
            >
              {d === 0 ? '0 decimales' : d === 1 ? '1 decimal' : '2 decimales'}
            </button>
          ))}
        </div>
      </div>

      {/* Día de corte del historial */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Día de corte — Historial</h2>
          <span className="text-sm font-mono" style={{ color: 'var(--color-acento)' }}>día {config.diaCorteHistorial}</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Si registras antes del día {config.diaCorteHistorial}, el período se asigna al mes anterior. Día {config.diaCorteHistorial + 1}+ → mes actual.
        </p>
        <input
          type="range" min={1} max={20} step={1}
          value={config.diaCorteHistorial}
          onChange={e => setConfig({ ...config, diaCorteHistorial: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
          <span>Día 1</span><span>Día 10</span><span>Día 20</span>
        </div>
      </div>

      {/* Tiempo para deshacer */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Tiempo para deshacer</h2>
          <span className="text-sm font-mono" style={{ color: 'var(--color-acento)' }}>{config.undoTimeoutMs / 1000}s</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Tiempo disponible para deshacer una acción después de realizarla (crear, editar o eliminar).
        </p>
        <input
          type="range" min={5000} max={30000} step={1000}
          value={config.undoTimeoutMs}
          onChange={e => setConfig({ ...config, undoTimeoutMs: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
          <span>5s</span><span>15s</span><span>30s</span>
        </div>
      </div>

      {/* Automatización */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Automatización</h2>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-texto)' }}>Historial mensual automático</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              El sistema registra tu patrimonio automáticamente el 1° de cada mes.
            </p>
          </div>
          <div
            onClick={guardandoAuto ? undefined : toggleHistorialAuto}
            className="relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ml-4"
            style={{
              background: historialAuto ? 'var(--color-acento)' : 'var(--color-borde)',
              opacity: guardandoAuto ? 0.5 : 1,
            }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ transform: historialAuto ? 'translateX(18px)' : 'translateX(2px)' }}
            />
          </div>
        </label>
      </div>

      {/* Inflación anual de referencia */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Inflación anual de referencia</h2>
          <span className="text-sm font-mono" style={{ color: 'var(--color-acento)' }}>{config.inflacionAnual ?? 6}%</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Usada en Análisis → Patrimonio para mostrar la línea de inflación acumulada sobre el gráfico de evolución.
        </p>
        <input
          type="range" min={1} max={20} step={0.5}
          value={config.inflacionAnual ?? 6}
          onChange={e => setConfig({ ...config, inflacionAnual: parseFloat(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
          <span>1%</span><span>6% (Perú ref.)</span><span>20%</span>
        </div>
      </div>

      {/* Alerta de cuenta desactualizada */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Alerta — Patrimonio desactualizado</h2>
          <span className="text-sm font-mono" style={{ color: 'var(--color-acento)' }}>{config.diasStalePatrimonio} días</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Si una cuenta lleva más de este tiempo sin actualizarse, se muestra un indicador de alerta sutil.
        </p>
        <input
          type="range" min={7} max={90} step={1}
          value={config.diasStalePatrimonio}
          onChange={e => setConfig({ ...config, diasStalePatrimonio: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
          <span>7 días</span><span>30 días</span><span>90 días</span>
        </div>
      </div>

      {/* Módulos visibles */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Módulos visibles en sidebar</h2>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Oculta módulos que no usas. Los datos se conservan.</p>
        <div className="space-y-2">
          {MODULOS_OPCIONALES.map(({ to, label }) => {
            const oculto = config.modulosOcultos.includes(to)
            return (
              <label key={to} className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => toggleModulo(to)}
                  className="relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0"
                  style={{ background: oculto ? 'var(--color-borde)' : 'var(--color-acento)' }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: oculto ? 'translateX(2px)' : 'translateX(18px)' }}
                  />
                </div>
                <span className="text-sm" style={{ color: oculto ? 'var(--color-muted)' : 'var(--color-texto)' }}>{label}</span>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}
