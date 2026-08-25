import type { ReciboHaberes } from '../data/types'

type CamposExtraidos = Omit<ReciboHaberes,
  'id' | 'creadoEn' | 'actualizadoEn' |
  'totalHaberes' | 'totalOtrosHaberes' | 'totalDescuentos' | 'totalOtrosDescuentos' | 'totalAportes' | 'netoAPagar'
>

async function pdfToBase64Images(file: File): Promise<string[]> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const results: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise
    results.push(canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''))
  }

  return results
}

const PROMPT = `Eres un asistente que extrae datos de boletas de pago peruanas.
Analiza esta boleta y extrae TODOS los campos que encuentres. Devuelve SOLO un objeto JSON válido, sin texto adicional, con esta estructura exacta (usa 0 para campos no presentes):

{
  "fecha": "YYYY-MM-DD",
  "sueldoBasico": 0,
  "aporteEmpresa": 0,
  "teletrabajo": 0,
  "premioReconocimientoImpto": 0,
  "ticketsAlimentacion": 0,
  "comisionesAnioActual": 0,
  "valeGasolina": 0,
  "sueldoVacaciones": 0,
  "ventaVacaciones": 0,
  "remuneracion1Mayo": 0,
  "vacacionesDevengadas": 0,
  "gratificacion": 0,
  "equitySharesTaxable": 0,
  "seguroVida": 0,
  "premioReconocimientoGrossUp": 0,
  "comisionesAnioAnterior": 0,
  "participacionUtilidades": 0,
  "equityRsuPsuPayout": 0,
  "indemVacacional": 0,
  "bonificacionExtraord": 0,
  "equityCashPayout": 0,
  "equityTaxCoverAdvance": 0,
  "equityNetSaleProceeds": 0,
  "afp": 0,
  "seguroAfp": 0,
  "comisionAfp": 0,
  "impuesto5ta": 0,
  "abonoGratificacion": 0,
  "abonoUtilidades": 0,
  "dctoValeGasolina": 0,
  "dctoPremioReconocimiento": 0,
  "contribucionEmpleado": 0,
  "desctoAporteEmpresa": 0,
  "dctoSeguroVida": 0,
  "dctoTicketsAlimentacion": 0,
  "essaludVida": 0,
  "equitySharesTaxableDscto": 0,
  "equityTaxCoverAdvanceDscto": 0,
  "epsPrivado": 0,
  "essalud": 0,
  "vidaLey": 0,
  "notas": ""
}

Para la fecha: usa el período o mes del recibo en formato YYYY-MM-DD (ej: si dice "Enero 2024" → "2024-01-31").
Para montos: usa números decimales con punto, sin símbolos de moneda ni comas de miles.`

export async function parseBoleta(file: File): Promise<CamposExtraidos> {
  const pages = await pdfToBase64Images(file)

  // Construir content con todas las páginas + prompt al final
  const content: unknown[] = [
    ...pages.map(data => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data } })),
    { type: 'text', text: PROMPT },
  ]

  const response = await fetch('/api/boleta', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Claude API error ${response.status}: ${(err as { error?: { message?: string } }).error?.message ?? response.statusText}`)
  }

  const data = await response.json() as { content: { type: string; text: string }[] }
  const texto = data.content.find(c => c.type === 'text')?.text ?? ''

  // Extraer JSON del response (puede venir entre ```json ... ```)
  const match = texto.match(/```json\s*([\s\S]*?)```/) ?? texto.match(/(\{[\s\S]*\})/)
  const json = match ? match[1] ?? match[0] : texto

  const parsed = JSON.parse(json) as Record<string, unknown>
  const n = (v: unknown) => typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0

  return {
    fecha: (() => {
      const raw = typeof parsed.fecha === 'string' ? parsed.fecha : ''
      const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
      if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
      return raw || new Date().toISOString().slice(0, 10)
    })(),
    sueldoBasico: n(parsed.sueldoBasico),
    aporteEmpresa: n(parsed.aporteEmpresa),
    teletrabajo: n(parsed.teletrabajo),
    premioReconocimientoImpto: n(parsed.premioReconocimientoImpto),
    ticketsAlimentacion: n(parsed.ticketsAlimentacion),
    comisionesAnioActual: n(parsed.comisionesAnioActual),
    valeGasolina: n(parsed.valeGasolina),
    sueldoVacaciones: n(parsed.sueldoVacaciones),
    ventaVacaciones: n(parsed.ventaVacaciones),
    remuneracion1Mayo: n(parsed.remuneracion1Mayo),
    vacacionesDevengadas: n(parsed.vacacionesDevengadas),
    gratificacion: n(parsed.gratificacion),
    equitySharesTaxable: n(parsed.equitySharesTaxable),
    seguroVida: n(parsed.seguroVida),
    premioReconocimientoGrossUp: n(parsed.premioReconocimientoGrossUp),
    comisionesAnioAnterior: n(parsed.comisionesAnioAnterior),
    participacionUtilidades: n(parsed.participacionUtilidades),
    equityRsuPsuPayout: n(parsed.equityRsuPsuPayout),
    indemVacacional: n(parsed.indemVacacional),
    bonificacionExtraord: n(parsed.bonificacionExtraord),
    equityCashPayout: n(parsed.equityCashPayout),
    equityTaxCoverAdvance: n(parsed.equityTaxCoverAdvance),
    equityNetSaleProceeds: n(parsed.equityNetSaleProceeds),
    afp: n(parsed.afp),
    seguroAfp: n(parsed.seguroAfp),
    comisionAfp: n(parsed.comisionAfp),
    impuesto5ta: n(parsed.impuesto5ta),
    abonoGratificacion: n(parsed.abonoGratificacion),
    abonoUtilidades: n(parsed.abonoUtilidades),
    dctoValeGasolina: n(parsed.dctoValeGasolina),
    dctoPremioReconocimiento: n(parsed.dctoPremioReconocimiento),
    contribucionEmpleado: n(parsed.contribucionEmpleado),
    desctoAporteEmpresa: n(parsed.desctoAporteEmpresa),
    dctoSeguroVida: n(parsed.dctoSeguroVida),
    dctoTicketsAlimentacion: n(parsed.dctoTicketsAlimentacion),
    essaludVida: n(parsed.essaludVida),
    equitySharesTaxableDscto: n(parsed.equitySharesTaxableDscto),
    equityTaxCoverAdvanceDscto: n(parsed.equityTaxCoverAdvanceDscto),
    epsPrivado: n(parsed.epsPrivado),
    essalud: n(parsed.essalud),
    vidaLey: n(parsed.vidaLey),
    notas: typeof parsed.notas === 'string' ? parsed.notas || undefined : undefined,
  }
}
