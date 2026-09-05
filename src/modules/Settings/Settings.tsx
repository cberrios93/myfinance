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
  { to: '/impuesto-5ta', label: 'Impuesto 5ta (beta)' },
]

function Toggle({ on, onToggle, disabled = false }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <div
      onClick={disabled ? undefined : onToggle}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{
        background: on ? 'var(--color-acento)' : 'var(--color-borde)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
        style={{ transform: on ? 'translateX(21px)' : 'translateX(3px)' }}
      />
    </div>
  )
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 space-y-4 h-fit" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{title}</h2>
        {description && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{description}</p>}
      </div>
      {children}
    </div>
  )
}

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
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Configuración</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Preferencias de la app. Se guardan localmente en este navegador.
        </p>
      </div>

      {/* ── Sección: Apariencia ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-acento)' }}>Apariencia</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Modo Day / Night */}
          <Card title="Modo" description="Misma paleta de marca, distinta intensidad de fondo.">
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
          </Card>

          {/* Tamaño de texto */}
          <Card title="Tamaño de texto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Escala de la interfaz</span>
              <span className="text-sm font-mono font-bold" style={{ color: 'var(--color-acento)' }}>{config.tamanoTexto}%</span>
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
          </Card>

          {/* Densidad */}
          <Card title="Densidad de espaciado">
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
          </Card>

          {/* Alto contraste */}
          <Card title="Accesibilidad">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-texto)' }}>Modo alto contraste</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Aumenta el contraste entre elementos</p>
              </div>
              <Toggle on={config.altoContraste} onToggle={() => setConfig({ ...config, altoContraste: !config.altoContraste })} />
            </label>
          </Card>

        </div>
      </div>

      {/* ── Sección: Datos y moneda ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-acento)' }}>Datos y moneda</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Moneda principal */}
          <Card title="Moneda principal" description="La moneda que aparece primero en totales y resúmenes.">
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
          </Card>

          {/* Decimales */}
          <Card title="Decimales en montos" description={`Ejemplo: S/ 12,500 vs S/ 12,500.43`}>
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
          </Card>

          {/* Inflación */}
          <Card title="Inflación anual de referencia" description="Usada en Análisis → Patrimonio para la línea de inflación acumulada.">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Tasa anual</span>
              <span className="text-sm font-mono font-bold" style={{ color: 'var(--color-acento)' }}>{config.inflacionAnual ?? 6}%</span>
            </div>
            <input
              type="range" min={1} max={20} step={0.5}
              value={config.inflacionAnual ?? 6}
              onChange={e => setConfig({ ...config, inflacionAnual: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
              <span>1%</span><span>6% (Perú ref.)</span><span>20%</span>
            </div>
          </Card>

        </div>
      </div>

      {/* ── Sección: Alertas y cortes ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-acento)' }}>Alertas y tiempos</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">

          {/* Día de corte */}
          <Card title="Día de corte — Historial">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Si registras antes del día {config.diaCorteHistorial}, se asigna al mes anterior.</span>
              <span className="text-sm font-mono font-bold flex-shrink-0 ml-2" style={{ color: 'var(--color-acento)' }}>día {config.diaCorteHistorial}</span>
            </div>
            <input
              type="range" min={1} max={20} step={1}
              value={config.diaCorteHistorial}
              onChange={e => setConfig({ ...config, diaCorteHistorial: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
              <span>Día 1</span><span>Día 10</span><span>Día 20</span>
            </div>
          </Card>

          {/* Tiempo para deshacer */}
          <Card title="Tiempo para deshacer" description="Cuánto tiempo tienes para revertir una acción (crear, editar, eliminar).">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Ventana de undo</span>
              <span className="text-sm font-mono font-bold" style={{ color: 'var(--color-acento)' }}>{config.undoTimeoutMs / 1000}s</span>
            </div>
            <input
              type="range" min={5000} max={30000} step={1000}
              value={config.undoTimeoutMs}
              onChange={e => setConfig({ ...config, undoTimeoutMs: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
              <span>5s</span><span>15s</span><span>30s</span>
            </div>
          </Card>

          {/* Alerta patrimonio desactualizado */}
          <Card title="Alerta — Patrimonio desactualizado" description="Si una cuenta supera este tiempo sin actualizar, aparece un indicador sutil.">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Umbral de alerta</span>
              <span className="text-sm font-mono font-bold" style={{ color: 'var(--color-acento)' }}>{config.diasStalePatrimonio} días</span>
            </div>
            <input
              type="range" min={7} max={90} step={1}
              value={config.diasStalePatrimonio}
              onChange={e => setConfig({ ...config, diasStalePatrimonio: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
              <span>7 días</span><span>30 días</span><span>90 días</span>
            </div>
          </Card>

        </div>
      </div>

      {/* ── Sección: Automatización ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-acento)' }}>Automatización</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Historial mensual automático">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-texto)' }}>Activar registro automático</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  El sistema registra tu patrimonio automáticamente el 1° de cada mes.
                </p>
              </div>
              <Toggle on={historialAuto} onToggle={toggleHistorialAuto} disabled={guardandoAuto} />
            </label>
          </Card>
        </div>
      </div>

      {/* ── Sección: Módulos visibles ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-acento)' }}>Módulos</p>
        <div className="rounded-xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-texto)' }}>Módulos visibles en sidebar</p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-muted)' }}>Oculta módulos que no usas. Los datos se conservan.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODULOS_OPCIONALES.map(({ to, label }) => {
              const oculto = config.modulosOcultos.includes(to)
              return (
                <label key={to} className="flex items-center gap-3 cursor-pointer">
                  <Toggle on={!oculto} onToggle={() => toggleModulo(to)} />
                  <span className="text-sm" style={{ color: oculto ? 'var(--color-muted)' : 'var(--color-texto)' }}>{label}</span>
                </label>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
