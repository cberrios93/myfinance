import { useConfig } from '../../config/ConfigContext'
import { PALETAS, TIPOGRAFIAS } from '../../config/themes'

export default function Settings() {
  const { config, setConfig } = useConfig()

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Configuración visual</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Preferencias de presentación. No afectan los datos del plan.
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
    </div>
  )
}
