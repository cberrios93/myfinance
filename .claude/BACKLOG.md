# MyFinance — Backlog

> Solo contiene lo pendiente. Todo lo construido está en `CHANGELOG.md`.
> Campos: **Prioridad** · **Tipo** (Feature/Mejora/Fix/Técnico) · **Estado** (Idea/Definido/En DEV/Listo DEV/En PROD)
> Al llegar a "En PROD": el ítem sale de aquí y queda registrado en `CHANGELOG.md`.

---

## 🔴 Alta prioridad

| Tipo | Estado | Ítem |
|------|--------|------|

---

## 🟡 Media prioridad

| Tipo | Estado | Ítem |
|------|--------|------|
| Feature | Definido | **Dashboard personalizable — canvas de mosaicos** — ver especificación completa abajo |
| Feature | Definido | **Sistema de roles granulares** — roles custom (viewer, editor, premium), checkboxes de features por rol, modelo free/paid para SaaS. Requiere rediseño DB: tablas `roles` y `role_permissions`, refactor `user_profiles` |
| Feature | Idea | **Mensajes configurables del sistema** — para cuentas bloqueadas y usuarios pending. Tabla `system_config` (key-value) |
| Mejora | Idea | **Revisar Impuesto 5ta Categoría** — implementado pero requiere validación de flujo y UX |

---

### Especificación: Dashboard personalizable — canvas de mosaicos

**Objetivo:** Convertir el Dashboard en un canvas libre donde el usuario elige qué tiles mostrar, su tamaño y posición, con persistencia en Supabase.

**Librería:** `react-grid-layout` (drag-and-drop + resize + grilla nativa en React).

**Modos:**
- **Vista** (default): canvas estático. Botón "Personalizar" en esquina superior derecha.
- **Edición**: borde punteado en tiles, handles de drag y resize, barra superior con "Agregar mosaico" (panel lateral) + "Guardar" / "Cancelar".

**Inventario de tiles disponibles:**

| ID | Nombre | Tamaño mínimo |
|----|--------|--------------|
| `kpi-patrimonio` | Patrimonio neto | 1×1 |
| `kpi-flujo` | Flujo neto / mes | 1×1 |
| `kpi-ahorro` | Tasa de ahorro | 1×1 |
| `kpi-emergencia` | Fondo emergencia | 1×1 |
| `kpi-retiro` | Proyección retiro | 1×1 |
| `kpi-tc` | TC Rextie live | 1×1 |
| `kpi-salud` | Salud financiera | 1×1 |
| `kpi-vencimiento` | Próximo vencimiento | 1×1 |
| `kpi-historial` | Alerta historial | 1×1 |
| `chart-evolucion` | Evolución patrimonio | 2×2 |
| `chart-proyeccion` | Proyección escenario | 2×2 |
| `chart-composicion` | Composición patrimonial | 2×2 |
| `list-suscripciones` | Suscripciones activas | 1×2 |
| `list-cuentas` | Cuentas principales | 1×2 |
| `list-rendimientos` | Rendimientos YTD | 1×2 |

**Canvas:** Grilla 12 columnas, filas de ~120px. Compactación vertical automática. Sin superposición.

**Layout por defecto:** Replica exactamente el dashboard actual (5 KPIs fila 1, 3 charts fila 2, 3 listas fila 3, 4 chips de estado fila 4).

**Persistencia:** Columna `dashboard_layout jsonb` en `user_preferences` (migración `014_dashboard_layout.sql`). Fallback: `localStorage`. Estructura: `{ tiles: [{ id, x, y, w, h }], version: 1 }`.

**Archivos a crear/modificar:**
- `src/modules/Dashboard/Dashboard.tsx` — refactor: extraer tiles como componentes independientes
- `src/modules/Dashboard/DashboardCanvas.tsx` — lógica canvas + modos vista/edición
- `src/modules/Dashboard/TileCatalog.ts` — definición de tiles disponibles con tamaños
- `src/modules/Dashboard/tiles/*.tsx` — ~15 componentes de tile individuales
- `src/modules/Dashboard/useDashboardLayout.ts` — hook carga/guardado Supabase + localStorage
- `supabase/migrations/014_dashboard_layout.sql` — ALTER TABLE user_preferences ADD COLUMN
- `src/lib/supabase/finance.ts` — agregar `getDashboardLayout` / `saveDashboardLayout`

**Fuera de scope:** Tiles de módulos nuevos, layouts múltiples, export/import de layouts.

---

---

## 🔵 Próximo release — MyFinance v2: Gestión Patrimonial Profesional

> Propuestas surgidas del análisis comparativo vs. sistemas de wealth management (sep 2026).
> No implementar hasta que el release actual esté en PROD. Trabajar como un release cohesivo.

| Prioridad | Tipo | Estado | Ítem |
|-----------|------|--------|------|
| 1 | Feature | Idea | **Activar módulo Deudas** — existe código en `src/modules/Debts/Debts.tsx`. Activar en nav, completar CRUD. El KPI de Patrimonio Neto en Dashboard debe mostrar: Activos Totales / Pasivos Totales / **Patrimonio Neto real**. Hoy el número está inflado si hay deudas. |
| 2 | Feature | Idea | **Asset Allocation view en Analytics** — breakdown del patrimonio por: (a) tipo de activo usando las categorías ya existentes en Patrimonio, (b) moneda USD vs. PEN, (c) liquidez (nuevo campo en cuentas: inmediata / corto_plazo / mediano_plazo / ilíquido). Los datos ya existen — solo falta la vista. |
| 3 | Feature | Idea | **Módulo Metas (Goals)** — metas financieras intermedias con tracking: nombre, monto objetivo (PEN/USD), fecha objetivo, cuenta de Patrimonio vinculada (opcional), progreso automático %. Ejemplos: fondo emergencia, enganche casa, viaje. Alto impacto de motivación. |
| 4 | Mejora | Idea | **Campo liquidez en Patrimonio** — enum por cuenta: `inmediata / corto_plazo / mediano_plazo / ilíquido`. KPI nuevo en Dashboard: "Disponible ahora: $X / Bloqueado: $Y". Migración `017_cuenta_liquidez.sql`. |
| 5 | Mejora | Idea | **Presupuesto en Flujo de Caja** — columna `presupuesto` por ítem. El KPI de ahorro pasa a mostrar real vs. plan. Vista de varianza del mes. |
| 6 | Mejora | Idea | **Benchmarking de rendimientos** — campo `benchmark` opcional por portafolio (VOO, QQQM, S&P500, IPC Lima, manual). Fetch del retorno anual del benchmark vía API (Yahoo Finance). Columna adicional: Tu retorno / Benchmark / Alpha. |
| 7 | Feature | Idea | **Alertas proactivas** — sistema de notificaciones in-app o email: vencimiento de instrumento próximo, historial mensual sin cerrar, desviación flujo vs. presupuesto > umbral, rebalanceo necesario. El cron de GitHub Actions ya existe y se puede reutilizar. |

---

## 🟢 Baja prioridad / Ideas

| Tipo | Estado | Ítem |
|------|--------|------|
| Mejora | Idea | **Umbral configurable de fondo de emergencia** — actualmente hardcodeado en 6 meses (verde) / 3 meses (ámbar) / <3 (rojo). Agregar campo `mesesEmergenciaObjetivo` en Configuración (AppConfig) para que el usuario defina su propio objetivo. El semáforo del KPI en Dashboard se calcularía contra ese valor. |



| Tipo | Estado | Ítem |
|------|--------|------|
| Feature | Idea | **Gráfico distribución patrimonial en Análisis** — donut/pie con % por categoría (Savings, Investment Stock Exchange, etc.) usando datos de Patrimonio en tiempo real. Pendiente de diseño y ubicación dentro del módulo de Análisis |
| Feature | Idea | **Notificaciones por email** — alerta bajo umbral, recordatorio historial mensual |
| Feature | Idea | **Historial automático configurable (multi-usuario)** — toggle en Settings para activar/desactivar creación automática el 1° de cada mes. Implementación: tabla `user_preferences` con campo `historial_auto boolean default false`; script GitHub Actions elimina el secret `SUPABASE_USER_ID` y en su lugar consulta todos los usuarios con `historial_auto = true`, procesándolos en loop. UI: toggle en Settings que escribe en `user_preferences`. Ya existe el cron (`.github/workflows/historial-mensual.yml`) — requiere refactor del script + migración DB + UI. |
| Feature | Idea | **Deudas** — módulo de seguimiento de deudas (existe código en `src/modules/Debts/Debts.tsx`). Oculto del nav por ahora. Retomar cuando sea relevante. |
| Feature | Idea | **Multi-moneda** — EUR, BRL, etc. |
| Feature | Idea | **Compartir escenarios** — link read-only |
| Feature | Idea | **App móvil (Capacitor)** — publicar MyFinance en App Store y Google Play usando Capacitor: envuelve el React existente en un shell nativo sin reescribir la UI. Alternativa más simple: PWA (manifest.json + service worker, 1-2h) si solo se quiere ícono en pantalla de inicio sin pasar por stores. Retomar cuando el uso diario de la app web lo justifique. |
| Técnico | Idea | **Code splitting** — bundle 1.6MB, dynamic imports por módulo |
| Técnico | Idea | **Tests** — cobertura mínima para `calculator.ts` |
| Técnico | Idea | **Auditoría de acciones** — tabla `audit_log` |
| Técnico | Idea | **Loop engineering** — automatización con `/schedule`: historial mensual automático, monitor de deploy, revisión semanal de backlog. Revisar cuando el proyecto esté más maduro |
