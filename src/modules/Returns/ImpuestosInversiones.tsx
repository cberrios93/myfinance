import { useState, useMemo } from 'react'
import { CheckCircle2, Circle, Receipt } from 'lucide-react'
import { useFinanceData } from '../../data/FinanceDataContext'
import { useScenario } from '../../data/ScenarioContext'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import { useConfig } from '../../config/ConfigContext'
import { formatMonto } from '../../lib/formatMonto'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function fmt(n: number, dec = 2) {
  return n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

export default function ImpuestosInversiones() {
  const { rendimientos, actualizarRendimiento } = useFinanceData()
  const { escenarioActivo } = useScenario()
  const { tc } = useTipoCambio()
  const { config } = useConfig()

  const anioActual = new Date().getFullYear()
  const [anioFiltro, setAnioFiltro] = useState<number | '__todos__'>(anioActual)
  const [instrFiltro, setInstrFiltro] = useState<string>('__todos__')
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  // Mapa nombre → tipoImpuesto del instrumento (del escenario activo)
  const tipoImpMap = useMemo(() => {
    const map = new Map<string, 'mensual' | 'al_cierre' | 'exonerado'>()
    for (const inst of escenarioActivo?.instrumentos ?? []) {
      map.set(inst.nombre, inst.tipoImpuesto ?? 'mensual')
    }
    return map
  }, [escenarioActivo])

  const base = useMemo(() => rendimientos.filter(r => !r.esTraspaso), [rendimientos])

  // Registros visibles:
  // - mensual: todos los registros del instrumento
  // - al_cierre: solo los que tienen esCierreFiscal=true
  // - exonerado: excluidos
  const registrosVisibles = useMemo(() => {
    return base
      .filter(r => {
        const tipo = tipoImpMap.get(r.instrumentoNombre) ?? 'mensual'
        if (tipo === 'exonerado') return false
        if (tipo === 'al_cierre') return r.esCierreFiscal
        return true // mensual: todos
      })
      .filter(r => anioFiltro === '__todos__' || r.anio === anioFiltro)
      .filter(r => instrFiltro === '__todos__' || r.instrumentoNombre === instrFiltro)
      .sort((a, b) => {
        if (a.instrumentoNombre !== b.instrumentoNombre) return a.instrumentoNombre.localeCompare(b.instrumentoNombre)
        if (a.anio !== b.anio) return b.anio - a.anio
        return (b.mes ?? 0) - (a.mes ?? 0)
      })
  }, [base, anioFiltro, instrFiltro, tipoImpMap])

  const aniosDisponibles = useMemo(() => {
    const set = new Set(base.map(r => r.anio))
    return Array.from(set).sort((a, b) => b - a)
  }, [base])

  const todosInstrumentos = useMemo(() => {
    const set = new Set(base.map(r => r.instrumentoNombre))
    return Array.from(set).sort()
  }, [base])

  function montoImp(r: typeof registrosVisibles[0]): number {
    if (r.tasaImpuesto <= 0) return 0
    const g = r.gananciasPEN ?? (r.gananciasUSD != null ? r.gananciasUSD * (tc ?? 1) : 0)
    return g * (r.tasaImpuesto / 100)
  }

  const kpis = useMemo(() => {
    let total = 0, pagado = 0, pendiente = 0
    for (const r of registrosVisibles) {
      const imp = montoImp(r)
      total += imp
      if (r.impuestoPagado) pagado += imp; else pendiente += imp
    }
    return { total, pagado, pendiente }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrosVisibles, tc])

  async function togglePagado(r: typeof registrosVisibles[0]) {
    if (toggling.has(r.id)) return
    setToggling(prev => new Set([...prev, r.id]))
    try {
      await actualizarRendimiento({ ...r, impuestoPagado: !r.impuestoPagado })
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(r.id); return s })
    }
  }

  const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }
  const tieneImpuesto = registrosVisibles.some(r => r.tasaImpuesto > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>
          Impuestos de Inversiones
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Seguimiento de impuestos por instrumento y período · Marca los que ya declaraste o pagaste
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={anioFiltro}
          onChange={e => setAnioFiltro(e.target.value === '__todos__' ? '__todos__' : Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm"
          style={inputStyle}
        >
          <option value="__todos__">Todos los años</option>
          {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={instrFiltro}
          onChange={e => setInstrFiltro(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={inputStyle}
        >
          <option value="__todos__">Todos los instrumentos</option>
          {todosInstrumentos.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
            Total impuesto {anioFiltro === '__todos__' ? 'histórico' : anioFiltro}
          </p>
          <p className="text-xl font-bold font-mono" style={{ color: 'var(--color-texto)' }}>
            {formatMonto(kpis.total, config)}
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Pagado / declarado</p>
          <p className="text-xl font-bold font-mono" style={{ color: '#00C9A7' }}>
            {formatMonto(kpis.pagado, config)}
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Pendiente de pago</p>
          <p className="text-xl font-bold font-mono"
            style={{ color: kpis.pendiente > 0 ? '#F59E0B' : 'var(--color-texto)' }}>
            {formatMonto(kpis.pendiente, config)}
          </p>
        </div>
      </div>

      {/* Tabla */}
      {registrosVisibles.length === 0 ? (
        <div className="rounded-xl p-12 flex flex-col items-center gap-3"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
          <Receipt size={40} style={{ color: 'var(--color-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Sin registros tributables{anioFiltro !== '__todos__' ? ` para ${anioFiltro}` : ''}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Registra rendimientos en el módulo Rendimientos para verlos aquí
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-borde)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-borde)' }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-muted)' }}>Instrumento</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-muted)' }}>Período</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-muted)' }}>Ganancia bruta</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-muted)' }}>Tasa</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-muted)' }}>Monto impuesto</th>
                  <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--color-muted)' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {registrosVisibles.map((r, i) => {
                  const tipo = tipoImpMap.get(r.instrumentoNombre) ?? 'mensual'
                  const gBruta = r.gananciasPEN ?? (r.gananciasUSD != null ? r.gananciasUSD * (tc ?? 1) : undefined)
                  const imp = montoImp(r)
                  const tieneImp = r.tasaImpuesto > 0
                  const isToggling = toggling.has(r.id)
                  const bg = i % 2 === 0 ? 'var(--color-fondo)' : 'var(--color-card)'

                  return (
                    <tr key={r.id} style={{ background: bg, borderBottom: '1px solid var(--color-borde)', opacity: isToggling ? 0.6 : 1 }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-texto)' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{r.instrumentoNombre}</span>
                          {tipo === 'al_cierre' && r.esCierreFiscal && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: '#3B82F620', color: '#3B82F6', border: '1px solid #3B82F640' }}>
                              Cierre fiscal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                        {r.mes ? `${MESES[r.mes - 1]} ${r.anio}` : String(r.anio)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--color-texto)' }}>
                        {gBruta != null
                          ? (r.gananciasUSD != null && r.gananciasPEN == null
                            ? `$ ${fmt(r.gananciasUSD)}`
                            : `S/ ${fmt(gBruta)}`)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono"
                        style={{ color: tieneImp ? 'var(--color-texto)' : 'var(--color-muted)' }}>
                        {tieneImp ? `${r.tasaImpuesto}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold"
                        style={{ color: tieneImp ? '#F59E0B' : 'var(--color-muted)' }}>
                        {tieneImp ? `S/ ${fmt(imp)}` : 'S/ 0.00'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {tieneImp ? (
                          <button
                            onClick={() => togglePagado(r)}
                            disabled={isToggling}
                            className="flex items-center gap-1.5 mx-auto text-xs font-medium px-3 py-1 rounded-full transition-colors"
                            style={{
                              background: r.impuestoPagado ? '#00C9A720' : '#F59E0B20',
                              color: r.impuestoPagado ? '#00C9A7' : '#F59E0B',
                              border: `1px solid ${r.impuestoPagado ? '#00C9A7' : '#F59E0B'}`,
                            }}
                          >
                            {r.impuestoPagado
                              ? <><CheckCircle2 size={13} /> Pagado</>
                              : <><Circle size={13} /> Pendiente</>}
                          </button>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Sin impuesto</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {tieneImpuesto && (
                <tfoot>
                  <tr style={{ background: 'var(--color-card)', borderTop: '2px solid var(--color-borde)' }}>
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>
                      Total {anioFiltro === '__todos__' ? 'histórico' : anioFiltro}{instrFiltro !== '__todos__' ? ` · ${instrFiltro}` : ''}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: '#F59E0B' }}>
                      S/ {fmt(kpis.total)}
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                      {kpis.total > 0 ? `${fmt((kpis.pagado / kpis.total) * 100, 0)}% pagado` : ''}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex gap-6 flex-wrap text-xs" style={{ color: 'var(--color-muted)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#3B82F620', border: '1px solid #3B82F6' }} />
          Al cierre: aparece solo el registro de liquidación/venta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#F59E0B20', border: '1px solid #F59E0B' }} />
          Por período: un registro por mes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#10B98120', border: '1px solid #10B981' }} />
          Exonerado: no aparece en esta vista
        </span>
      </div>
    </div>
  )
}
