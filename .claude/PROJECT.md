# MyFinance — Estado del Proyecto

App web de finanzas personales. Reemplaza el Excel de César. Stack: React + TypeScript + Vite + Tailwind CSS + Recharts + Supabase Auth + Postgres (RLS).

**Dev:** `npm run dev` · **PROD:** https://fin.cesarberrios.com · **Módulos y versiones:** ver `CHANGELOG.md`

---

## Integraciones clave

### Tipo de Cambio — Rextie
- **Endpoint:** POST `https://app.rextie.com/api/v1/fxrates/rate/` · Respuesta: `fx_rate_buy` / `fx_rate_sell`
- **Archivo:** `src/lib/tipoCambio.ts` — fetch directo → fallback proxy Vercel → cache localStorage 1h
- **Proxy Vercel:** `api/tipo-cambio.ts` · **Proxy dev:** Vite reescribe GET `/api/tipo-cambio` como POST a Rextie
- **Uso:** compra para valorizar activos USD; venta para TC de referencia en historial

### Suscripciones → Flujo de Caja (sync automático)
- Al crear Suscripción → se crea FlujoCajaItem automáticamente
- Al editar → se sincroniza el ítem vinculado · Al borrar → se elimina también
- En Flujo de Caja: ítems con `suscripcionId` muestran badge y redirigen a Suscripciones (no editables directamente)
- `flujoCajaItemId` se persiste en `suscripciones.flujo_caja_item_id` y se lee al cargar para cross-reference

### Gastos Familia → Flujo de Caja (sync automático)
- Mismo patrón que Suscripciones — badge "Familia" naranja en Flujo de Caja
- `flujoCajaItemId` se persiste en `gastos_familia.flujo_caja_item_id`
- Al deploy a PROD: correr `010_gastos_familia_links.sql` + UPDATE SQL para enlazar suscripciones existentes:
  ```sql
  UPDATE suscripciones s SET flujo_caja_item_id = fc.id
  FROM flujo_caja fc WHERE fc.nombre = s.nombre
  AND fc.categoria = 'Suscripciones/Membresías' AND s.flujo_caja_item_id IS NULL;
  ```

### Patrimonio ↔ Instrumentos de Simulación
- `Instrumento.cuentaPatrimonioId` vincula al activo real
- Monto live desde Patrimonio (verde) · Botón "Sincronizar ⚠" si diferencia > S/1
- Badge "Simulación" en Patrimonio para cuentas vinculadas al escenario activo

---

## Decisiones técnicas — NO cambiar sin revisar

- **Engine simulación:** `src/engine/calculator.ts` — no renombrar campos internos (edadRetiro, retiroUnico, etc.). Solo cambian labels en UI.
- **Orden de providers en App.tsx:** `ScenarioProvider > PatrimonyProvider > FinanceDataProvider` — ScenarioContext NO puede usar usePatrimony.
- **Período del historial:** día ≤ 10 → mes anterior; día > 10 → mes actual. `PERIODO_THRESHOLD = 10`.
- **Cmd+Enter guarda** en todos los formularios — hook `src/hooks/useSubmitOnCmdEnter.ts`.
- **edadVidaEstimada:** default 85 en ESCENARIO_VACIO.
- **Edge Functions en dev:** `vercel dev` (no `npm run dev`) para `api/invite-user`, `api/block-user`, `api/delete-user`.

---

## Deploy y entornos

| Campo | Valor |
|-------|-------|
| PROD URL | https://fin.cesarberrios.com |
| Vercel project | myfinance (cuenta cberrios93-4516) |
| GitHub repo | https://github.com/cberrios93/myfinance (privado) |
| Supabase PROD | myfinance-prod (ID: ukkedcdccuzvdqhdiecr, us-west-2) |
| DNS | CNAME `fin` → `9e56694f8cf498e1.vercel-dns-017.com` en Cloudflare |
| Env vars Vercel | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY |
| Git push | requiere PAT con scopes `repo` + `workflow` |

### Migraciones ejecutadas (DEV y PROD al día)

| Archivo | Estado |
|---------|--------|
| `001_initial.sql` | ✓ DEV + PROD |
| `002_patrimony.sql` | ✓ DEV + PROD |
| `003_extended.sql` | ✓ DEV + PROD |
| `004_recibos_expand.sql` | ✓ DEV + PROD |
| `005_suscripciones_links.sql` | ✓ DEV + PROD |
| `006_user_profiles.sql` | ✓ DEV + PROD |
| `007_user_status.sql` | ✓ DEV + PROD |
| `008_user_preferences.sql` | ✓ DEV + PROD |
| `009_cuenta_log.sql` | ✓ DEV + PROD |
| `010_gastos_familia_links.sql` | ✓ DEV + PROD |
| `011_cuenta_pinned.sql` | ✓ DEV + PROD |
| `012_rendimientos_mes.sql` | ✓ DEV + PROD |
| `013_rendimientos_aporte_mes.sql` | ✓ DEV + PROD |
| `014_rendimientos_traspaso.sql` | ✓ DEV + PROD |
| `015_cuenta_hidden.sql` | ✓ DEV + PROD |
| `016_rendimientos_impuesto.sql` | ✓ DEV + PROD |
| `017_flujos_capital.sql` | ✓ DEV + PROD |
| `017_flujos_capital.sql` | ✓ DEV + PROD |

---

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `src/data/types.ts` | Todos los tipos TypeScript |
| `src/engine/calculator.ts` | Motor de simulación financiera |
| `src/data/ScenarioContext.tsx` | Provider de escenarios + simulación activa |
| `src/data/PatrimonyContext.tsx` | Provider de cuentas + historial |
| `src/lib/tipoCambio.ts` | Fetch TC desde Rextie con cache |
| `src/lib/supabase/finance.ts` | CRUD completo para todas las entidades |
| `src/lib/parseBoleta.ts` | OCR de boletas PDF vía Claude API |
| `api/tipo-cambio.ts` | Proxy Vercel para Rextie |
| `api/boleta.ts` | Proxy Vercel para Anthropic API |
| `api/invite-user.ts` | Edge Function — invita usuarios vía Supabase Admin API |
| `vite.config.ts` | Proxies dev: Rextie + Anthropic |
| `supabase/migrations/validate_schema.sql` | Script de validación DEV/PROD |
