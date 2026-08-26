// Script: crear registro de historial mensual
// Ejecutado por GitHub Actions el día 1 de cada mes
// Captura el patrimonio del mes anterior

const SUPABASE_URL          = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const USER_ID               = process.env.SUPABASE_USER_ID

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !USER_ID) {
  console.error('Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_USER_ID')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
}

// Fecha de referencia: último día del mes anterior
const hoy = new Date()
const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
const fecha = ultimoDiaMesAnterior.toISOString().slice(0, 10)
const mes   = String(ultimoDiaMesAnterior.getMonth() + 1).padStart(2, '0')
const anio  = ultimoDiaMesAnterior.getFullYear()
const periodo = `${mes} - ${anio}`

console.log(`Creando historial para período: ${periodo} (fecha: ${fecha})`)

// 1. Obtener cuentas del usuario
const cuentasRes = await fetch(
  `${SUPABASE_URL}/rest/v1/cuentas?user_id=eq.${USER_ID}&select=monto_pen,monto_usd,categoria`,
  { headers }
)
if (!cuentasRes.ok) {
  console.error('Error al obtener cuentas:', await cuentasRes.text())
  process.exit(1)
}
const cuentas = await cuentasRes.json()

// Sumar totales (Liabilities restan)
let totalPEN = 0
let totalUSD = 0
for (const c of cuentas) {
  const esLiability = c.categoria === 'Liability'
  const factor = esLiability ? -1 : 1
  if (c.monto_pen) totalPEN += factor * Number(c.monto_pen)
  if (c.monto_usd) totalUSD += factor * Number(c.monto_usd)
}

console.log(`Total PEN: ${totalPEN.toFixed(2)} | Total USD: ${totalUSD.toFixed(2)}`)

// 2. Obtener tipo de cambio desde Rextie
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

// 3. Insertar en historial_mensual (upsert — no duplica si ya existe)
const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/historial_mensual`, {
  method: 'POST',
  headers: {
    ...headers,
    'Prefer': 'resolution=merge-duplicates',
  },
  body: JSON.stringify({
    user_id: USER_ID,
    fecha,
    periodo,
    total_pen: Math.round(totalPEN * 100) / 100,
    total_usd: Math.round(totalUSD * 100) / 100,
    tipo_cambio: tipoCambio,
    nota: `Creado automáticamente por GitHub Actions`,
    actualizado_en: new Date().toISOString(),
  }),
})

if (!upsertRes.ok) {
  console.error('Error al guardar historial:', await upsertRes.text())
  process.exit(1)
}

console.log(`✓ Historial ${periodo} guardado correctamente`)
