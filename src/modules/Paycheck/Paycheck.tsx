import { useState, useRef } from 'react'
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, Upload, Download, AlertCircle, FileText, Loader2 } from 'lucide-react'
import { useFinanceData } from '../../data/FinanceDataContext'
import type { ReciboHaberes } from '../../data/types'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import { parseBoleta } from '../../lib/parseBoleta'

function fmt(n: number) { return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

const ZERO_FIELDS = {
  sueldoBasico: 0, aporteEmpresa: 0, teletrabajo: 0, premioReconocimientoImpto: 0,
  ticketsAlimentacion: 0, comisionesAnioActual: 0, valeGasolina: 0, sueldoVacaciones: 0,
  ventaVacaciones: 0, remuneracion1Mayo: 0, vacacionesDevengadas: 0, gratificacion: 0,
  equitySharesTaxable: 0, totalHaberes: 0,
  seguroVida: 0, premioReconocimientoGrossUp: 0, comisionesAnioAnterior: 0,
  participacionUtilidades: 0, equityRsuPsuPayout: 0, indemVacacional: 0,
  bonificacionExtraord: 0, equityCashPayout: 0, equityTaxCoverAdvance: 0,
  equityNetSaleProceeds: 0, totalOtrosHaberes: 0,
  afp: 0, seguroAfp: 0, comisionAfp: 0, impuesto5ta: 0, totalDescuentos: 0,
  abonoGratificacion: 0, abonoUtilidades: 0, dctoValeGasolina: 0, dctoPremioReconocimiento: 0,
  contribucionEmpleado: 0, desctoAporteEmpresa: 0, dctoSeguroVida: 0, dctoTicketsAlimentacion: 0,
  essaludVida: 0, equitySharesTaxableDscto: 0, equityTaxCoverAdvanceDscto: 0, totalOtrosDescuentos: 0,
  epsPrivado: 0, essalud: 0, vidaLey: 0, totalAportes: 0,
  netoAPagar: 0,
}

const EMPTY: Omit<ReciboHaberes, 'id' | 'creadoEn' | 'actualizadoEn'> = {
  fecha: new Date().toISOString().slice(0, 10),
  ...ZERO_FIELDS,
  notas: undefined,
}

type Draft = Omit<ReciboHaberes, 'id' | 'creadoEn' | 'actualizadoEn'>

function calcTotales(v: Draft): Draft {
  const totalHaberes = v.sueldoBasico + v.aporteEmpresa + v.teletrabajo + v.premioReconocimientoImpto +
    v.ticketsAlimentacion + v.comisionesAnioActual + v.valeGasolina + v.sueldoVacaciones +
    v.ventaVacaciones + v.remuneracion1Mayo + v.vacacionesDevengadas + v.gratificacion + v.equitySharesTaxable

  const totalOtrosHaberes = v.seguroVida + v.premioReconocimientoGrossUp + v.comisionesAnioAnterior +
    v.participacionUtilidades + v.equityRsuPsuPayout + v.indemVacacional + v.bonificacionExtraord +
    v.equityCashPayout + v.equityTaxCoverAdvance + v.equityNetSaleProceeds

  const totalDescuentos = v.afp + v.seguroAfp + v.comisionAfp + v.impuesto5ta

  const totalOtrosDescuentos = v.abonoGratificacion + v.abonoUtilidades + v.dctoValeGasolina +
    v.dctoPremioReconocimiento + v.contribucionEmpleado + v.desctoAporteEmpresa + v.dctoSeguroVida +
    v.dctoTicketsAlimentacion + v.essaludVida + v.equitySharesTaxableDscto + v.equityTaxCoverAdvanceDscto

  const totalAportes = v.epsPrivado + v.essalud + v.vidaLey

  const netoAPagar = (totalHaberes + totalOtrosHaberes) - (totalDescuentos + totalOtrosDescuentos)

  return { ...v, totalHaberes, totalOtrosHaberes, totalDescuentos, totalOtrosDescuentos, totalAportes, netoAPagar }
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  'fecha',
  // Haberes (detalle)
  'sueldoBasico', 'aporteEmpresa', 'teletrabajo', 'premioReconocimientoImpto',
  'ticketsAlimentacion', 'comisionesAnioActual', 'valeGasolina', 'sueldoVacaciones',
  'ventaVacaciones', 'remuneracion1Mayo', 'vacacionesDevengadas', 'gratificacion', 'equitySharesTaxable',
  'totalHaberes',
  // Otros Haberes (detalle)
  'seguroVida', 'premioReconocimientoGrossUp', 'comisionesAnioAnterior',
  'participacionUtilidades', 'equityRsuPsuPayout', 'indemVacacional',
  'bonificacionExtraord', 'equityCashPayout', 'equityTaxCoverAdvance', 'equityNetSaleProceeds',
  'totalOtrosHaberes',
  // Descuentos (detalle)
  'afp', 'seguroAfp', 'comisionAfp', 'impuesto5ta',
  'totalDescuentos',
  // Otros Descuentos (detalle)
  'abonoGratificacion', 'abonoUtilidades', 'dctoValeGasolina', 'dctoPremioReconocimiento',
  'contribucionEmpleado', 'desctoAporteEmpresa', 'dctoSeguroVida', 'dctoTicketsAlimentacion',
  'essaludVida', 'equitySharesTaxableDscto', 'equityTaxCoverAdvanceDscto',
  'totalOtrosDescuentos',
  // Aportes (detalle)
  'epsPrivado', 'essalud', 'vidaLey',
  'totalAportes',
  // Neto
  'netoAPagar',
  'notas',
]

function descargarPlantilla() {
  const ejemplo = ['2022-01-31', '14496.21', '0', '195', '9905', '436', '0', '120', '0', '0', '0', '0', '0', '0',
    '46', '4301.80', '0', '0', '0', '0', '0', '0', '0', '0',
    '2889.80', '183.31', '80.91', '5131.66',
    '0', '0', '120', '9905', '0', '0', '46', '436', '5', '0', '0',
    '650.21', '1950.62', '43.49',
    '']
  const blob = new Blob([CSV_HEADERS.join(',') + '\n' + ejemplo.join(',') + '\n'], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'plantilla_haberes.csv'; a.click()
  URL.revokeObjectURL(url)
}

type ErrorFila = { fila: number; msg: string }

function parsearCsv(texto: string): { filas: Draft[]; errores: ErrorFila[] } {
  const filas: Draft[] = []
  const errores: ErrorFila[] = []
  const delim = texto.split('\n')[0].includes(';') ? ';' : ','
  const lineas = texto.trim().split('\n')
  if (lineas.length < 2) { errores.push({ fila: 0, msg: 'Archivo vacío o sin datos' }); return { filas, errores } }

  // Limpiar headers: minúsculas, sin espacios, sin caracteres invisibles
  const headers = lineas[0].split(delim).map(h =>
    h.trim().replace(/"/g, '').toLowerCase().replace(/\s+/g, '').replace(/[^\x20-\x7E]/g, '')
  )
  const idx = (k: string) => headers.indexOf(k.replace(/[^\x20-\x7E]/g, '').toLowerCase())
  const get = (cols: string[], k: string) => { const j = idx(k); return j >= 0 ? cols[j] ?? '' : '' }
  const num = (cols: string[], k: string) => { const v = parseFloat(get(cols, k).replace(',', '.')); return isNaN(v) ? 0 : v }

  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i].trim()
    if (!linea) continue
    const cols = linea.split(delim).map(c => c.trim().replace(/"/g, ''))
    const g = (k: string) => get(cols, k)
    const n = (k: string) => num(cols, k)

    const rawFecha = g('fecha')
    if (!rawFecha) { errores.push({ fila: i + 1, msg: 'Falta fecha' }); continue }
    // Normalizar fecha a YYYY-MM-DD (soporta DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
    let fecha = rawFecha
    const dmy = rawFecha.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (dmy) fecha = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`

    // Calcular desde componentes primero
    const base = calcTotales({
      fecha,
      // Haberes
      sueldoBasico: n('sueldobasico'),
      aporteEmpresa: n('aporteempresa'),
      teletrabajo: n('teletrabajo'),
      premioReconocimientoImpto: n('premioreconocimientoimpto'),
      ticketsAlimentacion: n('ticketsalimentacion'),
      comisionesAnioActual: n('comisionesanioactual') || n('comisionesanioacutal') || n('comisionesanioacual'),
      valeGasolina: n('valegasolina'),
      sueldoVacaciones: n('sueldovacaciones'),
      ventaVacaciones: n('ventavacaciones'),
      remuneracion1Mayo: n('remuneracion1mayo'),
      vacacionesDevengadas: n('vacacionesdevengadas'),
      gratificacion: n('gratificacion'),
      equitySharesTaxable: n('equitysharestaxable'),
      totalHaberes: 0,
      // Otros Haberes
      seguroVida: n('segurovida'),
      premioReconocimientoGrossUp: n('premioreconocimientogrossup'),
      comisionesAnioAnterior: n('comisionesanioanterior'),
      participacionUtilidades: n('participacionutilidades'),
      equityRsuPsuPayout: n('equityrsupsupayout'),
      indemVacacional: n('indemvacacional'),
      bonificacionExtraord: n('bonificacionextraord'),
      equityCashPayout: n('equitycashpayout'),
      equityTaxCoverAdvance: n('equitytaxcoveradvance'),
      equityNetSaleProceeds: n('equitynetsaleproceeds'),
      totalOtrosHaberes: 0,
      // Descuentos
      afp: n('afp'),
      seguroAfp: n('seguroafp'),
      comisionAfp: n('comisionafp'),
      impuesto5ta: n('impuesto5ta'),
      totalDescuentos: 0,
      // Otros Descuentos
      abonoGratificacion: n('abonogratificacion'),
      abonoUtilidades: n('abonoutilidades'),
      dctoValeGasolina: n('dctovalegasolina'),
      dctoPremioReconocimiento: n('dctopremioReconocimiento') || n('dctopremio'),
      contribucionEmpleado: n('contribucionempleado'),
      desctoAporteEmpresa: n('desctoaporteempresa'),
      dctoSeguroVida: n('dctosegurovida'),
      dctoTicketsAlimentacion: n('dctoticketsalimentacion') || n('dctotickets'),
      essaludVida: n('essaludvida'),
      equitySharesTaxableDscto: n('equitysharestaxabledscto'),
      equityTaxCoverAdvanceDscto: n('equitytaxcoveradvancedscto'),
      totalOtrosDescuentos: 0,
      // Aportes
      epsPrivado: n('epsprivado'),
      essalud: n('essalud'),
      vidaLey: n('vidaley') || n('vdaley'),
      totalAportes: 0,
      netoAPagar: 0,
      notas: g('notas') || undefined,
    })

    // Si el CSV tiene columnas de TOTALES precalculados (de Excel), usarlos para sobreescribir
    // Esto permite importar directamente desde el Excel sin descomponer cada sub-campo
    const csvTotalHaberes       = n('totalhaberes') || n('total_haberes')
    const csvTotalOtrosHaberes  = n('totalotroshaberes') || n('total_otros_haberes') || n('totalotros')
    const csvTotalDescuentos    = n('totaldescuentos') || n('total_descuentos')
    const csvTotalOtrosDesc     = n('totalotrosdescuentos') || n('total_otros_descuentos') || n('totalotrosdesc')
    const csvTotalAportes       = n('totalaportes') || n('total_aportes')
    const csvNeto               = n('netoapagar') || n('neto_a_pagar') || n('neto')

    const totalHaberes      = csvTotalHaberes      || base.totalHaberes
    const totalOtrosHaberes = csvTotalOtrosHaberes || base.totalOtrosHaberes
    const totalDescuentos   = csvTotalDescuentos   || base.totalDescuentos
    const totalOtrosDesc    = csvTotalOtrosDesc     || base.totalOtrosDescuentos
    const totalAportes      = csvTotalAportes       || base.totalAportes
    const netoAPagar        = csvNeto || (totalHaberes + totalOtrosHaberes) - (totalDescuentos + totalOtrosDesc)

    filas.push({
      ...base,
      totalHaberes,
      totalOtrosHaberes,
      totalDescuentos,
      totalOtrosDescuentos: totalOtrosDesc,
      totalAportes,
      netoAPagar,
    })
  }
  return { filas, errores }
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>{label}</label>
      <input type="number" min={0} step={0.01} value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right font-mono" style={inputStyle} placeholder="0" />
    </div>
  )
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--color-fondo)', border: '1px solid var(--color-borde)' }}>
      <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color }}>{title}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
    </div>
  )
}

function Total({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-end pb-1">
      <div>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{label}</p>
        <p className="font-bold font-mono text-sm" style={{ color }}>S/ {fmt(value)}</p>
      </div>
    </div>
  )
}

function ReciboForm({ value, onChange, onSave, onCancel }: {
  value: Draft; onChange: (v: Draft) => void; onSave: () => void; onCancel: () => void
}) {
  useSubmitOnCmdEnter(onSave)
  const c = calcTotales(value)
  function upd(field: keyof Draft, val: number | string | undefined) {
    const next = { ...value, [field]: val } as Draft
    onChange(calcTotales(next))
  }
  const n = (f: keyof Draft) => (v: number) => upd(f, v)

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Mes (fecha)</label>
        <input type="date" value={value.fecha} onChange={e => onChange(calcTotales({ ...value, fecha: e.target.value }))}
          className="w-48 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
      </div>

      <Section title="Haberes" color="#22c55e">
        <NumInput label="Sueldo Básico" value={value.sueldoBasico} onChange={n('sueldoBasico')} />
        <NumInput label="Aporte Empresa" value={value.aporteEmpresa} onChange={n('aporteEmpresa')} />
        <NumInput label="Teletrabajo" value={value.teletrabajo} onChange={n('teletrabajo')} />
        <NumInput label="Premio Reconoc. (Impto)" value={value.premioReconocimientoImpto} onChange={n('premioReconocimientoImpto')} />
        <NumInput label="Tickets Alimentación" value={value.ticketsAlimentacion} onChange={n('ticketsAlimentacion')} />
        <NumInput label="Comisiones (Año Actual)" value={value.comisionesAnioActual} onChange={n('comisionesAnioActual')} />
        <NumInput label="Vale Gasolina" value={value.valeGasolina} onChange={n('valeGasolina')} />
        <NumInput label="Sueldo Vacaciones" value={value.sueldoVacaciones} onChange={n('sueldoVacaciones')} />
        <NumInput label="Venta Vacaciones" value={value.ventaVacaciones} onChange={n('ventaVacaciones')} />
        <NumInput label="Remun. 1ro de Mayo" value={value.remuneracion1Mayo} onChange={n('remuneracion1Mayo')} />
        <NumInput label="Vacaciones Devengadas" value={value.vacacionesDevengadas} onChange={n('vacacionesDevengadas')} />
        <NumInput label="Gratificación" value={value.gratificacion} onChange={n('gratificacion')} />
        <NumInput label="Equity Shares Taxable" value={value.equitySharesTaxable} onChange={n('equitySharesTaxable')} />
        <Total label="Total Haberes" value={c.totalHaberes} color="#22c55e" />
      </Section>

      <Section title="Otros Haberes" color="#10b981">
        <NumInput label="Seguro de Vida" value={value.seguroVida} onChange={n('seguroVida')} />
        <NumInput label="Premio Reconoc. Gross Up" value={value.premioReconocimientoGrossUp} onChange={n('premioReconocimientoGrossUp')} />
        <NumInput label="Comisiones (Año Anterior)" value={value.comisionesAnioAnterior} onChange={n('comisionesAnioAnterior')} />
        <NumInput label="Participación Utilidades" value={value.participacionUtilidades} onChange={n('participacionUtilidades')} />
        <NumInput label="Equity RSU/PSU Payout" value={value.equityRsuPsuPayout} onChange={n('equityRsuPsuPayout')} />
        <NumInput label="Indem. Vacacional" value={value.indemVacacional} onChange={n('indemVacacional')} />
        <NumInput label="Bonif. Extraord." value={value.bonificacionExtraord} onChange={n('bonificacionExtraord')} />
        <NumInput label="Equity Cash Payout" value={value.equityCashPayout} onChange={n('equityCashPayout')} />
        <NumInput label="Equity Tax Cover Advance" value={value.equityTaxCoverAdvance} onChange={n('equityTaxCoverAdvance')} />
        <NumInput label="Equity Net Sale Proceeds" value={value.equityNetSaleProceeds} onChange={n('equityNetSaleProceeds')} />
        <Total label="Total Otros Haberes" value={c.totalOtrosHaberes} color="#10b981" />
      </Section>

      <Section title="Descuentos" color="#ef4444">
        <NumInput label="AFP, Fdo Pensiones (10%)" value={value.afp} onChange={n('afp')} />
        <NumInput label="AFP, Seguro (1.37%)" value={value.seguroAfp} onChange={n('seguroAfp')} />
        <NumInput label="AFP, Comisión (0.28%)" value={value.comisionAfp} onChange={n('comisionAfp')} />
        <NumInput label="Impuesto 5ta Categoría" value={value.impuesto5ta} onChange={n('impuesto5ta')} />
        <Total label="Total Descuentos" value={c.totalDescuentos} color="#ef4444" />
      </Section>

      <Section title="Otros Descuentos" color="#f97316">
        <NumInput label="Abono Gratificación" value={value.abonoGratificacion} onChange={n('abonoGratificacion')} />
        <NumInput label="Abono Utilidades" value={value.abonoUtilidades} onChange={n('abonoUtilidades')} />
        <NumInput label="Dcto Vale Gasolina" value={value.dctoValeGasolina} onChange={n('dctoValeGasolina')} />
        <NumInput label="Dcto Premio Reconoc." value={value.dctoPremioReconocimiento} onChange={n('dctoPremioReconocimiento')} />
        <NumInput label="Contribución Empleado" value={value.contribucionEmpleado} onChange={n('contribucionEmpleado')} />
        <NumInput label="Descto Aporte Empresa" value={value.desctoAporteEmpresa} onChange={n('desctoAporteEmpresa')} />
        <NumInput label="Dcto Seguro de Vida" value={value.dctoSeguroVida} onChange={n('dctoSeguroVida')} />
        <NumInput label="Dcto Tickets Alimentación" value={value.dctoTicketsAlimentacion} onChange={n('dctoTicketsAlimentacion')} />
        <NumInput label="EsSalud + Vida" value={value.essaludVida} onChange={n('essaludVida')} />
        <NumInput label="Equity Shares Taxable Dscto" value={value.equitySharesTaxableDscto} onChange={n('equitySharesTaxableDscto')} />
        <NumInput label="Equity Tax Cover Adv. Dscto" value={value.equityTaxCoverAdvanceDscto} onChange={n('equityTaxCoverAdvanceDscto')} />
        <Total label="Total Otros Descuentos" value={c.totalOtrosDescuentos} color="#f97316" />
      </Section>

      <Section title="Aportes Empleador" color="#8b5cf6">
        <NumInput label="EPS Privado" value={value.epsPrivado} onChange={n('epsPrivado')} />
        <NumInput label="EsSALUD" value={value.essalud} onChange={n('essalud')} />
        <NumInput label="Vida Ley" value={value.vidaLey} onChange={n('vidaLey')} />
        <Total label="Total Aportes" value={c.totalAportes} color="#8b5cf6" />
      </Section>

      <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-acento)20', border: '1px solid var(--color-acento)' }}>
        <span className="font-semibold text-sm" style={{ color: 'var(--color-acento)' }}>Neto a pagar</span>
        <span className="font-bold font-mono" style={{ color: 'var(--color-acento)' }}>S/ {fmt(c.netoAPagar)}</span>
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Notas</label>
        <input value={value.notas ?? ''} onChange={e => onChange({ ...value, notas: e.target.value || undefined })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Opcional" />
      </div>

      <div className="flex gap-2">
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function Paycheck() {
  const { recibos, loading, agregarRecibo, actualizarRecibo, borrarRecibo, recargarRecibos } = useFinanceData()
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState<Draft>({ ...EMPTY })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<ReciboHaberes | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear())

  const fileRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<Draft[] | null>(null)
  const [importErrores, setImportErrores] = useState<ErrorFila[]>([])
  const [importando, setImportando] = useState(false)

  // OCR boleta PDF
  const boletaRef = useRef<HTMLInputElement>(null)
  const [leyendoBoleta, setLeyendoBoleta] = useState(false)
  const [errorBoleta, setErrorBoleta] = useState<string | null>(null)

  function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const { filas, errores } = parsearCsv(ev.target?.result as string)
      setImportPreview(filas); setImportErrores(errores)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  async function confirmarImport() {
    if (!importPreview?.length) return
    setImportando(true)
    for (const fila of importPreview) await agregarRecibo(fila)
    await recargarRecibos()
    setImportando(false); setImportPreview(null); setImportErrores([])
  }

  const years = [...new Set(recibos.map(r => new Date(r.fecha).getFullYear()))].sort((a, b) => b - a)
  if (!years.includes(anioFiltro)) years.unshift(anioFiltro)
  const del_anio = recibos.filter(r => new Date(r.fecha).getFullYear() === anioFiltro)
  const totalNeto = del_anio.reduce((s, r) => s + r.netoAPagar, 0)
  const totalBruto = del_anio.reduce((s, r) => s + r.totalHaberes + r.totalOtrosHaberes, 0)
  const totalIR = del_anio.reduce((s, r) => s + r.impuesto5ta, 0)

  async function handleSubirBoleta(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLeyendoBoleta(true)
    setErrorBoleta(null)
    try {
      const campos = await parseBoleta(file)
      const draft = calcTotales({ ...EMPTY, ...campos })
      setNewDraft(draft)
      setAdding(true)
    } catch (err) {
      setErrorBoleta(err instanceof Error ? err.message : 'Error leyendo boleta')
    } finally {
      setLeyendoBoleta(false)
    }
  }

  async function handleAdd() { const c = calcTotales(newDraft); await agregarRecibo(c); await recargarRecibos(); setAdding(false); setNewDraft({ ...EMPTY }) }
  async function handleSaveEdit() { if (!editDraft) return; await actualizarRecibo(editDraft); setEditingId(null); setEditDraft(null) }

  if (loading) return <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>Cargando…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Recibos de Haberes</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Historial de planilla mensual SAP</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select value={anioFiltro} onChange={e => setAnioFiltro(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={descargarPlantilla}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
            <Download size={14} /> Plantilla
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--color-acento)20', color: 'var(--color-acento)', border: '1px solid var(--color-acento)' }}>
            <Upload size={14} /> Importar CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleArchivoSeleccionado} />
          <button onClick={() => boletaRef.current?.click()} disabled={leyendoBoleta}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
            style={{ background: '#7c3aed20', color: '#7c3aed', border: '1px solid #7c3aed', opacity: leyendoBoleta ? 0.6 : 1 }}>
            {leyendoBoleta ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {leyendoBoleta ? 'Leyendo...' : 'Subir boleta PDF'}
          </button>
          <input ref={boletaRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleSubirBoleta} />
          <button onClick={() => { setAdding(true); setNewDraft({ ...EMPTY }) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--color-acento)' }}>
            <Plus size={16} /> Agregar mes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total bruto', val: `S/ ${fmt(totalBruto)}`, color: 'var(--color-texto)' },
          { label: 'Total neto', val: `S/ ${fmt(totalNeto)}`, color: '#22c55e' },
          { label: 'IR 5ta cat.', val: `S/ ${fmt(totalIR)}`, color: '#ef4444' },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label} {anioFiltro}</p>
            <p className="font-bold text-sm font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Error boleta */}
      {errorBoleta && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm" style={{ background: '#ef444420', border: '1px solid #ef4444', color: '#ef4444' }}>
          <AlertCircle size={14} />
          {errorBoleta}
          <button onClick={() => setErrorBoleta(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Import preview */}
      {importPreview && (
        <div className="rounded-xl overflow-hidden" style={{ border: '2px solid var(--color-acento)', background: 'var(--color-card)' }}>
          <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid var(--color-borde)' }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--color-texto)' }}>
                Vista previa — {importPreview.length} registro{importPreview.length !== 1 ? 's' : ''} listos
              </p>
              {importErrores.length > 0 && (
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#ef4444' }}>
                  <AlertCircle size={11} />{importErrores.length} fila{importErrores.length !== 1 ? 's' : ''} con error se omitirán
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setImportPreview(null); setImportErrores([]) }}
                className="px-3 py-1.5 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
                Cancelar
              </button>
              <button onClick={confirmarImport} disabled={importando || !importPreview.length}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: importando ? 'var(--color-muted)' : 'var(--color-acento)' }}>
                <Check size={14} /> {importando ? 'Importando…' : `Confirmar ${importPreview.length} registros`}
              </button>
            </div>
          </div>
          {importErrores.length > 0 && (
            <div className="px-4 py-2" style={{ background: '#ef444410', borderBottom: '1px solid var(--color-borde)' }}>
              {importErrores.map(e => <p key={e.fila} className="text-xs" style={{ color: '#ef4444' }}>Fila {e.fila}: {e.msg}</p>)}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr style={{ background: 'var(--color-fondo)', color: 'var(--color-muted)' }}>
                  {['Fecha', 'Haberes', 'Otros Haberes', 'Descuentos', 'Otros Desc.', 'Aportes*', 'Neto'].map(h => (
                    <th key={h} className="text-right px-3 py-2 first:text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importPreview.slice(0, 15).map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--color-borde)' }}>
                    <td className="px-3 py-1.5 text-left" style={{ color: 'var(--color-texto)' }}>{r.fecha}</td>
                    <td className="px-3 py-1.5 text-right" style={{ color: 'var(--color-texto)' }}>{fmt(r.totalHaberes)}</td>
                    <td className="px-3 py-1.5 text-right" style={{ color: 'var(--color-muted)' }}>{fmt(r.totalOtrosHaberes)}</td>
                    <td className="px-3 py-1.5 text-right" style={{ color: '#ef4444' }}>{fmt(r.totalDescuentos)}</td>
                    <td className="px-3 py-1.5 text-right" style={{ color: '#f97316' }}>{fmt(r.totalOtrosDescuentos)}</td>
                    <td className="px-3 py-1.5 text-right" style={{ color: 'var(--color-muted)' }}>{fmt(r.totalAportes)}</td>
                    <td className="px-3 py-1.5 text-right font-bold" style={{ color: '#22c55e' }}>{fmt(r.netoAPagar)}</td>
                  </tr>
                ))}
                {importPreview.length > 15 && (
                  <tr style={{ borderTop: '1px solid var(--color-borde)' }}>
                    <td colSpan={7} className="px-3 py-1.5 text-center" style={{ color: 'var(--color-muted)' }}>… y {importPreview.length - 15} más</td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="text-xs px-3 py-2" style={{ color: 'var(--color-muted)' }}>* Aportes empleador — no afectan el neto</p>
          </div>
        </div>
      )}

      {adding && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-texto)' }}>Nuevo recibo</p>
          <ReciboForm value={newDraft} onChange={setNewDraft} onSave={handleAdd} onCancel={() => { setAdding(false); setNewDraft({ ...EMPTY }) }} />
        </div>
      )}

      <div className="space-y-2">
        {del_anio.map(r => {
          const expanded = expandedId === r.id
          if (editingId === r.id && editDraft) {
            return (
              <div key={r.id} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
                <ReciboForm value={editDraft} onChange={v => setEditDraft(v as ReciboHaberes)} onSave={handleSaveEdit} onCancel={() => { setEditingId(null); setEditDraft(null) }} />
              </div>
            )
          }
          return (
            <div key={r.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
              <div className="flex items-center px-4 py-3 cursor-pointer" onClick={() => setExpandedId(expanded ? null : r.id)}>
                <span className="font-mono text-sm font-medium flex-shrink-0 w-28" style={{ color: 'var(--color-texto)' }}>{r.fecha}</span>
                <span className="flex-1" />
                <span className="font-mono text-xs mr-4" style={{ color: 'var(--color-muted)' }}>Bruto: S/ {fmt(r.totalHaberes + r.totalOtrosHaberes)}</span>
                <span className="font-mono text-sm font-bold mr-4" style={{ color: '#22c55e' }}>Neto: S/ {fmt(r.netoAPagar)}</span>
                {expanded ? <ChevronUp size={16} style={{ color: 'var(--color-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-muted)' }} />}
                <button onClick={e => { e.stopPropagation(); setEditingId(r.id); setEditDraft({ ...r }) }} className="ml-3 p-1 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Edit2 size={14} /></button>
                <button onClick={e => { e.stopPropagation(); borrarRecibo(r.id) }} className="ml-1 p-1 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Trash2 size={14} /></button>
              </div>
              {expanded && (
                <div className="px-4 pb-4 border-t space-y-3" style={{ borderColor: 'var(--color-borde)' }}>
                  {([
                    { title: 'Haberes', color: '#22c55e', items: [
                      ['Sueldo básico', r.sueldoBasico], ['Aporte empresa', r.aporteEmpresa],
                      ['Teletrabajo', r.teletrabajo], ['Premio Reconoc.', r.premioReconocimientoImpto],
                      ['Tickets alim.', r.ticketsAlimentacion], ['Comisiones (actual)', r.comisionesAnioActual],
                      ['Vale gasolina', r.valeGasolina], ['Sueldo vacaciones', r.sueldoVacaciones],
                      ['Venta vacaciones', r.ventaVacaciones], ['Remun. 1 mayo', r.remuneracion1Mayo],
                      ['Vac. devengadas', r.vacacionesDevengadas], ['Gratificación', r.gratificacion],
                      ['Equity taxable', r.equitySharesTaxable],
                    ]},
                    { title: 'Otros Haberes', color: '#10b981', items: [
                      ['Seguro vida', r.seguroVida], ['Premio Gross Up', r.premioReconocimientoGrossUp],
                      ['Comisiones (ant.)', r.comisionesAnioAnterior], ['Part. utilidades', r.participacionUtilidades],
                      ['Equity RSU/PSU', r.equityRsuPsuPayout], ['Indem. vacacional', r.indemVacacional],
                      ['Bonif. extraord.', r.bonificacionExtraord], ['Equity cash', r.equityCashPayout],
                      ['Equity tax cover', r.equityTaxCoverAdvance], ['Equity net sale', r.equityNetSaleProceeds],
                    ]},
                    { title: 'Descuentos', color: '#ef4444', items: [
                      ['AFP (10%)', r.afp], ['Seguro AFP', r.seguroAfp],
                      ['Comisión AFP', r.comisionAfp], ['Impuesto 5ta', r.impuesto5ta],
                    ]},
                    { title: 'Otros Descuentos', color: '#f97316', items: [
                      ['Abono gratif.', r.abonoGratificacion], ['Abono utilidades', r.abonoUtilidades],
                      ['Dcto gasolina', r.dctoValeGasolina], ['Dcto premio', r.dctoPremioReconocimiento],
                      ['Contrib. empleado', r.contribucionEmpleado], ['Dcto aporte emp.', r.desctoAporteEmpresa],
                      ['Dcto seguro vida', r.dctoSeguroVida], ['Dcto tickets', r.dctoTicketsAlimentacion],
                      ['EsSalud+Vida', r.essaludVida], ['Equity dscto', r.equitySharesTaxableDscto],
                    ]},
                    { title: 'Aportes Empleador', color: '#8b5cf6', items: [
                      ['EPS Privado', r.epsPrivado], ['EsSALUD', r.essalud], ['Vida Ley', r.vidaLey],
                    ]},
                  ] as Array<{ title: string; color: string; items: [string, number][] }>).map(({ title, color, items }) => {
                    const nonZero = items.filter(([, v]) => v !== 0)
                    if (!nonZero.length) return null
                    return (
                      <div key={title} className="pt-3">
                        <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color }}>{title}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                          {nonZero.map(([label, val]) => (
                            <div key={String(label)}>
                              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{label}</p>
                              <p className="font-mono text-sm" style={{ color: 'var(--color-texto)' }}>S/ {fmt(Number(val))}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {r.notas && <p className="text-xs pt-2" style={{ color: 'var(--color-muted)' }}>Notas: {r.notas}</p>}
                </div>
              )}
            </div>
          )
        })}
        {del_anio.length === 0 && !adding && (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--color-muted)' }}>Sin recibos para {anioFiltro}.</div>
        )}
      </div>
    </div>
  )
}
