// Vercel Edge Function — Email semanal de MyFinance
// Llamada por GitHub Actions cada hora con Bearer CRON_SECRET.
// Para cada usuario activo cuyo día/hora coincide con "ahora" en su zona horaria:
//   1. Compila contexto financiero desde Supabase
//   2. Genera 5 insights vía Claude Haiku
//   3. Envía email por Resend
export const config = { runtime: 'edge' }

import { createClient } from '@supabase/supabase-js'

// ── Helpers de formato ────────────────────────────────────────────────────────

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function fmtPEN(n: number) {
  return 'S/ ' + Math.round(n).toLocaleString('es-PE')
}

function semanaLabel() {
  const d = new Date()
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

// ── Compilar contexto financiero ─────────────────────────────────────────────

async function compilarContexto(sb: ReturnType<typeof createClient>, userId: string) {
  const hoy = new Date()
  const mesActual = hoy.getMonth() + 1
  const anioActual = hoy.getFullYear()
  const mesAnterior = mesActual === 1 ? 12 : mesActual - 1
  const anioAnterior = mesActual === 1 ? anioActual - 1 : anioActual

  // Historial mensual (últimos 12 registros)
  const { data: historial = [] } = await sb
    .from('historial_mensual')
    .select('*')
    .eq('user_id', userId)
    .order('fecha', { ascending: false })
    .limit(12)

  // Flujo de caja activo
  const { data: flujo = [] } = await sb
    .from('flujo_caja')
    .select('*')
    .eq('user_id', userId)
    .eq('activo', true)

  // Rendimientos del mes anterior
  const { data: rendimientos = [] } = await sb
    .from('rendimientos')
    .select('*')
    .eq('user_id', userId)
    .eq('anio', anioAnterior)
    .eq('mes', mesAnterior)

  // Rendimientos con impuesto pendiente
  const { data: todosRendimientos = [] } = await sb
    .from('rendimientos')
    .select('anio, mes, impuesto_pagado, tasa_impuesto')
    .eq('user_id', userId)

  // Escenario activo (primero encontrado)
  const { data: escenarios = [] } = await sb
    .from('escenarios')
    .select('*')
    .eq('user_id', userId)
    .limit(1)

  // Deudas pendientes
  const { data: deudas = [] } = await sb
    .from('deudas_pendientes')
    .select('*')
    .eq('user_id', userId)
    .neq('estado', 'Pagado')

  // Tipo de cambio (del historial más reciente con USD)
  const tcRef = historial.find((h: Record<string,unknown>) => h.tipo_cambio)?.tipo_cambio ?? 3.8

  // Patrimonio actual
  const ultimoHistorial = historial[0]
  const penultHistorial = historial[1]
  const patrimonioActual = ultimoHistorial
    ? (ultimoHistorial.total_pen as number) + (ultimoHistorial.total_usd as number) * tcRef
    : 0
  const patrimonioAnterior = penultHistorial
    ? (penultHistorial.total_pen as number) + (penultHistorial.total_usd as number) * tcRef
    : 0
  const deltaPatrimonio = patrimonioActual - patrimonioAnterior

  // Flujo mensual
  const ingresos = flujo
    .filter((f: Record<string,unknown>) => f.tipo === 'Income')
    .reduce((s: number, f: Record<string,unknown>) => s + ((f.monto_pen as number) ?? 0), 0)
  const egresos = flujo
    .filter((f: Record<string,unknown>) => f.tipo === 'Expense')
    .reduce((s: number, f: Record<string,unknown>) => s + ((f.monto_pen as number) ?? 0), 0)
  const tasaAhorro = ingresos > 0 ? Math.round((1 - egresos / ingresos) * 100) : 0

  // Rendimientos del mes anterior
  const totalRendimientos = rendimientos.reduce(
    (s: number, r: Record<string,unknown>) => s + ((r.ganancias_pen as number) ?? 0), 0
  )

  // Impuestos pendientes
  const impPendientes = todosRendimientos.filter((r: Record<string,unknown>) => {
    if (r.impuesto_pagado) return false
    if (!r.tasa_impuesto || (r.tasa_impuesto as number) === 0) return false
    return (r.anio as number) < anioActual ||
      ((r.anio as number) === anioActual && ((r.mes as number) ?? 1) < mesActual)
  })

  // Escenario de retiro
  const esc = escenarios[0]
  const general = esc?.general ?? {}
  const edadActual = general.edad_actual ?? general.edadActual ?? 32
  const edadRetiro = general.edad_retiro ?? general.edadRetiro ?? 57
  const aniosRestantes = edadRetiro - edadActual
  const swr = general.swr ?? 0.04
  // Proyección simple: crecimiento 10% anual desde patrimonio actual
  const capitalProyectado = patrimonioActual * Math.pow(1.1, aniosRestantes)
  const retiroMensual = capitalProyectado * swr / 12
  const progresoPct = Math.min(100, Math.round((patrimonioActual / capitalProyectado) * 100))

  // Eventos próximos (≤6 meses)
  const eventosVida: Array<Record<string,unknown>> = esc?.eventosVida ?? esc?.eventos_vida ?? []
  const eventosProximos = eventosVida
    .map((ev: Record<string,unknown>) => {
      const gr = ev.gastoRecurrente as Record<string,unknown> | undefined
      const ru = ev.retiroUnico as Record<string,unknown> | undefined
      const anioT = (gr?.anioInicioT ?? ru?.anioT ?? 0) as number
      const mesEv = (gr?.mesInicio ?? ru?.mes ?? 1) as number
      const anioEv = anioActual + anioT
      const diff = (anioEv - anioActual) * 12 + (mesEv - mesActual)
      return { nombre: ev.nombre as string, anioEv, mesEv, diff }
    })
    .filter(ev => ev.diff > 0 && ev.diff <= 6)

  // CAGR histórico (primero vs último historial)
  let cagr = 0
  if (historial.length >= 2) {
    const oldest = historial[historial.length - 1]
    const patOld = (oldest.total_pen as number) + (oldest.total_usd as number) * tcRef
    if (patOld > 0) {
      const years = historial.length / 12
      cagr = Math.round((Math.pow(patrimonioActual / patOld, 1 / years) - 1) * 100)
    }
  }

  // Evolucion anual (un registro por año — el último de cada año)
  const evolucionAnual: Record<number, number> = {}
  for (const h of historial) {
    const anio = new Date(h.fecha as string).getFullYear()
    const val = (h.total_pen as number) + (h.total_usd as number) * tcRef
    if (!evolucionAnual[anio] || val > (evolucionAnual[anio] ?? 0)) {
      evolucionAnual[anio] = val
    }
  }

  // Contexto compilado
  const ctx = `
# Contexto financiero personal — ${semanaLabel()}

## PATRIMONIO ACTUAL
- Total: ${fmtPEN(patrimonioActual)}
- PEN directo: ${fmtPEN(ultimoHistorial?.total_pen ?? 0)}
- USD convertido: $${Math.round(ultimoHistorial?.total_usd ?? 0).toLocaleString('es-PE')} × ${tcRef} = ${fmtPEN((ultimoHistorial?.total_usd ?? 0) * tcRef)}
- TC referencia: ${tcRef}
- Delta mensual: ${deltaPatrimonio >= 0 ? '+' : ''}${fmtPEN(deltaPatrimonio)} (${deltaPatrimonio >= 0 ? '+' : ''}${patrimonioAnterior > 0 ? ((deltaPatrimonio / patrimonioAnterior) * 100).toFixed(1) : 0}%)
${cagr > 0 ? `- CAGR histórico estimado: ${cagr}%` : ''}

## EVOLUCIÓN PATRIMONIAL (anual)
${Object.entries(evolucionAnual).sort(([a],[b]) => Number(a)-Number(b)).map(([yr, val]) => `${yr}: ${fmtPEN(val)}`).join('\n')}

## FLUJO DE CAJA MENSUAL
- Ingresos: ${fmtPEN(ingresos)}
- Egresos: ${fmtPEN(egresos)}
- Ahorro neto: ${fmtPEN(ingresos - egresos)} (${tasaAhorro}%)

## INVERSIONES — Rendimientos ${MESES[mesAnterior-1]} ${anioAnterior}
${rendimientos.length > 0
  ? rendimientos.map((r: Record<string,unknown>) => `- ${r.instrumento_nombre}: +${fmtPEN(r.ganancias_pen as number ?? 0)}${r.rentabilidad ? ` (${(r.rentabilidad as number).toFixed(1)}%)` : ''}`).join('\n')
  : '- Sin rendimientos registrados este período'}
- Total del mes: +${fmtPEN(totalRendimientos)}
${impPendientes.length > 0 ? `\n## IMPUESTOS\n- ${impPendientes.length} registro(s) con impuesto pendiente de pago` : ''}

## ESCENARIO DE RETIRO
- Edad actual: ${edadActual} años | Retiro: ${edadRetiro} años (${aniosRestantes} años restantes)
- Capital proyectado: ${fmtPEN(capitalProyectado)} (proyección 10% anual)
- Retiro mensual estimado (SWR ${(swr*100).toFixed(0)}%): ${fmtPEN(retiroMensual)}
- Progreso: ${progresoPct}% del objetivo

${eventosProximos.length > 0 ? `## EVENTOS PRÓXIMOS\n${eventosProximos.map(ev => `- ${ev.nombre}: ${MESES[ev.mesEv-1]} ${ev.anioEv} (en ${ev.diff} meses)`).join('\n')}` : ''}

${deudas.length > 0 ? `## DEUDAS POR COBRAR\n${deudas.map((d: Record<string,unknown>) => `- ${d.deudor}: ${fmtPEN(d.capital as number)} (${d.estado})`).join('\n')}\n- Total: ${fmtPEN(deudas.reduce((s: number, d: Record<string,unknown>) => s + (d.capital as number), 0))}` : ''}
`.trim()

  return {
    ctx,
    patrimonioActual,
    deltaPatrimonio,
    tcRef,
    ingresos,
    egresos,
    tasaAhorro,
    rendimientos: rendimientos as Record<string,unknown>[],
    totalRendimientos,
    capitalProyectado,
    retiroMensual,
    aniosRestantes,
    edadRetiro,
    progresoPct,
    escenarioNombre: esc?.nombre ?? 'Base',
    eventosProximos,
    deudas: deudas as Record<string,unknown>[],
    impPendientes: impPendientes as Record<string,unknown>[],
    ultimoHistorial: ultimoHistorial as Record<string,unknown> | undefined,
  }
}

// ── Generar insights con Claude Haiku ────────────────────────────────────────

interface Insight {
  area: string
  emoji: string
  titulo: string
  observacion: string
  accion: string
}

async function generarInsights(apiKey: string, contexto: string): Promise<Insight[]> {
  const prompt = `Eres un asesor financiero personal experto. Analiza el siguiente contexto financiero y genera exactamente 5 insights concretos y accionables.

REGLAS:
- Exactamente 5 insights, ni más ni menos
- Basados en los números reales del contexto — menciona cifras cuando sea relevante
- Cubre distintas áreas: patrimonio, flujo, inversiones, retiro, riesgo
- Cada insight: observación concreta + acción específica para esta semana
- Responde en español

FORMATO: JSON puro sin bloques de código, sin markdown, comienza con { y termina con }:
{"insights":[{"area":"Patrimonio|Flujo|Inversiones|Retiro|Riesgo","emoji":"emoji","titulo":"max 8 palabras","observacion":"qué pasa con cifras concretas (2-3 oraciones)","accion":"qué hacer esta semana (1 oración directa)"}]}

CONTEXTO:
${contexto}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1400,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic error ${res.status}`)
  const data = await res.json() as { content: Array<{ text: string }> }
  const raw = data.content[0].text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  const parsed = JSON.parse(raw) as { insights: Insight[] }
  return parsed.insights
}

// ── Template email HTML (inline styles — compatible con todos los clientes) ──

function buildEmailHtml(params: {
  nombre: string
  semana: string
  patrimonioActual: number
  deltaPatrimonio: number
  tcRef: number
  ingresos: number
  egresos: number
  tasaAhorro: number
  rendimientos: Record<string,unknown>[]
  totalRendimientos: number
  capitalProyectado: number
  retiroMensual: number
  aniosRestantes: number
  edadRetiro: number
  progresoPct: number
  escenarioNombre: string
  eventosProximos: Array<{ nombre: string; anioEv: number; mesEv: number; diff: number }>
  deudas: Record<string,unknown>[]
  impPendientes: Record<string,unknown>[]
  insights: Insight[]
}): string {
  const {
    nombre, semana,
    patrimonioActual, deltaPatrimonio, tcRef,
    ingresos, egresos, tasaAhorro,
    rendimientos, totalRendimientos,
    capitalProyectado, retiroMensual, aniosRestantes, edadRetiro, progresoPct, escenarioNombre,
    eventosProximos, deudas, impPendientes, insights,
  } = params

  const pos = (n: number) => n >= 0
  const sign = (n: number) => n >= 0 ? '+' : ''
  const deltaPct = deltaPatrimonio !== 0
    ? `${sign(deltaPatrimonio)}${((deltaPatrimonio / (patrimonioActual - deltaPatrimonio)) * 100).toFixed(1)}%`
    : '0%'

  // Alertas automáticas
  const alertas: Array<{ emoji: string; titulo: string; desc: string }> = []
  if (impPendientes.length > 0) {
    alertas.push({ emoji: '🧾', titulo: `${impPendientes.length} impuesto(s) pendiente(s) de pago`, desc: 'Períodos vencidos sin regularizar' })
  }
  if (eventosProximos.length > 0) {
    alertas.push({ emoji: '🗓', titulo: `${eventosProximos.length} evento(s) en los próximos 6 meses`, desc: eventosProximos.map(e => e.nombre).join(', ') })
  }
  if (deudas.length > 0) {
    const vencidas = deudas.filter((d) => d.estado === 'Pendiente' || d.estado === 'Parcial')
    if (vencidas.length > 0) alertas.push({ emoji: '💰', titulo: `${vencidas.length} deuda(s) por cobrar pendientes`, desc: `Total: ${fmtPEN(vencidas.reduce((s, d) => s + (d.capital as number), 0))}` })
  }
  if (tasaAhorro < 20 && ingresos > 0) {
    alertas.push({ emoji: '⚠️', titulo: `Tasa de ahorro baja (${tasaAhorro}%)`, desc: 'Por debajo del objetivo recomendado de 20%' })
  }

  // Colores para instrumentos
  const PALETA = ['#00C9A7','#5B8CF7','#A78BFA','#F472B6','#FB923C','#34D399','#FBBF24','#60A5FA','#94A3B8']

  const chipColor = (estado: string) => {
    if (estado === 'Pendiente') return { bg: '#FEF3C7', color: '#92400E' }
    if (estado === 'Parcial') return { bg: '#DBEAFE', color: '#1E40AF' }
    return { bg: '#FEE2E2', color: '#991B1B' }
  }

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MyFinance — Semana del ${semana}</title>
</head>
<body style="margin:0;padding:24px 0 48px;background:#E8EDF4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1E293B;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:0 16px;">

<table role="presentation" width="600" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12);">

  <!-- HEADER -->
  <tr><td style="background:#162B4A;padding:26px 32px 22px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td><span style="font-weight:200;font-style:italic;color:rgba(255,255,255,0.35);font-size:15px;">my</span><span style="font-weight:700;color:#fff;font-size:15px;letter-spacing:-0.02em;">Finance</span></td>
        <td align="right" style="font-size:10px;font-weight:500;color:rgba(255,255,255,0.4);letter-spacing:0.08em;text-transform:uppercase;">Semana del ${semana}</td>
      </tr>
    </table>
    <div style="height:18px;"></div>
    <div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:3px;">Hola, ${nombre} 👋</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.45);">Tu resumen financiero semanal está listo.</div>
  </td></tr>

  <!-- PATRIMONIO -->
  <tr><td style="background:#fff;padding:24px 32px 20px;border-bottom:1px solid #EEF2F7;">
    <div style="font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:10px;">Patrimonio neto</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:36px;font-weight:800;color:#1E293B;letter-spacing:-0.03em;line-height:1;">${fmtPEN(patrimonioActual)}</td>
        <td align="right" valign="bottom">
          <div style="font-size:16px;font-weight:700;color:${pos(deltaPatrimonio) ? '#10B981' : '#EF4444'};">${sign(deltaPatrimonio)}${fmtPEN(deltaPatrimonio)}</div>
          <div style="font-size:11px;color:#94A3B8;">${sign(deltaPatrimonio)}${deltaPct} este mes</div>
          <div style="display:inline-block;margin-top:4px;font-size:10px;font-weight:500;color:#64748B;background:#F1F5F9;padding:2px 7px;border-radius:99px;">TC: S/ ${tcRef} / USD</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- KPIs -->
  <tr><td style="background:#fff;border-bottom:1px solid #EEF2F7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="33%" style="padding:18px 20px;border-right:1px solid #EEF2F7;vertical-align:top;">
          <div style="font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:5px;">Ingresos · ${MESES[new Date().getMonth()]}</div>
          <div style="font-size:18px;font-weight:700;color:#1E293B;">${fmtPEN(ingresos)}</div>
        </td>
        <td width="33%" style="padding:18px 20px;border-right:1px solid #EEF2F7;vertical-align:top;">
          <div style="font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:5px;">Egresos · ${MESES[new Date().getMonth()]}</div>
          <div style="font-size:18px;font-weight:700;color:#1E293B;">${fmtPEN(egresos)}</div>
        </td>
        <td width="34%" style="padding:18px 20px;vertical-align:top;">
          <div style="font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:5px;">Tasa de ahorro</div>
          <div style="font-size:18px;font-weight:700;color:${tasaAhorro >= 20 ? '#10B981' : '#F59E0B'};">${tasaAhorro}%</div>
          <div style="font-size:11px;color:#94A3B8;">${fmtPEN(ingresos - egresos)} ahorrado</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- PROYECCIÓN DE RETIRO -->
  <tr><td style="background:linear-gradient(135deg,#162B4A 0%,#1E3A5F 100%);padding:22px 32px;">
    <div style="font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:10px;">Proyección de retiro</div>
    <div style="display:inline-block;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:3px 10px;font-size:11px;font-weight:500;color:rgba(255,255,255,0.65);margin-bottom:14px;">● Escenario: ${escenarioNombre}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="33%" style="padding-right:16px;border-right:1px solid rgba(255,255,255,0.1);">
          <div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Capital proyectado</div>
          <div style="font-size:18px;font-weight:700;color:#fff;">${fmtPEN(capitalProyectado)}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);">a los ${edadRetiro} años</div>
        </td>
        <td width="33%" style="padding:0 16px;border-right:1px solid rgba(255,255,255,0.1);">
          <div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Retiro mensual</div>
          <div style="font-size:18px;font-weight:700;color:#fff;">${fmtPEN(retiroMensual)}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);">SWR 4% anual</div>
        </td>
        <td width="34%" style="padding-left:16px;">
          <div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Años restantes</div>
          <div style="font-size:18px;font-weight:700;color:#fff;">${aniosRestantes} años</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);">Progreso: ${progresoPct}%</div>
        </td>
      </tr>
    </table>
    <div style="margin-top:14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:5px;">
        <tr>
          <td style="font-size:10px;color:rgba(255,255,255,0.4);">Camino al retiro</td>
          <td align="right" style="font-size:10px;color:rgba(255,255,255,0.4);">${fmtPEN(patrimonioActual)} de ${fmtPEN(capitalProyectado)}</td>
        </tr>
      </table>
      <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:99px;overflow:hidden;">
        <div style="height:100%;width:${progresoPct}%;background:#00C9A7;border-radius:99px;"></div>
      </div>
    </div>
  </td></tr>

  <!-- INVERSIONES -->
  ${rendimientos.length > 0 ? `
  <tr><td style="background:#fff;padding:20px 32px;border-bottom:1px solid #EEF2F7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
      <tr>
        <td style="font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;">Ganancias inversiones · ${MESES[new Date().getMonth() === 0 ? 11 : new Date().getMonth()-1]} ${new Date().getMonth() === 0 ? new Date().getFullYear()-1 : new Date().getFullYear()}</td>
        <td align="right" style="font-size:18px;font-weight:700;color:#10B981;">+${fmtPEN(totalRendimientos)}</td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EEF2F7;border-radius:8px;overflow:hidden;">
      ${rendimientos.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#FAFBFC'};">
        <td style="padding:8px 12px;width:16px;">
          <div style="width:7px;height:7px;border-radius:50%;background:${PALETA[i % PALETA.length]};"></div>
        </td>
        <td style="padding:8px 4px;font-size:12px;color:#475569;">${r.instrumento_nombre as string}</td>
        <td align="right" style="padding:8px 12px;font-size:12px;font-weight:600;color:#1E293B;">+${fmtPEN(r.ganancias_pen as number ?? 0)}</td>
        <td align="right" style="padding:8px 12px;font-size:11px;font-weight:500;color:#10B981;width:50px;">${r.rentabilidad ? `+${(r.rentabilidad as number).toFixed(1)}%` : '—'}</td>
      </tr>`).join('')}
    </table>
  </td></tr>` : ''}

  <!-- ALERTAS -->
  ${alertas.length > 0 ? `
  <tr><td style="background:#FFFCF0;padding:18px 32px 20px;border-top:2px solid #F59E0B;border-bottom:1px solid #EEF2F7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="font-size:11px;font-weight:600;color:#92400E;letter-spacing:0.06em;text-transform:uppercase;">Alertas activas</td>
        <td align="right"><span style="background:#F59E0B;color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px;">${alertas.length}</span></td>
      </tr>
    </table>
    ${alertas.map(a => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid rgba(245,158,11,0.2);border-radius:8px;margin-bottom:8px;">
      <tr>
        <td style="padding:10px 12px;width:28px;vertical-align:top;font-size:14px;">${a.emoji}</td>
        <td style="padding:10px 0;">
          <div style="font-size:12px;font-weight:500;color:#1E293B;">${a.titulo}</div>
          <div style="font-size:11px;color:#78716C;margin-top:2px;">${a.desc}</div>
        </td>
      </tr>
    </table>`).join('')}
  </td></tr>` : ''}

  <!-- DEUDAS POR COBRAR -->
  ${deudas.length > 0 ? `
  <tr><td style="background:#fff;padding:20px 32px;border-bottom:1px solid #EEF2F7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;">Deudas por cobrar</td>
        <td align="right" style="font-size:15px;font-weight:700;color:#1E293B;">${fmtPEN(deudas.reduce((s, d) => s + (d.capital as number), 0))}</td>
      </tr>
    </table>
    ${deudas.map((d) => {
      const chip = chipColor(d.estado as string)
      return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #F1F5F9;padding:8px 0;">
      <tr>
        <td style="padding:6px 0;font-size:13px;">👤</td>
        <td style="padding:6px 8px;">
          <div style="font-size:12px;font-weight:500;color:#1E293B;">${d.deudor as string}</div>
          <div style="font-size:10px;color:#94A3B8;">${d.concepto as string}</div>
        </td>
        <td align="right" style="padding:6px 8px;font-size:13px;font-weight:600;color:#1E293B;">${fmtPEN(d.capital as number)}</td>
        <td align="right" style="padding:6px 0;"><span style="background:${chip.bg};color:${chip.color};font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;">${d.estado as string}</span></td>
      </tr>
    </table>`}).join('')}
  </td></tr>` : ''}

  <!-- EVENTOS PRÓXIMOS -->
  ${eventosProximos.length > 0 ? `
  <tr><td style="background:#fff;padding:20px 32px;border-bottom:1px solid #EEF2F7;">
    <div style="font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:12px;">Eventos próximos</div>
    ${eventosProximos.map(ev => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #F1F5F9;">
      <tr>
        <td style="padding:8px 0;width:16px;"><div style="width:8px;height:8px;border-radius:50%;background:#F59E0B;"></div></td>
        <td style="padding:8px 10px;">
          <div style="font-size:12px;font-weight:500;color:#1E293B;">${ev.nombre}</div>
          <div style="font-size:10px;color:#94A3B8;">${MESES[ev.mesEv-1]} ${ev.anioEv} · en ${ev.diff} mes${ev.diff > 1 ? 'es' : ''}</div>
        </td>
        <td align="right" style="padding:8px 0;"><span style="background:#FEF3C7;color:#92400E;font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;">${ev.diff} meses</span></td>
      </tr>
    </table>`).join('')}
  </td></tr>` : ''}

  <!-- INSIGHTS IA -->
  <tr><td style="background:#F8FAFC;padding:22px 32px;border-top:1px solid #EEF2F7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
      <tr>
        <td style="font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;">Insights de la semana</td>
        <td align="right" style="font-size:10px;color:#94A3B8;">Generado por IA · ${semana}</td>
      </tr>
    </table>
    ${insights.map((ins, i) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:8px;overflow:hidden;">
      <tr>
        <td style="padding:12px 14px;border-left:3px solid #00C9A7;">
          <div style="margin-bottom:4px;">
            <span style="font-size:14px;">${ins.emoji}</span>
            <span style="font-size:10px;font-weight:600;color:#00C9A7;text-transform:uppercase;letter-spacing:0.06em;margin-left:6px;">${ins.area}</span>
            <span style="font-size:10px;color:#94A3B8;margin-left:6px;">#${i+1}</span>
          </div>
          <div style="font-size:13px;font-weight:600;color:#1E293B;margin-bottom:4px;">${ins.titulo}</div>
          <div style="font-size:12px;color:#475569;line-height:1.5;margin-bottom:6px;">${ins.observacion}</div>
          <div style="font-size:11px;font-weight:500;color:#162B4A;background:#EEF2F7;padding:5px 8px;border-radius:4px;">➡ ${ins.accion}</div>
        </td>
      </tr>
    </table>`).join('')}
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#F1F5F9;padding:16px 32px;text-align:center;">
    <p style="font-size:11px;color:#94A3B8;margin:0;line-height:1.6;">
      MyFinance · <a href="https://fin.cesarberrios.com/configuracion" style="color:#00C9A7;text-decoration:none;">Cambiar preferencias</a> · <a href="https://fin.cesarberrios.com/configuracion" style="color:#00C9A7;text-decoration:none;">Cancelar suscripción</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ── Handler principal ─────────────────────────────────────────────────────────

export default async function handler(req: Request) {
  // Solo POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  // Autenticación por CRON_SECRET
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const resendKey = process.env.RESEND_API_KEY
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!anthropicKey || !resendKey || !supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Env vars faltantes' }), { status: 500 })
  }

  const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

  // Hora actual en UTC
  const ahora = new Date()
  const resultados: Array<{ user_id: string; email: string; status: string; error?: string }> = []

  // Obtener todos los usuarios con email activo
  const { data: preferencias, error: prefErr } = await sb
    .from('email_preferencias')
    .select('*')
    .eq('activo', true)

  if (prefErr || !preferencias) {
    return new Response(JSON.stringify({ error: 'Error leyendo preferencias', detail: prefErr }), { status: 500 })
  }

  for (const pref of preferencias) {
    try {
      // Verificar si este usuario debe recibir el email ahora
      const ahoraUsuario = new Date(
        ahora.toLocaleString('en-US', { timeZone: pref.zona_horaria })
      )
      const horaUsuario = ahoraUsuario.getHours()
      const diaSemana = ahoraUsuario.getDay()

      if (diaSemana !== pref.dia_semana || horaUsuario !== pref.hora) {
        continue
      }

      // Obtener datos del usuario
      const { data: authUser } = await sb.auth.admin.getUserById(pref.user_id)
      if (!authUser?.user?.email) continue

      const email = authUser.user.email
      const nombre = authUser.user.user_metadata?.nombre
        ?? authUser.user.user_metadata?.full_name
        ?? email.split('@')[0]

      // Compilar contexto financiero
      const contexto = await compilarContexto(sb, pref.user_id)

      // Generar insights con Claude
      const insights = await generarInsights(anthropicKey, contexto.ctx)

      // Construir HTML del email
      const html = buildEmailHtml({
        nombre,
        semana: semanaLabel(),
        patrimonioActual: contexto.patrimonioActual,
        deltaPatrimonio: contexto.deltaPatrimonio,
        tcRef: contexto.tcRef,
        ingresos: contexto.ingresos,
        egresos: contexto.egresos,
        tasaAhorro: contexto.tasaAhorro,
        rendimientos: contexto.rendimientos,
        totalRendimientos: contexto.totalRendimientos,
        capitalProyectado: contexto.capitalProyectado,
        retiroMensual: contexto.retiroMensual,
        aniosRestantes: contexto.aniosRestantes,
        edadRetiro: contexto.edadRetiro,
        progresoPct: contexto.progresoPct,
        escenarioNombre: contexto.escenarioNombre,
        eventosProximos: contexto.eventosProximos,
        deudas: contexto.deudas,
        impPendientes: contexto.impPendientes,
        insights,
      })

      // Enviar por Resend
      const mesActual = ahora.getMonth() + 1
      const anioActual = ahora.getFullYear()
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'MyFinance <noreply@cesarberrios.com>',
          to: [email],
          subject: `MyFinance · Tu resumen del ${MESES[mesActual-1]} ${anioActual}`,
          html,
        }),
      })

      if (!resendRes.ok) {
        const err = await resendRes.text()
        resultados.push({ user_id: pref.user_id, email, status: 'error', error: err })
      } else {
        resultados.push({ user_id: pref.user_id, email, status: 'enviado' })
      }
    } catch (err) {
      resultados.push({
        user_id: pref.user_id,
        email: '?',
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return new Response(JSON.stringify({ ok: true, procesados: preferencias.length, resultados }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
