// Script: crear registro de historial mensual para todos los usuarios con historial_auto=true
// Ejecutado por GitHub Actions el día 1 de cada mes

const SUPABASE_URL         = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
}

const hoy = new Date()
const diaHoy = hoy.getDate()
const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
const esUltimoDia = diaHoy === ultimoDiaMes

console.log(`Hoy: ${hoy.toISOString().slice(0, 10)} (día ${diaHoy}, último del mes: ${esUltimoDia})`)

// 1. Obtener tipo de cambio desde Rextie (una sola vez para todos)
let tipoCambio = 3.70
try {
  const tcRes = await fetch('https://app.rextie.com/api/v1/fxrates/rate/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_currency: 'USD', target_currency: 'PEN', source_amount: 1 }),
  })
  if (tcRes.ok) {
    const tcData = await tcRes.json()
    tipoCambio = Number(tcData.fx_rate_sell ?? tcData.fx_rate_buy ?? 3.70)
    console.log(`Tipo de cambio Rextie (venta): ${tipoCambio}`)
  } else {
    console.warn('Rextie no disponible, usando TC por defecto: 3.70')
  }
} catch {
  console.warn('Error al obtener TC de Rextie, usando TC por defecto: 3.70')
}

// 2. Obtener todos los usuarios con historial_auto=true
const perfilesRes = await fetch(
  `${SUPABASE_URL}/rest/v1/user_profiles?historial_auto=eq.true&select=user_id,dia_cierre_mensual`,
  { headers }
)
if (!perfilesRes.ok) {
  console.error('Error al obtener perfiles:', await perfilesRes.text())
  process.exit(1)
}
const perfilesAll = await perfilesRes.json()
console.log(`Usuarios con historial_auto=true: ${perfilesAll.length}`)

// Filtrar solo los usuarios cuyo día de cierre coincide con hoy
const perfiles = perfilesAll.filter(p => {
  const dia = p.dia_cierre_mensual ?? 1
  if (dia === 0) return esUltimoDia       // "Último día del mes"
  return diaHoy === dia
})
console.log(`Usuarios a procesar hoy (día ${diaHoy}): ${perfiles.length}`)

if (perfiles.length === 0) {
  console.log('Ningún usuario debe registrar historial hoy. Fin.')
  process.exit(0)
}

// Fecha de referencia: el mes actual (el cron corre al final o inicio del mes que se registra)
// Si el día de cierre es <= 5 asumimos que registra el mes anterior; si es mayor, registra el mes actual
const refMes = diaHoy <= 5
  ? new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  : new Date(hoy.getFullYear(), hoy.getMonth(), 1)
const fecha   = hoy.toISOString().slice(0, 10)
const mes     = String(refMes.getMonth() + 1).padStart(2, '0')
const anio    = refMes.getFullYear()
const periodo = `${mes} - ${anio}`

console.log(`Período: ${periodo} (fecha de registro: ${fecha})`)

// 3. Procesar cada usuario
let exitosos = 0
let fallidos = 0

for (const { user_id } of perfiles) {
  try {
    // Obtener cuentas del usuario
    const cuentasRes = await fetch(
      `${SUPABASE_URL}/rest/v1/cuentas?user_id=eq.${user_id}&select=monto_pen,monto_usd,categoria`,
      { headers }
    )
    if (!cuentasRes.ok) {
      console.error(`[${user_id}] Error al obtener cuentas:`, await cuentasRes.text())
      fallidos++
      continue
    }
    const cuentas = await cuentasRes.json()

    // Sumar totales (Liabilities restan)
    let totalPEN = 0
    let totalUSD = 0
    for (const c of cuentas) {
      const factor = c.categoria === 'Liability' ? -1 : 1
      if (c.monto_pen) totalPEN += factor * Number(c.monto_pen)
      if (c.monto_usd) totalUSD += factor * Number(c.monto_usd)
    }

    // Upsert en historial_mensual
    const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/historial_mensual`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        user_id,
        fecha,
        periodo,
        total_pen: Math.round(totalPEN * 100) / 100,
        total_usd: Math.round(totalUSD * 100) / 100,
        tipo_cambio: tipoCambio,
        nota: 'Creado automáticamente por GitHub Actions',
        actualizado_en: new Date().toISOString(),
      }),
    })

    if (!upsertRes.ok) {
      console.error(`[${user_id}] Error al guardar historial:`, await upsertRes.text())
      fallidos++
      continue
    }

    console.log(`✓ [${user_id}] Historial ${periodo} guardado (PEN: ${totalPEN.toFixed(2)}, USD: ${totalUSD.toFixed(2)})`)
    exitosos++
  } catch (err) {
    console.error(`[${user_id}] Error inesperado:`, err)
    fallidos++
  }
}

console.log(`\nResumen: ${exitosos} exitosos, ${fallidos} fallidos`)
if (fallidos > 0) process.exit(1)
