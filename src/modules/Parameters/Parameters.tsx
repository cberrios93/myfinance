import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useScenario } from '../../data/ScenarioContext'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import type { GeneralParams, Meta, ResultadoPostRetiro } from '../../data/types'

export default function Parameters() {
  const { escenarioActivo, actualizarEscenario, resultadoActivo } = useScenario()
  const [params, setParams] = useState<GeneralParams | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  useSubmitOnCmdEnter(handleSave)

  useEffect(() => {
    if (escenarioActivo) setParams({ ...escenarioActivo.general })
  }, [escenarioActivo?.id])

  if (!escenarioActivo || !params) {
    return <Empty />
  }

  async function handleSave() {
    if (!escenarioActivo || !params) return
    setSaving(true)
    try {
      await actualizarEscenario({ ...escenarioActivo, general: params })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function updateMeta(i: number, meta: Meta) {
    const metas = [...params!.metas]
    metas[i] = meta
    setParams({ ...params!, metas })
  }

  function addMeta() {
    setParams({ ...params!, metas: [...params!.metas, { nombre: `Meta ${params!.metas.length + 1}`, montoMensual: 10000 }] })
  }

  function removeMeta(i: number) {
    const metas = params!.metas.filter((_, idx) => idx !== i)
    setParams({ ...params!, metas })
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Parámetros generales</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Configura los datos base del escenario financiero.</p>
      </div>

      <Card title="Horizonte temporal">
        <Field label="Edad actual">
          <NumberInput value={params.edadActual} onChange={v => setParams({ ...params, edadActual: v })} min={18} max={80} />
        </Field>
        <Field label="Edad de retiro">
          <NumberInput value={params.edadRetiro} onChange={v => setParams({ ...params, edadRetiro: v })} min={params.edadActual + 1} max={100} />
        </Field>
        <Field label="Expectativa de vida estimada">
          <NumberInput value={params.edadVidaEstimada ?? 85} onChange={v => setParams({ ...params, edadVidaEstimada: v })} min={params.edadRetiro + 1} max={120} />
        </Field>
        <Field label="Año actual">
          <NumberInput value={params.anioActual} onChange={v => setParams({ ...params, anioActual: v })} min={2020} max={2100} />
        </Field>
      </Card>

      <Card title="Tasa de retiro seguro (SWR)">
        <Field label="SWR (%)">
          <NumberInput
            value={parseFloat((params.swr * 100).toFixed(4))}
            onChange={v => setParams({ ...params, swr: v / 100 })}
            min={1} max={10} step={0.25}
          />
        </Field>
        <div className="text-xs mt-3 space-y-1.5" style={{ color: 'var(--color-muted)' }}>
          <p>
            <strong style={{ color: 'var(--color-texto)' }}>¿Qué es el SWR?</strong> Es el porcentaje de tu fondo que retiras cada año para vivir, sin que el capital se agote. Si tienes S/ 2M y usas 4%, retiras S/ 80k/año (S/ 6,667/mes).
          </p>
          <p>
            El estudio Trinity (1998) encontró que con 4% el fondo sobrevive ~30 años con alta probabilidad. Para retiros más largos (ej. a los 55 años, potencialmente 40+ años de retiro), se recomienda <strong style={{ color: 'var(--color-texto)' }}>3–3.5%</strong> para ser más conservador.
          </p>
          <p>
            <strong style={{ color: 'var(--color-texto)' }}>Horizonte post-retiro:</strong> el simulador modela cuánto dura el fondo desde la edad de retiro hasta tu expectativa de vida estimada, asumiendo un retiro anual fijo (Trinity-style) y la tasa real ponderada de tus instrumentos.
          </p>
        </div>
      </Card>

      <Card title="Proyección de ingresos">
        <Field label="Mes de ajuste salarial en empresa actual">
          <select
            value={params.mesAjusteSalarial ?? 4}
            onChange={e => setParams({ ...params, mesAjusteSalarial: Number(e.target.value) })}
            className="w-32 text-sm px-2 py-1.5 rounded-lg"
            style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }}
          >
            {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((mes, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} — {mes}</option>
            ))}
          </select>
        </Field>
        <Field label="Incremento salarial anual (%)">
          <NumberInput
            value={parseFloat(((params.incrementoSalarialAnual ?? 0.03) * 100).toFixed(2))}
            onChange={v => setParams({ ...params, incrementoSalarialAnual: v / 100 })}
            min={0} max={20} step={0.5}
          />
        </Field>
        <Field label="Tasa crec. patrimonio no invertido (%)">
          <NumberInput
            value={parseFloat(((params.tasaPatrimonioNoInvertido ?? 0.03) * 100).toFixed(2))}
            onChange={v => setParams({ ...params, tasaPatrimonioNoInvertido: v / 100 })}
            min={0} max={20} step={0.5}
          />
        </Field>
        <div className="text-xs mt-3 space-y-1.5" style={{ color: 'var(--color-muted)' }}>
          <p>
            <strong style={{ color: 'var(--color-texto)' }}>Sueldo base:</strong> promedio de (sueldo básico + comisiones) desde el último ajuste de compensación hasta hoy, usando tus recibos de Haberes. El incremento proyecta su crecimiento anual.
          </p>
          <p>
            <strong style={{ color: 'var(--color-texto)' }}>Patrimonio no invertido:</strong> cuentas de Patrimonio sin instrumento enlazado (efectivo, inmuebles, etc.). La tasa estima su crecimiento anual.
          </p>
        </div>
      </Card>

      <Card title="Metas de ingreso mensual">
        <div className="space-y-3">
          {params.metas.map((meta, i) => (
            <div key={i} className="flex gap-3 items-center">
              <input
                value={meta.nombre}
                onChange={e => updateMeta(i, { ...meta, nombre: e.target.value })}
                placeholder="Nombre de la meta"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }}
              />
              <NumberInput
                value={meta.montoMensual}
                onChange={v => updateMeta(i, { ...meta, montoMensual: v })}
                min={0}
                step={1000}
              />
              <button onClick={() => removeMeta(i)} style={{ color: 'var(--color-muted)' }} className="hover:opacity-70">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addMeta}
          className="mt-3 flex items-center gap-2 text-sm hover:opacity-80"
          style={{ color: 'var(--color-acento)' }}
        >
          <Plus size={14} /> Agregar meta
        </button>
      </Card>

      {resultadoActivo?.postRetiro && (
        <PostRetiroPanel postRetiro={resultadoActivo.postRetiro} edadVidaEstimada={params.edadVidaEstimada ?? 85} />
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-50"
          style={{ background: 'var(--color-acento)' }}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {saved && <span className="text-sm text-green-400">✓ Guardado</span>}
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm" style={{ color: 'var(--color-texto)' }}>{label}</label>
      {children}
    </div>
  )
}

function NumberInput({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      min={min} max={max} step={step}
      className="w-28 px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
      style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }}
    />
  )
}

function PostRetiroPanel({ postRetiro, edadVidaEstimada }: { postRetiro: ResultadoPostRetiro; edadVidaEstimada: number }) {
  const { capitalRetiro, retiroAnualFijo, agotadoEnEdad, aniosSupervivencia, tasaPromedioPonderada } = postRetiro
  const sobrevive = agotadoEnEdad === null
  const fmt = (n: number) => n >= 1_000_000
    ? `S/${(n / 1_000_000).toFixed(2)}M`
    : `S/${Math.round(n).toLocaleString()}`

  return (
    <div className="rounded-xl p-5 space-y-4" style={{
      background: 'var(--color-card)',
      border: `1px solid ${sobrevive ? '#00C9A7' : '#E24C4C'}40`,
    }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
          Supervivencia del fondo post-retiro
        </h2>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
          background: sobrevive ? '#00C9A720' : '#E24C4C20',
          color: sobrevive ? '#00C9A7' : '#E24C4C',
        }}>
          {sobrevive ? `✓ Sobrevive hasta los ${edadVidaEstimada} años` : `⚠ Se agota a los ${agotadoEnEdad} años`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Capital al retirarse" value={fmt(capitalRetiro)} />
        <Stat label="Retiro anual fijo" value={`${fmt(retiroAnualFijo)}/año`} />
        <Stat label="Retiro mensual fijo" value={`${fmt(retiroAnualFijo / 12)}/mes`} />
        <Stat label="Tasa real post-retiro" value={`${(tasaPromedioPonderada * 100).toFixed(1)}%`} />
        <Stat
          label={sobrevive ? 'Años de cobertura' : 'Años que dura el fondo'}
          value={`${aniosSupervivencia} años`}
          accent={!sobrevive}
        />
        {!sobrevive && (
          <Stat label="Brecha" value={`${edadVidaEstimada - (agotadoEnEdad ?? edadVidaEstimada)} años sin cobertura`} accent />
        )}
      </div>

      {!sobrevive && (
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Para extender la cobertura: reduce el SWR, aumenta la edad de retiro, o incrementa tus aportes.
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
      <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label}</div>
      <div className="font-semibold font-mono text-sm" style={{ color: accent ? '#E24C4C' : 'var(--color-texto)' }}>{value}</div>
    </div>
  )
}

function Empty() {
  return (
    <div className="text-center py-20" style={{ color: 'var(--color-muted)' }}>
      <p>No hay escenario activo. Crea o selecciona uno en la sección Escenarios.</p>
    </div>
  )
}
