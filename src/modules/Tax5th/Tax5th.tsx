import { useState } from 'react'

const UIT_DEFAULT = 5350 // 2026

function fmt(n: number) { return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

const TRAMOS = [
  { label: 'Hasta 5 UIT', tasa: 0.08, uitMax: 5 },
  { label: 'Más de 5 hasta 20 UIT', tasa: 0.14, uitMax: 20 },
  { label: 'Más de 20 hasta 35 UIT', tasa: 0.17, uitMax: 35 },
  { label: 'Más de 35 hasta 45 UIT', tasa: 0.20, uitMax: 45 },
  { label: 'Más de 45 UIT', tasa: 0.30, uitMax: Infinity },
]

function calcImpuesto(rentaNeta: number, uit: number) {
  let restante = rentaNeta
  let impuesto = 0
  const detalle: { label: string; tasa: number; monto: number; impuesto: number }[] = []
  let prevMax = 0

  for (const tramo of TRAMOS) {
    if (restante <= 0) break
    const maxSoles = tramo.uitMax === Infinity ? Infinity : tramo.uitMax * uit
    const tramoSoles = tramo.uitMax === Infinity ? restante : maxSoles - prevMax
    const afecto = Math.min(restante, tramoSoles)
    const imp = afecto * tramo.tasa
    detalle.push({ label: tramo.label, tasa: tramo.tasa, monto: afecto, impuesto: imp })
    impuesto += imp
    restante -= afecto
    prevMax = tramo.uitMax === Infinity ? prevMax : maxSoles
  }
  return { impuesto, detalle }
}

const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

export default function Tax5th() {
  const [ingresoBruto, setIngresoBruto] = useState(0)
  const [uit, setUIT] = useState(UIT_DEFAULT)
  const [descuentosExtra, setDescuentosExtra] = useState(0)

  const deduccion7UIT = 7 * uit
  const rentaNeta = Math.max(0, ingresoBruto - deduccion7UIT - descuentosExtra)
  const { impuesto, detalle } = calcImpuesto(rentaNeta, uit)
  const retencionMensual = impuesto / 12

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Impuesto 5ta Categoría</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Calculadora de retención mensual — Renta de trabajo dependiente (SUNAT)</p>
      </div>

      {/* Inputs */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Datos de entrada</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Proyección ingresos brutos anuales (S/)</label>
            <input type="number" min={0} step={100} value={ingresoBruto || ''}
              onChange={e => setIngresoBruto(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle}
              placeholder="0" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>UIT vigente (S/)</label>
            <input type="number" min={1000} step={50} value={uit}
              onChange={e => setUIT(parseFloat(e.target.value) || UIT_DEFAULT)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Descuentos adicionales (opcional, S/)</label>
            <input type="number" min={0} step={100} value={descuentosExtra || ''}
              onChange={e => setDescuentosExtra(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} placeholder="0" />
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Donaciones, ITF deducibles, etc.</p>
          </div>
        </div>
      </div>

      {ingresoBruto > 0 && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Ingresos brutos anuales', val: `S/ ${fmt(ingresoBruto)}` },
              { label: 'Deducción 7 UIT', val: `S/ ${fmt(deduccion7UIT)}` },
              { label: 'Renta neta gravable', val: `S/ ${fmt(rentaNeta)}`, highlight: true },
            ].map(({ label, val, highlight }) => (
              <div key={label} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label}</p>
                <p className="font-bold font-mono text-sm" style={{ color: highlight ? 'var(--color-acento)' : 'var(--color-texto)' }}>{val}</p>
              </div>
            ))}
            <div className="rounded-xl p-4" style={{ background: 'var(--color-acento)', border: '1px solid var(--color-acento)' }}>
              <p className="text-xs mb-1 text-white opacity-80">Retención mensual estimada</p>
              <p className="font-bold font-mono text-lg text-white">S/ {fmt(retencionMensual)}</p>
            </div>
          </div>

          {/* Tabla de tramos */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-borde)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#1e3a5f', color: '#fff' }}>
                  <th className="text-left px-4 py-3 font-semibold">Tramo</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs">Tasa</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs">Monto afecto</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs">Impuesto</th>
                </tr>
              </thead>
              <tbody>
                {detalle.filter(d => d.monto > 0).map((d, i) => (
                  <tr key={i} style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-borde)' }}>
                    <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--color-texto)' }}>{d.label}</td>
                    <td className="px-4 py-2.5 text-center text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{(d.tasa * 100).toFixed(0)}%</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: 'var(--color-texto)' }}>S/ {fmt(d.monto)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold" style={{ color: '#ef4444' }}>S/ {fmt(d.impuesto)}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--color-fondo)', borderTop: '2px solid var(--color-borde)' }}>
                  <td colSpan={3} className="px-4 py-2.5 font-semibold text-sm" style={{ color: 'var(--color-texto)' }}>Total IR anual</td>
                  <td className="px-4 py-2.5 text-right font-bold font-mono" style={{ color: '#ef4444' }}>S/ {fmt(impuesto)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Cálculo referencial. La retención exacta la determina el empleador mensualmente según la proyección actualizada del año.
            UIT {new Date().getFullYear()}: S/ {fmt(uit)}.
          </p>
        </>
      )}

      {ingresoBruto === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--color-muted)' }}>
          <p className="text-sm">Ingresa tu proyección de ingresos brutos anuales para calcular.</p>
        </div>
      )}
    </div>
  )
}
