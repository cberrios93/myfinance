import { useConfig } from '../../config/ConfigContext'
import { PALETAS, TIPOGRAFIAS } from '../../config/themes'

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

      {/* Paleta */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Paleta de color</h2>
        <div className="grid grid-cols-3 gap-3">
          {PALETAS.map(p => (
            <button
              key={p.id}
              onClick={() => setConfig({ ...config, paletaId: p.id, acentoCustom: null })}
              className="rounded-xl p-3 flex flex-col gap-2 transition-all"
              style={{
                background: p.fondo,
                border: config.paletaId === p.id ? `2px solid ${p.acento}` : '2px solid transparent',
              }}
            >
              <div className="flex gap-1.5">
                <div className="w-4 h-4 rounded-full" style={{ background: p.acento }} />
                <div className="w-4 h-4 rounded-full" style={{ background: p.fondoCard }} />
                <div className="w-4 h-4 rounded-full" style={{ background: p.texto }} />
              </div>
              <span className="text-xs text-left" style={{ color: p.texto }}>{p.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Acento custom */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Color de acento personalizado</h2>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={config.acentoCustom ?? PALETAS.find(p => p.id === config.paletaId)?.acento ?? '#3B82F6'}
            onChange={e => setConfig({ ...config, acentoCustom: e.target.value })}
            className="w-12 h-10 rounded-lg cursor-pointer border-0"
          />
          <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {config.acentoCustom ?? 'Usando color de la paleta'}
          </span>
          {config.acentoCustom && (
            <button onClick={() => setConfig({ ...config, acentoCustom: null })} className="text-xs underline" style={{ color: 'var(--color-muted)' }}>
              Restablecer
            </button>
          )}
        </div>
      </div>

      {/* Tipografía */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Tipografía</h2>
        <div className="space-y-2">
          {TIPOGRAFIAS.map(t => (
            <label key={t.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="tipografia"
                checked={config.tipografiaId === t.id}
                onChange={() => setConfig({ ...config, tipografiaId: t.id })}
              />
              <span className="text-sm" style={{ color: 'var(--color-texto)', fontFamily: t.family }}>
                {t.nombre} — Aa Bb Cc 123
              </span>
            </label>
          ))}
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
