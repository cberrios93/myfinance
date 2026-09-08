import { useState, useMemo } from 'react'
import { Plus, Trash2, Edit2, Check, X, Link2, RefreshCw, Sparkles } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useScenario } from '../../data/ScenarioContext'
import { usePatrimony } from '../../data/PatrimonyContext'
import { useFinanceData } from '../../data/FinanceDataContext'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import TipoCambioWidget from '../../components/TipoCambioWidget'
import type { Instrumento, TipoRenta, TipoImpuesto, CuentaPatrimonio, FlujoCajaItem, Escenario } from '../../data/types'

const CATEGORIAS_PRESET = ['Alto riesgo', 'Diversificado', 'Efectivo/pool', 'Inmobiliario', 'Renta fija', 'Otro']
const CAT_COLORES: Record<string, string> = {
  'Alto riesgo': '#E24C4C',
  'Diversificado': '#00C9A7',
  'Efectivo/pool': '#00C9A7',
  'Inmobiliario': '#F5A623',
  'Renta fija': '#8B5CF6',
  'Otro': '#94A3B8',
}

function catColor(cat: string) {
  return CAT_COLORES[cat] ?? '#94A3B8'
}

const TIPO_RENTA_LABELS: Record<TipoRenta, string> = {
  pago: 'Renta fija — pago periódico',
  capitalizacion: 'Renta fija — capitalización',
  variable: 'Renta variable',
}
const TIPO_RENTA_COLORS: Record<TipoRenta, string> = {
  pago: '#8B5CF6',
  capitalizacion: '#00C9A7',
  variable: '#00C9A7',
}

const EMPTY_INST: Omit<Instrumento, 'id'> = {
  nombre: '',
  montoInicial: 0,
  tasaReal: 0.05,
  categoria: 'Diversificado',
  esPool: false,
  tipoRenta: 'pago',
}

export default function Instruments() {
  const { escenarioActivo, actualizarEscenario } = useScenario()
  const { cuentas, historial } = usePatrimony()
  const { rendimientos, flujoCaja } = useFinanceData()
  const { tc: tcRextie } = useTipoCambio()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Instrumento | null>(null)
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState<Instrumento>({ id: '', ...EMPTY_INST })
  const [showEval, setShowEval] = useState(false)

  // TC: live de Rextie si disponible, fallback 3.7
  const tc = tcRextie?.compra ?? 3.7

  if (!escenarioActivo) return <Empty />

  const instrumentos = escenarioActivo.instrumentos

  function montoDesdePatrimonio(cuentaId: string): number {
    const c = cuentas.find(x => x.id === cuentaId)
    if (!c) return 0
    return (c.montoPEN ?? 0) + (c.montoUSD ?? 0) * tc
  }

  function startEdit(inst: Instrumento) {
    setEditingId(inst.id)
    setDraft({ ...inst })
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(null)
  }

  async function saveEdit() {
    if (!draft || !escenarioActivo) return
    const updated = instrumentos.map(i => i.id === draft.id ? draft : i)
    await actualizarEscenario({ ...escenarioActivo, instrumentos: updated })
    cancelEdit()
  }

  async function deleteInst(id: string) {
    if (!escenarioActivo) return
    const updated = instrumentos.filter(i => i.id !== id)
    await actualizarEscenario({ ...escenarioActivo, instrumentos: updated })
  }

  function startAdd() {
    setNewDraft({ id: uuid(), ...EMPTY_INST })
    setAdding(true)
  }

  async function confirmAdd() {
    if (!escenarioActivo || !newDraft.nombre.trim()) return
    await actualizarEscenario({ ...escenarioActivo, instrumentos: [...instrumentos, newDraft] })
    setAdding(false)
  }

  const totalInicial = instrumentos.reduce((s, i) => {
    const monto = i.cuentaPatrimonioId ? montoDesdePatrimonio(i.cuentaPatrimonioId) : i.montoInicial
    return s + monto
  }, 0)

  const hayVinculados = instrumentos.some(i => i.cuentaPatrimonioId)
  const hayDesync = instrumentos.some(i =>
    i.cuentaPatrimonioId && Math.abs(montoDesdePatrimonio(i.cuentaPatrimonioId) - i.montoInicial) > 1
  )

  async function sincronizarDesdePatrimonio() {
    if (!escenarioActivo) return
    const actualizados = instrumentos.map(i => {
      if (!i.cuentaPatrimonioId) return i
      return { ...i, montoInicial: montoDesdePatrimonio(i.cuentaPatrimonioId) }
    })
    await actualizarEscenario({ ...escenarioActivo, instrumentos: actualizados })
  }

  return (
    <div className="space-y-6">
      {showEval && (
        <EvalModal
          cuentas={cuentas}
          historial={historial}
          flujoCaja={flujoCaja}
          escenario={escenarioActivo}
          tc={tc}
          onClose={() => setShowEval(false)}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Instrumentos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            {instrumentos.length} instrumento{instrumentos.length !== 1 ? 's' : ''} · Total inicial: S/{Math.round(totalInicial).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <TipoCambioWidget autoFetch={false} />
          {hayVinculados && (
            <button
              onClick={sincronizarDesdePatrimonio}
              title="Actualiza los montos de instrumentos vinculados con los valores actuales de Patrimonio"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                border: `1px solid ${hayDesync ? '#F5A623' : 'var(--color-borde)'}`,
                color: hayDesync ? '#F5A623' : 'var(--color-muted)',
                background: hayDesync ? '#F5A62310' : 'transparent',
              }}
            >
              <RefreshCw size={14} /> Sincronizar{hayDesync ? ' ⚠' : ''}
            </button>
          )}
          <button
            onClick={() => setShowEval(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
            style={{ border: '1px solid var(--color-acento)', color: 'var(--color-acento)', background: 'var(--color-acento)10' }}
          >
            <Sparkles size={14} /> Evaluar con IA
          </button>
          <button
            onClick={startAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--color-acento)' }}
          >
            <Plus size={16} /> Agregar
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {adding && (
          <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-texto)' }}>Nuevo instrumento</p>
            <InstrumentoForm
              value={newDraft}
              onChange={setNewDraft}
              onSave={confirmAdd}
              onCancel={() => setAdding(false)}
              cuentas={cuentas}
              tc={tc}
              montoDesdePatrimonio={montoDesdePatrimonio}
            />
          </div>
        )}

        {instrumentos.map(inst => {
          const montoEfectivo = inst.cuentaPatrimonioId
            ? montoDesdePatrimonio(inst.cuentaPatrimonioId)
            : inst.montoInicial
          const cuentaVinculada = inst.cuentaPatrimonioId
            ? cuentas.find(c => c.id === inst.cuentaPatrimonioId)
            : null
          const rendInstr = rendimientos.filter(r => r.instrumentoNombre === inst.nombre && !r.esTraspaso)
          const ganAcumPEN = rendInstr.reduce((s, r) => s + (r.gananciasPEN ?? 0) + (r.gananciasUSD ?? 0) * tc, 0)
          const rentAcum = montoEfectivo > 0 ? ganAcumPEN / montoEfectivo : null

          return (
            <div key={inst.id} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
              {editingId === inst.id && draft ? (
                <InstrumentoForm
                  value={draft}
                  onChange={setDraft}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                  cuentas={cuentas}
                  tc={tc}
                  montoDesdePatrimonio={montoDesdePatrimonio}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: catColor(inst.categoria) }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate" style={{ color: 'var(--color-texto)' }}>{inst.nombre}</span>
                      {inst.esPool && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-acento)20', color: 'var(--color-acento)' }}>Pool</span>
                      )}
                      {cuentaVinculada && (
                        <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ background: '#00C9A715', color: '#00C9A7' }}>
                          <Link2 size={10} /> {cuentaVinculada.nombre}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-0.5 text-xs flex-wrap" style={{ color: 'var(--color-muted)' }}>
                      <span className={cuentaVinculada ? 'font-semibold' : ''} style={cuentaVinculada ? { color: '#00C9A7' } : {}}>
                        S/{Math.round(montoEfectivo).toLocaleString()}
                        {cuentaVinculada ? ' (desde Patrimonio)' : ''}
                      </span>
                      <span>{(inst.tasaReal * 100).toFixed(1)}% real anual</span>
                      <span>{inst.categoria}</span>
                      {rendInstr.length > 0 && (
                        <>
                          <span style={{ color: ganAcumPEN >= 0 ? '#00C9A7' : '#E24C4C' }}>
                            Gan. acum. S/{ganAcumPEN.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {rentAcum != null && (
                            <span style={{ color: rentAcum >= 0 ? '#00C9A7' : '#E24C4C' }}>
                              {(rentAcum * 100).toFixed(2)}% acum.
                            </span>
                          )}
                        </>
                      )}
                      {inst.tipoRenta && inst.tipoRenta !== 'pago' && (
                        <span style={{ color: TIPO_RENTA_COLORS[inst.tipoRenta] }}>
                          {TIPO_RENTA_LABELS[inst.tipoRenta]}
                        </span>
                      )}
                      {inst.cambioTasa && (
                        <span>→ {(inst.cambioTasa.nuevaTasa * 100).toFixed(1)}% desde año {inst.cambioTasa.anioT}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(inst)} className="p-1.5 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Edit2 size={14} /></button>
                    <button onClick={() => deleteInst(inst.id)} className="p-1.5 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Evaluar con IA ──────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

interface CandidatoInstrumento {
  nombre: string
  montoMoneda: 'PEN' | 'USD'
  monto: number
  tasa: string
  plazo: string
  detalles: string
}

function buildEvalPrompt(
  cuentas: CuentaPatrimonio[],
  historial: import('../../data/types').HistorialMensual[],
  flujoCaja: FlujoCajaItem[],
  escenario: Escenario | null,
  tc: number,
  candidato: CandidatoInstrumento,
): string {
  // Patrimonio por categoría
  const categorias: Record<string, { pen: number; usd: number }> = {}
  for (const c of cuentas) {
    if (!categorias[c.categoria]) categorias[c.categoria] = { pen: 0, usd: 0 }
    categorias[c.categoria].pen += c.montoPEN ?? 0
    categorias[c.categoria].usd += c.montoUSD ?? 0
  }
  const totalPEN = cuentas.reduce((s, c) => s + (c.montoPEN ?? 0) + (c.montoUSD ?? 0) * tc, 0)

  const patrimonioStr = Object.entries(categorias)
    .sort(([, a], [, b]) => (b.pen + b.usd * tc) - (a.pen + a.usd * tc))
    .map(([cat, v]) => {
      const total = v.pen + v.usd * tc
      const pct = totalPEN > 0 ? (total / totalPEN * 100).toFixed(1) : '0'
      const detalle = v.usd > 0
        ? `S/ ${fmt(v.pen)} + $${fmt(v.usd)} × ${tc.toFixed(2)} = S/ ${fmt(total)}`
        : `S/ ${fmt(total)}`
      return `  - ${cat}: S/ ${fmt(total)} (${pct}%) — ${detalle}`
    })
    .join('\n')

  // Instrumentos del escenario
  const instrStr = escenario?.instrumentos.length
    ? escenario.instrumentos.map(i => {
        const monto = i.cuentaPatrimonioId
          ? cuentas.find(c => c.id === i.cuentaPatrimonioId)
            ? (cuentas.find(c => c.id === i.cuentaPatrimonioId)!.montoPEN ?? 0) + (cuentas.find(c => c.id === i.cuentaPatrimonioId)!.montoUSD ?? 0) * tc
            : i.montoInicial
          : i.montoInicial
        const pct = totalPEN > 0 ? (monto / totalPEN * 100).toFixed(1) : '0'
        return `  - ${i.nombre}: S/ ${fmt(monto)} (${pct}% del portafolio) — tasa ${(i.tasaReal * 100).toFixed(1)}% real anual — ${i.categoria}`
      }).join('\n')
    : '  Sin instrumentos registrados'

  // Parámetros del escenario
  const g = escenario?.general
  const carrera = escenario?.carrera
  const pct = (v: number | undefined, d = 2) => v !== undefined ? `${(v * 100).toFixed(d)}%` : '—'
  const escenarioStr = g && carrera
    ? `- Escenario: "${escenario!.nombre}"
- Edad actual: ${g.edadActual} años | Retiro: ${g.edadRetiro} años (en ${g.edadRetiro - g.edadActual} años)
- Aporte anual base: S/ ${fmt(carrera.aporteAnualBase)} (S/ ${fmt(carrera.aporteAnualBase / 12)}/mes)
- SWR: ${pct(g.swr)} | Incremento salarial: ${pct(g.incrementoSalarialAnual, 1)}/año`
    : '- Sin escenario activo'

  // Flujo de caja
  const ingresos = flujoCaja.filter(f => f.tipo === 'Income' && f.activo)
  const egresos = flujoCaja.filter(f => f.tipo === 'Expense' && f.activo)
  const totalIng = ingresos.reduce((s, f) => s + (f.montoPEN ?? 0) + (f.montoUSD ?? 0) * tc, 0)
  const totalEgr = egresos.reduce((s, f) => s + (f.montoPEN ?? 0) + (f.montoUSD ?? 0) * tc, 0)
  const flujoNeto = totalIng - totalEgr
  const tasaAhorro = totalIng > 0 ? (flujoNeto / totalIng * 100).toFixed(1) : '—'

  // Historial reciente
  const valid = [...historial].filter(h => !h.nota).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const ultimo = valid[valid.length - 1]
  const ultimos3 = valid.slice(-3).map(h => {
    const t = h.totalPEN + h.totalUSD * h.tipoCambio
    return `  ${h.periodo}: S/ ${fmt(t)}`
  }).join('\n')

  // Monto candidato en PEN
  const montoCandidatoPEN = candidato.montoMoneda === 'USD'
    ? candidato.monto * tc
    : candidato.monto
  const pctCandidato = totalPEN > 0 ? (montoCandidatoPEN / totalPEN * 100).toFixed(1) : '0'

  return `# Evaluación de instrumento financiero — ${new Date().toLocaleDateString('es-PE')}

## MI SITUACIÓN ACTUAL

### Patrimonio total: S/ ${fmt(totalPEN)} (TC Rextie: ${tc.toFixed(3)})
Por categoría:
${patrimonioStr}

### Últimos 3 meses de historial:
${ultimos3 || '  Sin datos'}
${ultimo ? `Período más reciente: ${ultimo.periodo}` : ''}

### Portafolio de inversión (escenario activo):
${escenarioStr}

Instrumentos actuales:
${instrStr}

### Flujo de caja mensual:
- Ingresos: S/ ${fmt(totalIng)}/mes
- Egresos: S/ ${fmt(totalEgr)}/mes
- Flujo neto: S/ ${fmt(flujoNeto)}/mes
- Tasa de ahorro: ${tasaAhorro}%

---

## INSTRUMENTO QUE ESTOY EVALUANDO

- Nombre/tipo: ${candidato.nombre || '(sin especificar)'}
- Monto a invertir: ${candidato.montoMoneda === 'USD' ? `$${fmt(candidato.monto)} USD` : `S/ ${fmt(candidato.monto)}`}${candidato.montoMoneda === 'USD' ? ` (≈ S/ ${fmt(montoCandidatoPEN)} al TC actual)` : ''} — ${pctCandidato}% de mi patrimonio total
${candidato.tasa ? `- Rendimiento esperado: ${candidato.tasa}` : ''}
${candidato.plazo ? `- Plazo: ${candidato.plazo}` : ''}
${candidato.detalles ? `- Detalles adicionales: ${candidato.detalles}` : ''}

---

## SOLICITUD

Dado mi patrimonio y escenario actual, evalúa si me conviene agregar este instrumento:

1. ¿Es coherente con mi portafolio actual? ¿Agrega diversificación o aumenta concentración?
2. ¿El monto propuesto (${pctCandidato}% del patrimonio) es razonable dado mi perfil y flujo de caja?
3. ¿El rendimiento esperado justifica el riesgo y la iliquidez relativa?
4. ¿Qué riesgos concretos debo considerar antes de comprometer ese capital?
5. Recomendación final: ¿sí, no, o condicionado a qué?

Sé directo y específico — usa los números reales del contexto. Responde en español.`
}

function EvalModal({
  cuentas,
  historial,
  flujoCaja,
  escenario,
  tc,
  onClose,
}: {
  cuentas: CuentaPatrimonio[]
  historial: import('../../data/types').HistorialMensual[]
  flujoCaja: FlujoCajaItem[]
  escenario: Escenario | null
  tc: number
  onClose: () => void
}) {
  const [candidato, setCandidato] = useState<CandidatoInstrumento>({
    nombre: '',
    montoMoneda: 'USD',
    monto: 0,
    tasa: '',
    plazo: '',
    detalles: '',
  })
  const [copied, setCopied] = useState(false)

  const prompt = useMemo(
    () => buildEvalPrompt(cuentas, historial, flujoCaja, escenario, tc, candidato),
    [cuentas, historial, flujoCaja, escenario, tc, candidato]
  )

  function handleCopy() {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const inputStyle = {
    background: 'var(--color-fondo)',
    color: 'var(--color-texto)',
    border: '1px solid var(--color-borde)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col"
        style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-borde)' }}>
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: 'var(--color-acento)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--color-texto)' }}>Evaluar instrumento con IA</span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-muted)' }} className="hover:opacity-70">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Candidato form */}
          <div className="px-5 py-4 space-y-3" style={{ borderBottom: '1px solid var(--color-borde)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Instrumento que estás evaluando</p>

            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Nombre / tipo</label>
              <input
                value={candidato.nombre}
                onChange={e => setCandidato(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej. Prestamype, bono corporativo, ETF QQQM…"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Monto a invertir</label>
                <div className="flex gap-2">
                  <select
                    value={candidato.montoMoneda}
                    onChange={e => setCandidato(p => ({ ...p, montoMoneda: e.target.value as 'PEN' | 'USD' }))}
                    className="px-2 py-2 rounded-lg text-sm outline-none"
                    style={{ ...inputStyle, width: '70px' }}
                  >
                    <option value="USD">USD</option>
                    <option value="PEN">PEN</option>
                  </select>
                  <input
                    type="number" min={0}
                    value={candidato.monto || ''}
                    onChange={e => setCandidato(p => ({ ...p, monto: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
                    style={inputStyle}
                  />
                </div>
                {candidato.monto > 0 && candidato.montoMoneda === 'USD' && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                    ≈ S/ {fmt(candidato.monto * tc)} al TC {tc.toFixed(2)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Rendimiento esperado</label>
                <input
                  value={candidato.tasa}
                  onChange={e => setCandidato(p => ({ ...p, tasa: e.target.value }))}
                  placeholder="Ej. 12% anual en USD"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Plazo</label>
              <input
                value={candidato.plazo}
                onChange={e => setCandidato(p => ({ ...p, plazo: e.target.value }))}
                placeholder="Ej. 12 meses, indefinido, líquido…"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Detalles adicionales</label>
              <textarea
                value={candidato.detalles}
                onChange={e => setCandidato(p => ({ ...p, detalles: e.target.value }))}
                placeholder="Ej. Prestamype subasta de facturas, LTV 60%, emisor con BBB+, requiere bloqueo de capital…"
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Prompt preview */}
          <div className="px-5 py-4">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>Prompt generado — copia y pega en Claude</p>
            <pre
              className="text-xs rounded-xl p-4 overflow-x-auto whitespace-pre-wrap"
              style={{ background: 'var(--color-card)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)', maxHeight: '260px', overflowY: 'auto', fontFamily: 'monospace' }}
            >
              {prompt}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--color-borde)' }}>
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: copied ? '#00C9A7' : 'var(--color-acento)' }}
          >
            {copied ? <Check size={16} /> : <Sparkles size={16} />}
            {copied ? '¡Copiado! Pégalo en Claude' : 'Copiar prompt'}
          </button>
        </div>
      </div>
    </div>
  )
}

function InstrumentoForm({
  value, onChange, onSave, onCancel, cuentas, tc, montoDesdePatrimonio
}: {
  value: Instrumento
  onChange: (v: Instrumento) => void
  onSave: () => void
  onCancel: () => void
  cuentas: import('../../data/types').CuentaPatrimonio[]
  tc: number
  montoDesdePatrimonio: (id: string) => number
}) {
  useSubmitOnCmdEnter(onSave)
  const inputStyle = {
    background: 'var(--color-fondo)',
    color: 'var(--color-texto)',
    border: '1px solid var(--color-borde)',
  }

  const isVinculado = !!value.cuentaPatrimonioId
  const montoVinculado = isVinculado ? montoDesdePatrimonio(value.cuentaPatrimonioId!) : null

  function handleVincular(cuentaId: string) {
    if (!cuentaId) {
      onChange({ ...value, cuentaPatrimonioId: undefined })
      return
    }
    const cuenta = cuentas.find(c => c.id === cuentaId)
    const monto = montoDesdePatrimonio(cuentaId)
    onChange({
      ...value,
      cuentaPatrimonioId: cuentaId,
      nombre: value.nombre || (cuenta?.nombre ?? ''),
      montoInicial: monto,
    })
  }

  return (
    <div className="space-y-3">
      {/* Vinculación a Patrimonio */}
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>
          Vincular a cuenta de Patrimonio <span style={{ color: 'var(--color-acento)' }}>(opcional)</span>
        </label>
        <select
          value={value.cuentaPatrimonioId ?? ''}
          onChange={e => handleVincular(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
        >
          <option value="">Sin vincular</option>
          {cuentas.map(c => {
            const monto = montoDesdePatrimonio(c.id)
            const montoLabel = c.montoPEN != null && c.montoUSD != null
              ? `S/${Math.round(c.montoPEN).toLocaleString()} + $${Math.round(c.montoUSD).toLocaleString()} × TC`
              : c.montoPEN != null
              ? `S/${Math.round(c.montoPEN).toLocaleString()}`
              : c.montoUSD != null
              ? `$${Math.round(c.montoUSD).toLocaleString()} → S/${Math.round(monto).toLocaleString()}`
              : ''
            return (
              <option key={c.id} value={c.id}>{c.nombre} {montoLabel ? `· ${montoLabel}` : ''}</option>
            )
          })}
        </select>
        {isVinculado && montoVinculado != null && (
          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#00C9A7' }}>
            <Link2 size={11} /> Monto tomado de Patrimonio: S/{Math.round(montoVinculado).toLocaleString()}
            {' '}(TC: {tc.toFixed(2)})
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Nombre</label>
          <input
            value={value.nombre}
            onChange={e => onChange({ ...value, nombre: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            placeholder="Ej. Schwab ETF"
          />
        </div>
        <div>
          <label className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
            Monto inicial (S/)
            {isVinculado && <span className="px-1 rounded text-xs" style={{ background: '#00C9A720', color: '#00C9A7' }}>sincronizado</span>}
          </label>
          <input
            type="number" min={0}
            value={isVinculado ? (montoVinculado ?? 0) : value.montoInicial}
            onChange={e => !isVinculado && onChange({ ...value, montoInicial: parseFloat(e.target.value) || 0 })}
            readOnly={isVinculado}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
            style={{ ...inputStyle, opacity: isVinculado ? 0.6 : 1, cursor: isVinculado ? 'not-allowed' : 'auto' }}
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Tasa real anual (%)</label>
          <input
            type="number" min={-20} max={50} step={0.1}
            value={parseFloat((value.tasaReal * 100).toFixed(3))}
            onChange={e => onChange({ ...value, tasaReal: (parseFloat(e.target.value) || 0) / 100 })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Categoría</label>
          <select
            value={value.categoria}
            onChange={e => onChange({ ...value, categoria: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          >
            {CATEGORIAS_PRESET.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Tipo de rendimiento</label>
          <select
            value={value.tipoRenta ?? 'pago'}
            onChange={e => onChange({ ...value, tipoRenta: e.target.value as TipoRenta })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          >
            <option value="pago">Renta fija — pago periódico</option>
            <option value="capitalizacion">Renta fija — capitalización</option>
            <option value="variable">Renta variable</option>
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
            {(value.tipoRenta ?? 'pago') === 'pago' && 'La ganancia se cobra. El capital no cambia.'}
            {value.tipoRenta === 'capitalizacion' && 'La ganancia se reinvierte. Se propone actualizar Patrimonio al guardar.'}
            {value.tipoRenta === 'variable' && 'Ingresas el valor actual. El sistema calcula el delta vs Patrimonio.'}
          </p>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Tributación</label>
          <select
            value={value.tipoImpuesto ?? 'mensual'}
            onChange={e => onChange({ ...value, tipoImpuesto: e.target.value as TipoImpuesto })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          >
            <option value="mensual">Por período — impuesto en cada rendimiento</option>
            <option value="al_cierre">Al cierre — impuesto recién al vender/liquidar</option>
            <option value="exonerado">Exonerado — sin obligación tributaria</option>
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
            {(value.tipoImpuesto ?? 'mensual') === 'mensual' && 'Ej. Prestamype: cada pago mensual tiene su impuesto.'}
            {value.tipoImpuesto === 'al_cierre' && 'Ej. fondos mutuos: el impuesto aplica al vender la posición.'}
            {value.tipoImpuesto === 'exonerado' && 'Ej. bonos soberanos, cuentas exoneradas. No genera obligación de pago.'}
          </p>
        </div>
      </div>

      <div className="flex items-center">
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-texto)' }}>
          <input
            type="checkbox"
            checked={value.esPool}
            onChange={e => onChange({ ...value, esPool: e.target.checked })}
          />
          Es el Pool (recibe aportes y absorbe pagos)
        </label>
      </div>

      <details>
        <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-muted)' }}>Cambio de tasa (opcional)</summary>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>A partir del año T</label>
            <input
              type="number" min={1}
              value={value.cambioTasa?.anioT ?? ''}
              onChange={e => {
                const v = parseInt(e.target.value)
                onChange({ ...value, cambioTasa: v ? { anioT: v, nuevaTasa: value.cambioTasa?.nuevaTasa ?? 0 } : undefined })
              }}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
              style={inputStyle}
              placeholder="Ej. 4"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Nueva tasa (%)</label>
            <input
              type="number" min={-20} max={50} step={0.1}
              value={value.cambioTasa ? parseFloat((value.cambioTasa.nuevaTasa * 100).toFixed(3)) : ''}
              onChange={e => {
                const v = parseFloat(e.target.value) / 100
                onChange({ ...value, cambioTasa: value.cambioTasa ? { ...value.cambioTasa, nuevaTasa: v } : undefined })
              }}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono"
              style={inputStyle}
              placeholder="Ej. 12"
            />
          </div>
        </div>
      </details>

      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: 'var(--color-acento)' }}>
          <Check size={14} /> Guardar
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
          <X size={14} /> Cancelar
        </button>
      </div>
    </div>
  )
}

function Empty() {
  return (
    <div className="text-center py-20" style={{ color: 'var(--color-muted)' }}>
      <p>No hay escenario activo.</p>
    </div>
  )
}
