/**
 * Migración de datos DEV → PROD
 *
 * Uso:
 *   DEV_SERVICE_KEY="eyJ..." PROD_SERVICE_KEY="eyJ..." node scripts/migrate-dev-to-prod.mjs
 *
 * Variables opcionales:
 *   DRY_RUN=true   → solo muestra qué migraría, no escribe nada
 *   CLEAR_PROD=true → borra datos existentes en PROD antes de insertar (¡cuidado!)
 */

import { createClient } from '@supabase/supabase-js';

// ── Configuración ────────────────────────────────────────────────────────────

const DEV_URL  = 'https://vzueaqospzqiihyeakra.supabase.co';
const PROD_URL = 'https://ukkedcdccuzvdqhdiecr.supabase.co';
const USER_EMAIL = 'cberrios93@gmail.com';

const DEV_SERVICE_KEY  = process.env.DEV_SERVICE_KEY;
const PROD_SERVICE_KEY = process.env.PROD_SERVICE_KEY;
const DRY_RUN          = process.env.DRY_RUN === 'true';
const CLEAR_PROD       = process.env.CLEAR_PROD === 'true';

// ── Validación de inputs ─────────────────────────────────────────────────────

if (!DEV_SERVICE_KEY || !PROD_SERVICE_KEY) {
  console.error('\n❌ Faltan variables de entorno:\n');
  console.error('   DEV_SERVICE_KEY="eyJ..."  PROD_SERVICE_KEY="eyJ..."  node scripts/migrate-dev-to-prod.mjs\n');
  process.exit(1);
}

// ── Clientes Supabase ────────────────────────────────────────────────────────

const dev  = createClient(DEV_URL,  DEV_SERVICE_KEY,  { auth: { persistSession: false } });
const prod = createClient(PROD_URL, PROD_SERVICE_KEY, { auth: { persistSession: false } });

// ── Helpers ──────────────────────────────────────────────────────────────────

const log  = (msg) => console.log(msg);
const ok   = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => console.log(`  ⚠ ${msg}`);
const err  = (msg) => { console.error(`  ✗ ${msg}`); process.exit(1); };

async function fetchAll(client, table) {
  const { data, error } = await client.from(table).select('*');
  if (error) err(`No se pudo leer ${table}: ${error.message}`);
  return data ?? [];
}

async function insertBatch(client, table, rows) {
  if (rows.length === 0) { warn(`${table}: sin datos, omitiendo`); return; }
  if (DRY_RUN) { ok(`[DRY_RUN] ${table}: insertaría ${rows.length} filas`); return; }
  const { error } = await client.from(table).insert(rows);
  if (error) err(`Error insertando en ${table}: ${error.message}`);
  ok(`${table}: ${rows.length} filas insertadas`);
}

async function clearTable(client, table) {
  if (DRY_RUN) { warn(`[DRY_RUN] limpiaría ${table}`); return; }
  const { error } = await client.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) err(`Error limpiando ${table}: ${error.message}`);
}

// ── Paso 1: Detectar user_id DEV y PROD ─────────────────────────────────────

async function resolveUserIds() {
  log('\n🔍 Detectando usuarios...');

  const { data: devUsers, error: e1 } = await dev.auth.admin.listUsers();
  if (e1) err(`No se pudo leer auth.users DEV: ${e1.message}`);
  const devUser = devUsers.users.find(u => u.email === USER_EMAIL);
  if (!devUser) err(`Usuario ${USER_EMAIL} no encontrado en DEV`);
  ok(`DEV  user_id: ${devUser.id}`);

  const { data: prodUsers, error: e2 } = await prod.auth.admin.listUsers();
  if (e2) err(`No se pudo leer auth.users PROD: ${e2.message}`);
  const prodUser = prodUsers.users.find(u => u.email === USER_EMAIL);
  if (!prodUser) {
    err(
      `Usuario ${USER_EMAIL} no encontrado en PROD.\n` +
      `  → Primero inicia sesión en https://fin.cesarberrios.com para crear tu cuenta.`
    );
  }
  ok(`PROD user_id: ${prodUser.id}`);

  return { devId: devUser.id, prodId: prodUser.id };
}

// ── Paso 2: Leer todos los datos de DEV ─────────────────────────────────────

async function readDev(devId) {
  log('\n📥 Leyendo datos de DEV...');

  const tables = [
    'cuentas', 'historial_mensual', 'escenarios',
    'rendimientos', 'recibos_haberes', 'gastos_familia',
    'deudas_pendientes', 'notas', 'flujo_caja', 'suscripciones',
  ];

  const data = {};
  for (const t of tables) {
    const rows = await fetchAll(dev, t);
    const mine = rows.filter(r => r.user_id === devId);
    ok(`${t}: ${mine.length} filas`);
    data[t] = mine;
  }
  return data;
}

// ── Paso 3: Limpiar PROD si se pidió ────────────────────────────────────────

async function clearProd() {
  log('\n🗑  Limpiando datos PROD existentes...');
  // Orden inverso para respetar FK constraints
  const order = [
    'suscripciones', 'flujo_caja', 'notas', 'deudas_pendientes',
    'gastos_familia', 'recibos_haberes', 'rendimientos',
    'escenarios', 'historial_mensual', 'cuentas',
  ];
  for (const t of order) await clearTable(prod, t);
}

// ── Paso 4: Insertar en PROD ─────────────────────────────────────────────────

async function writeProd(data, devId, prodId) {
  log('\n📤 Escribiendo en PROD...');

  // Remap: reemplaza devId → prodId en user_id de cada fila
  const remap = (rows, extra = {}) =>
    rows.map(r => ({ ...r, user_id: prodId, ...extra }));

  // Tablas simples (sin cross-FK entre ellas)
  await insertBatch(prod, 'cuentas',          remap(data['cuentas']));
  await insertBatch(prod, 'historial_mensual', remap(data['historial_mensual']));
  await insertBatch(prod, 'escenarios',        remap(data['escenarios']));
  await insertBatch(prod, 'rendimientos',      remap(data['rendimientos']));
  await insertBatch(prod, 'recibos_haberes',   remap(data['recibos_haberes']));
  await insertBatch(prod, 'gastos_familia',    remap(data['gastos_familia']));
  await insertBatch(prod, 'deudas_pendientes', remap(data['deudas_pendientes']));
  await insertBatch(prod, 'notas',             remap(data['notas']));

  // ── flujo_caja y suscripciones tienen FK circular entre sí ──────────────
  // Estrategia: insertar flujo_caja SIN suscripcion_id, luego suscripciones
  // con flujo_caja_item_id correcto (los IDs son los mismos UUIDs del DEV),
  // y finalmente actualizar flujo_caja con suscripcion_id.

  const flujoCajaRows = remap(data['flujo_caja']).map(r => ({
    ...r,
    suscripcion_id: null, // se actualizará luego
  }));
  await insertBatch(prod, 'flujo_caja', flujoCajaRows);

  // suscripciones: flujo_caja_item_id ya apunta al mismo UUID (que existe en PROD ahora)
  await insertBatch(prod, 'suscripciones', remap(data['suscripciones']));

  // Restaurar suscripcion_id en flujo_caja para los que lo tenían
  const conLink = data['flujo_caja'].filter(r => r.suscripcion_id != null);
  if (conLink.length > 0) {
    if (DRY_RUN) {
      warn(`[DRY_RUN] actualizaría suscripcion_id en ${conLink.length} filas de flujo_caja`);
    } else {
      for (const r of conLink) {
        const { error } = await prod
          .from('flujo_caja')
          .update({ suscripcion_id: r.suscripcion_id })
          .eq('id', r.id);
        if (error) err(`Error actualizando suscripcion_id en flujo_caja (id=${r.id}): ${error.message}`);
      }
      ok(`flujo_caja: suscripcion_id restaurado en ${conLink.length} filas`);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('');
  log('╔════════════════════════════════════════════╗');
  log('║     MyFinance — Migración DEV → PROD       ║');
  log('╚════════════════════════════════════════════╝');
  if (DRY_RUN) log('\n⚡ DRY RUN activado — no se escribirá nada en PROD');

  const { devId, prodId } = await resolveUserIds();
  const data = await readDev(devId);

  const total = Object.values(data).reduce((s, r) => s + r.length, 0);
  log(`\n📊 Total a migrar: ${total} filas`);

  if (CLEAR_PROD) {
    await clearProd();
  } else {
    warn('CLEAR_PROD no activado — si ya hay datos en PROD podría haber conflictos de IDs');
    warn('Si falla, vuelve a ejecutar con CLEAR_PROD=true');
  }

  await writeProd(data, devId, prodId);

  log('\n✅ Migración completada.\n');
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
