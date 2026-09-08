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

### Patrimonio ↔ Instrumentos de Simulación
- `Instrumento.cuentaPatrimonioId` vincula al activo real
- Monto live desde Patrimonio (verde) · Botón "Sincronizar ⚠" si diferencia > S/1
- Badge "Simulación" en Patrimonio para cuentas vinculadas al escenario activo

---

## Decisiones técnicas — NO cambiar sin revisar

- **Engine simulación:** `src/engine/calculator.ts` — no renombrar campos internos (edadRetiro, retiroUnico, etc.). Solo cambian labels en UI.
- **Orden de providers en App.tsx:** `ScenarioProvider > PatrimonyProvider > FinanceDataProvider` — ScenarioContext NO puede usar usePatrimony. `UndoProvider` vive en `main.tsx` sobre `AuthProvider` (necesita `ConfigProvider` para leer `undoTimeoutMs`).
- **Sistema de Undo:** `src/contexts/UndoContext.tsx` — `useUndo()` expone `showUndo(label, undoFn)`. Timeout en `AppConfig.undoTimeoutMs` (localStorage, default 8000ms). Toast en `src/components/UndoToast.tsx`, montado en `App.tsx > ProtectedRoutes`. Para Suscripciones y GastosFamilia el undo captura el snapshot del FlujoCajaItem vinculado antes de ejecutar el delete. `makeCRUD` en `FinanceDataContext` usa `useRef` sincronizados on-render para acceder al estado actual en closures de undo sin stale closure issues.
- **Estándar undo (obligatorio):** Toda operación de crear/editar/eliminar en cualquier módulo nuevo DEBE llamar `showUndo()` después de ejecutar en Supabase. Ver `feedback_undo_standard.md` en memory.
- **Período del historial:** día ≤ 10 → mes anterior; día > 10 → mes actual. `PERIODO_THRESHOLD = 10`.
- **Cmd+Enter guarda** en todos los formularios — hook `src/hooks/useSubmitOnCmdEnter.ts`.
- **edadVidaEstimada:** default 85 en ESCENARIO_VACIO.
- **Edge Functions en dev:** `vercel dev` (no `npm run dev`) para `api/invite-user`, `api/block-user`, `api/delete-user`.
- **Dev server en sesiones Claude Code:** el working directory de sesión puede ser `/Users/cberriosm/Projects/` (parent) en lugar de `/myfinance/`. En ese caso `preview_start` falla con ENOENT. Workaround: `cd /Users/cberriosm/Projects/myfinance && npm run dev -- --port 5174` vía Bash, luego `preview_start { url: "http://localhost:5174" }`.
- **CAT_COLORS / CAT_COLORES (canónico):** `Patrimony.tsx` es la fuente autoritativa de colores por categoría. Dashboard y cualquier otro módulo deben usar los mismos valores: Savings=`#3B82F6`, Stock=`#8B5CF6`, Fintech=`#F59E0B`, Business=`#10B981`, Asset=`#6B7280`, Liability=`#EF4444`. No usar valores distintos en otros módulos.
- **Sistema de temas (CRÍTICO):** `ConfigContext.tsx` aplica `PALETAS` vía `root.style.setProperty()` en runtime — esto tiene mayor especificidad que los valores declarados en `index.css`. Consecuencia: si cambias un color en `index.css` y no lo cambias en `src/config/themes.ts` (en la paleta correcta), el cambio no tendrá efecto. `themes.ts` es la fuente autoritativa de colores; `index.css` solo define los defaults iniciales antes del primer render. Si el color sigue igual después de editar index.css, limpiar localStorage (`myfinance_config`) para invalidar la paleta cacheada.
- **Auth — onAuthStateChange es la única fuente de verdad:** `AuthContext.tsx` NO usa `getSession()`. Solo `onAuthStateChange` (que dispara `INITIAL_SESSION` al montar). Razón: `getSession()` en paralelo con `onAuthStateChange` creaba una race condition cuando el token estaba expirado — los providers cargaban con un token inválido, RLS retornaba vacío sin error, y los datos no aparecían hasta hacer refresh. Si se agrega `getSession()` de vuelta, el bug regresa. Los providers (`PatrimonyContext`, `FinanceDataContext`) usan `[user?.id]` como dep del useEffect (no `[user]`) para evitar re-fetches innecesarios en cada token refresh.
- **Paletas activas (v2.1.0+):** Solo dos paletas: `marino-day` (Day, fondo claro `#F2F6FA`, texto navy) y `marino` (Night, fondo `#060E1B`). Ambas usan teal `#00C9A7` fijo. No agregar paletas adicionales — diseño de marca único.
- **`tipoRenta` en `Instrumento` — sin migración SQL:** El campo `tipoRenta?: TipoRenta` ('pago' | 'capitalizacion' | 'variable') se almacena en el JSONB del campo `instrumentos[]` dentro de la tabla `escenarios`. Agregar o modificar este campo no requiere migración de base de datos — solo un cambio en `src/data/types.ts` y en el payload que se serializa a Supabase. Si no está presente en un registro antiguo, se trata como `'pago'` por defecto.
- **historial_mensual no tiene desglose por categoría:** La tabla solo almacena `total_pen` y `total_usd` por período. El módulo Análisis NO puede mostrar composición de categorías por tiempo. Para implementarlo se requiere migración `019_historial_categorias.sql` + refactor del script mensual. Pendiente decisión (ver BACKLOG — Analytics opción 1).
- **React Rules of Hooks en Projection:** Todos los `useMemo`/`useState` DEBEN ir antes de cualquier `return` condicional. `resultado` es nullable (`simular(escenarioActivo) | null`). Historial de bug: hooks después del early return causaron pantalla en blanco silenciosa.
- **Patrimonio no invertido (Proyección):** `cuentasEnlazadas` = Set de `cuentaPatrimonioId` de instrumentos del escenario activo. Las cuentas de Patrimonio cuyo `id` NO está en ese Set se suman como `patrimonioNoInvertido` (montoPEN + montoUSD × tc). Se proyectan por separado a `tasaPatrimonioNoInvertido`.
- **Sueldo base desde Haberes (Proyección):** Promedio de (`sueldoBasico + comisionesAnioActual`) de recibos desde el último `mesAjusteSalarial` hasta hoy (máx 12 meses, excluye meses con gratificación > 0). Si no hay recibos, fallback a `aporteAnualBase / 12`.
- **Rendimiento portafolio anual (Proyección):** `rendimiento[t] = total[t] - total[t-1] - aporteNeto[t] + retirosPuntuales[t]`. El `aporteNeto = max(aporteBase - gastosRecurrentes, 0)` — los eventos reducen el aporte, no el ingreso bruto.
- **Ciclo de compensación SAP:** Si `mesActual >= mesAjuste`, el ciclo inició este año. Si no, inició el año anterior. Meses con `gratificacion > 0` se excluyen del promedio salarial (son extraordinarios).

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
| Resend SMTP | configurado en Supabase Auth → Emails → SMTP Settings: host `smtp.resend.com`, port 465, user `resend`, API key de Resend. Reemplaza el SMTP compartido de Supabase (límite 4 emails/h) |
| Supabase Site URL | Auth → URL Configuration: Site URL = `https://fin.cesarberrios.com`. Redirect URLs incluye `https://fin.cesarberrios.com/**`. Si no está configurado, los links de invite redirigen a localhost |

### Migración de datos DEV → PROD (referencia operacional)

Ejecutada el 2026-09-03 (v2.0.0) y repetida el 2026-09-07 (todos los datos reales de César). Si se necesita repetir:
- **Script:** `scripts/migrate-dev-to-prod.mjs` (ES module, usa `@supabase/supabase-js`)
- **Approach:** detecta `user_id` DEV y PROD por email vía `auth.admin.listUsers()` → lee todas las tablas desde DEV con service_role → remap `user_id` DEV → PROD → INSERT en PROD en orden FK correcto
- **Circular FKs:** `suscripciones ↔ flujo_caja` — inserta `flujo_caja` sin `suscripcion_id`, luego `suscripciones`, luego restaura `suscripcion_id` con UPDATE individuales
- **Flags:** `DRY_RUN=true` para simular sin escribir · `CLEAR_PROD=true` para borrar datos PROD existentes antes de insertar
- **Precaución:** el script solo migra datos del usuario cuyo email está en `USER_EMAIL` (`cberrios93@gmail.com`) — otros usuarios PROD no se tocan
- **Ejecución:** `DEV_SERVICE_KEY="eyJ..." PROD_SERVICE_KEY="eyJ..." node scripts/migrate-dev-to-prod.mjs`
- **Parámetros:** DEV `vzueaqospzqiihyeakra` · PROD `ukkedcdccuzvdqhdiecr` · Service Role Keys en Supabase Dashboard → Settings → API

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
| `018_dashboard_layout.sql` | ✓ DEV + PROD |
| `019_rendimientos_impuesto_pagado.sql` | ✓ DEV + PROD |
| `020_rendimientos_cierre_fiscal.sql` | ✓ DEV + PROD |


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
| `src/modules/Analytics/Analytics.tsx` | Módulo Análisis completo — 3 tabs: Patrimonio (slider + AreaChart + BarChart MoM/YoY + heatmap), Flujo real (flujo declarado vs delta real), Rendimientos (BarChart anual + donut concentración + tabla + rentabilidad). `DualRangeSlider`, `PromptModal` (4+1 enfoques), `buildPrompt()` |
| `src/modules/Projection/Projection.tsx` | Proyección financiera año a año — sueldo, portafolio, patrimonio no invertido, eventos |
| `src/lib/parseBoleta.ts` | OCR de boletas PDF vía Claude API |
| `src/lib/supabase/preferences.ts` | Preferencias del usuario en Supabase: `historial_auto`, `dashboard_layout` |
| `scripts/crear-historial.mjs` | Cron script — crea historial mensual para todos los usuarios con `historial_auto=true` |
| `.github/workflows/historial-mensual.yml` | GitHub Actions cron: se ejecuta el 1° de cada mes a las 8:00 UTC (3am Lima) |
| `api/tipo-cambio.ts` | Proxy Vercel para Rextie |
| `api/boleta.ts` | Proxy Vercel para Anthropic API |
| `api/invite-user.ts` | Edge Function — invita usuarios vía Supabase Admin API (redirectTo dinámico desde referer) |
| `api/block-user.ts` | Edge Function — bloquea/desbloquea usuarios (requiere SUPABASE_SERVICE_ROLE_KEY) |
| `api/delete-user.ts` | Edge Function — elimina usuarios permanentemente con cascade |
| `.claude/myfinance-logo.html` | Brand sheet completo — logo, paleta, tipografía, colores semánticos, chart colors, badges, superficie |
| `vite.config.ts` | Proxies dev: Rextie + Anthropic |
| `supabase/migrations/validate_schema.sql` | Script de validación DEV/PROD |
| `README.md` | Setup del proyecto: requisitos, variables de entorno, cómo correr en dev, deploy |
| `.env.example` | Variables de entorno requeridas (sin valores) — referencia para nuevas máquinas |
| `.claude/CLAUDE.md` | Reglas de trabajo con Claude Code (auto-cargado en cada sesión) |
