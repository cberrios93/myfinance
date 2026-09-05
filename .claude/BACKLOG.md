# MyFinance — Backlog

> Solo contiene lo pendiente. Todo lo construido está en `CHANGELOG.md`.
> Campos: **Prioridad** · **Tipo** (Feature/Mejora/Fix/Técnico) · **Estado** (Idea/Definido/En DEV/Listo DEV/En PROD)
> Al llegar a "En PROD": el ítem sale de aquí y queda registrado en `CHANGELOG.md`.

---

## 🔴 Alta prioridad

| Tipo | Estado | Ítem |
|------|--------|------|

---

## 🟠 UI/UX — Multi-usuario (sep 2026)

> Contexto: MyFinance pasó de ser personal a compartirse con Mili (34, tech-friendly) y mamá (65, no-tech).
> Los ítems implementados en esta sesión están en CHANGELOG [Unreleased]. Aquí van los pendientes y las ideas adicionales del brainstorm.
> Implementados en DEV (sep 2026): Empty states instructivos · Subtextos en formularios · KPIs con frase interpretativa.

### Pendientes de revisión (requieren evaluar impacto en diseño actual)

| Tipo | Estado | Ítem |
|------|--------|------|
| Mejora | Definido | **Bottom nav bar en móvil** — reemplazar la navegación lateral/hamburguesa por una barra fija en la parte inferior con 5 íconos (Home, Dinero, Flujo, Análisis, Más). El ícono activo se resalta en teal. Mockup disponible en sesión de sep 2026. **Revisar antes de implementar:** impacto en el layout actual del sidebar en desktop y en el menú móvil existente. |
| Mejora | Definido | **Vista simple del Dashboard** — toggle "Simple / Completa" en el header del Dashboard. Vista simple muestra solo 3 cards grandes: "Lo que tienes" (Patrimonio total), "Lo que gastas al mes" (Egreso mensual), "Lo que ahorras" (Flujo neto), con lenguaje llano y sin números secundarios. Mockup disponible en sesión de sep 2026. **Revisar antes de implementar:** cómo coexiste con el canvas personalizable de v2.2.0. |

### Ideas del brainstorm (no priorizadas aún)

| Tipo | Estado | Ítem |
|------|--------|------|
| Feature | Idea | **Onboarding guiado para usuarios nuevos** — checklist de primeros pasos al hacer login por primera vez: "Agrega tu primera cuenta", "Configura tu flujo de caja", "Activa el fondo de emergencia". Persiste en `user_preferences` y se marca completado. Crítico para mamá y Mili. |
| Mejora | Idea | **Saludo personalizado por usuario** — "Hola Mili" o "Hola Gladys" en el header del Dashboard. Ya existe el nombre en `user_profiles`. Cambio de 5 min de alto impacto perceptual. |
| Mejora | Idea | **Tooltips en términos financieros** — ícono de ayuda (?) al lado de labels técnicos: "Tasa de ahorro", "Fondo de emergencia", "Rendimiento bruto", "Traspaso". Al hover/tap: definición en 1 línea. Especialmente útil para mamá. |
| Mejora | Idea | **Labels más simples en la navegación** — evaluar renombrar módulos para usuarios no-financieros: "Patrimonio" → "Mis cuentas", "Flujo de Caja" → "Ingresos y gastos", "Rendimientos" → "Mis inversiones". Podría ser configurable por perfil de usuario. |
| Mejora | Idea | **Progressive disclosure en formularios** — ocultar campos avanzados (ej. "Marcar como riesgo", "Notas", "Vencimiento") detrás de un link "Opciones avanzadas ▼". El formulario se ve más simple por defecto para usuarios nuevos. |
| Mejora | Idea | **Confirmaciones de borrado más amigables** — en lugar del borrado inmediato o confirm() del browser, usar un modal con ícono de advertencia, nombre del ítem a borrar y botones "Cancelar / Sí, borrar". Reduce el miedo a cometer errores. |
| Feature | Idea | **Modo de solo lectura (viewer)** — que mamá pueda ver todos sus datos sin poder editar nada accidentalmente. Toggle en Admin o en su perfil. Relacionado con el sistema de roles granulares. |
| Mejora | Idea | **Mensajes de ayuda en módulos vacíos complejos** — en Rendimientos y Simulación, agregar un panel de "¿Cómo funciona esto?" cuando no hay datos, con 3 bullets explicando el módulo antes del CTA. Actualmente el Empty State solo dice "agrega", no explica para qué sirve. |
| Feature | Idea | **PWA / app instalable en celular** — `manifest.json` + service worker para que Mili y mamá puedan instalar MyFinance como ícono en su pantalla de inicio (sin pasar por App Store). Estimado: 1-2h. Alternativa a Capacitor del backlog general. |

---

## 🟡 Media prioridad

| Tipo | Estado | Ítem |
|------|--------|------|
| Feature | Idea | **Asistente IA (chatbot + voz)** — chatbot flotante dentro de MyFinance con acceso al contexto financiero del usuario (patrimonio, flujo, rendimientos, simulación). Voz vía Web Speech API (nativa, $0). Backend: `api/chat.ts` Vercel edge function con streaming + prompt caching. Modelo recomendado: Haiku 4.5 con cache. Costo estimado: < $2/mes para 11 usuarios. |
| Feature | Definido | **Sistema de roles granulares** — roles custom (viewer, editor, premium), checkboxes de features por rol, modelo free/paid para SaaS. Requiere rediseño DB: tablas `roles` y `role_permissions`, refactor `user_profiles` |
| Feature | Idea | **Mensajes configurables del sistema** — para cuentas bloqueadas y usuarios pending. Tabla `system_config` (key-value) |
| Mejora | Idea | **Revisar Impuesto 5ta Categoría** — implementado pero requiere validación de flujo y UX |

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
