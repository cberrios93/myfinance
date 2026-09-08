# MyFinance — Backlog

> Solo contiene lo pendiente. Todo lo construido está en `CHANGELOG.md`.
> Campos: **Prioridad** · **Tipo** (Feature/Mejora/Fix/Técnico) · **Estado** (Idea/Definido/En DEV/Listo DEV/En PROD)
> Al llegar a "En PROD": el ítem sale de aquí y queda registrado en `CHANGELOG.md`.

---

## 🔴 Alta prioridad

| Tipo | Estado | Ítem |
|------|--------|------|
| Mejora | En PROD | **Tablas ordenables** — Rendimientos (todas las columnas), Historial Mensual (fecha, montos, deltas), Patrimonio (por cuenta/PEN/USD dentro de cada categoría). En PROD v2.8.0 (2026-09-08). |
| Técnico | Definido | **Eliminar secret `SUPABASE_USER_ID` en GitHub Actions** — El script `crear-historial.mjs` ya no lo usa (refactorizado a multi-usuario). Ir a GitHub → repo → Settings → Secrets and variables → Actions y borrarlo. |
| Técnico | Definido | **Verificar config Proyección en PROD** — Confirmar que `mesAjusteSalarial = 4` (Abril) e `incrementoSalarialAnual` / `tasaPatrimonioNoInvertido` están calibrados en Parámetros del escenario activo en PROD. |
| Técnico | Definido | **Verificar migración Eventos de Vida en PROD** — Confirmar que los 26 eventos de vida migrados el 2026-09-05 son visibles y correctos en la app PROD (ruta `/eventos-vida`). |
| Técnico | Definido | **Verificar usuario `me@cesarberrios.com` en PROD** — La migración DEV→PROD del 2026-09-03 borró todos los datos de este usuario (no existía en DEV). Confirmar si necesita ser reinvitado desde Gestión de Usuarios y si tiene data que recrear. |

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

### Próximos wizards de eventos de vida

| Tipo | Estado | Ítem |
|------|--------|------|
| Feature | Definido | **Wizard Luna de Miel** — evento separado del Matrimonio (decisión 2026-08-31). Variables propias: destino, vuelos, hotel (noches + categoría), gastos en destino. Modelo: retiro único con posible gasto previo (reservas). Usar patrón de `MatrimonioWizard.tsx` con toggle PEN/USD. |

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
| Feature | Definido | **PWA / app instalable en celular** — `manifest.json` + `apple-touch-icon` para instalar MyFinance como ícono en pantalla de inicio. Logo revisado (2026-09-07): usar solo el símbolo M+gráfico (sin el texto "MyFinance") sobre fondo navy `#1a2f5e`; fondo blanco del PNG original es problemático en iOS. Se necesita el archivo fuente (AI/SVG/PNG sin fondo) o recortar el símbolo del PNG entregado. Siguiente paso: implementar cuando se confirme el asset final del ícono. |

---

## 🟠 Analytics — Pendientes (sep 2026)

| Tipo | Estado | Ítem |
|------|--------|------|
| Feature | Definido | **Composición de categorías por tiempo** (Analytics opción 1) — Gráfico de barras apiladas mostrando la distribución del patrimonio por categoría (Savings, Investment, etc.) mes a mes. **Bloqueado:** `historial_mensual` solo almacena `total_pen` y `total_usd`; no hay desglose por categoría. Opciones: (a) aceptar snapshot del estado actual como dato único, (b) descartar, (c) agregar campos per-categoría en historial → requiere migración `019_historial_categorias.sql` + refactor del script de creación mensual. **Pendiente decisión de César.** |
| Feature | En PROD | **Deploy Analytics a PROD** — FlujoRealTab y donut de concentración. En PROD v2.8.0 (2026-09-08). |

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
| 8 | Feature | Idea | **FIRE metrics** — FI Number, FI Ratio, Work Optional Age, Coast/Lean/Fat FIRE labels. Calculables del engine existente (Scenarios + calculator.ts). Solo falta exponerlos como KPIs o sección en Scenarios. |
| 9 | Feature | Idea | **Módulo AFP** — aporte mensual, comisión, TIR histórica personal, rentabilidad AFP vs benchmark, proyección hasta 65, simulación de fondo (1/2/3) y simulación Hábitat vs Profuturo, impacto de comisiones. Datos se ingresan manualmente. |
| 10 | Feature | Idea | **Módulo Prestamype / Private Credit** — cronograma de pagos, estado (al día/mora), LTV, yield efectivo considerando premium de subasta, capital pendiente, interés cobrado. Datos manuales. |
| 11 | Mejora | Idea | **FX Management básico** — TC ya integrado (Rextie). Agregar: distribución PEN/USD del patrimonio como KPI, ganancia/pérdida por FX en rendimientos, allocation objetivo por moneda configurable. Sin APIs adicionales. |
| 12 | Feature | Idea | **Decision Journal** — extender Notes como diario de inversiones estructurado: fecha, decisión, tesis, retorno esperado, riesgos, alternativa descartada, horizonte, resultado posterior. Permite revisar si la tesis fue correcta. |
| 13 | Feature | Idea | **Data Quality Engine** — score de calidad de datos: cuentas sin precio actualizado, historial mensual sin cerrar, descuadres base/valor, campos faltantes. Derivable de datos existentes. Evita errores silenciosos. |
| 14 | Feature | Idea | **Monthly Financial Close formal** — cierre mensual estructurado: reporte consolidado (ingresos/gastos/ahorro/rentabilidad/FX/patrimonio), bloqueo del período, snapshot guardado. Formaliza el proceso mensual que ya se hace informalmente. |
| 15 | Feature | Idea | **Financial Health Score** — score 0-100 derivable de liquidez, ahorro, deuda, diversificación, progreso FI. El tile `kpi-salud` ya está definido en el canvas del Dashboard — falta la lógica y la vista de detalle del score. |
| 16 | Feature | Idea | **AI Monthly Insights** — resumen automático mensual (What happened → Why → What to do) via Anthropic API. La infraestructura ya está (API key, proxy Vercel, parseBoleta como precedente). Alto valor, bajo esfuerzo incremental. |

### Funcionalidades evaluadas y descartadas (sep 2026)
> Analizadas en detalle. No agregar al backlog sin cambio de contexto relevante.

| # | Funcionalidad | Razón descarte |
|---|--------------|---------------|
| 8 | Concentración look-through ETFs | Requiere API de composición de fondos (Morningstar/Bloomberg) — costosa, compleja de mantener |
| 9 | Risk Dashboard (Sharpe, beta, VaR) | Requiere series de precios históricos diarios — sin datos de mercado es decorativo |
| 10 | Stress Testing completo | Misma dependencia que #9. Versión simplificada ya disponible en Scenarios |
| 17 | Real Estate module | Prematuro — sin propiedad aún. Retomar cuando sea relevante |
| 22 | Capital Allocation Engine | Riesgo de recomendaciones incorrectas; mejor hacerlo manualmente con datos existentes |
| 23 | Opportunity Analyzer | Score formal Invest/Consider/Reject difícil de calibrar bien |
| 24 | Opportunity Cost Engine | Caso de uso del engine de Scenarios actual, no feature nueva |
| 27 ext. | Tax Layer completo | Régimen tributario peruano sobre inversiones extranjeras: complejo y cambiante. Fuera del scope |
| 34 | AI Copilot conversacional | Proyecto paralelo de alto esfuerzo. V3.0 eventual |
| 37 | Monte Carlo | Ya decidido: backlog avanzado |
| 38 | Investment Policy Statement | Documento de configuración — mejor en Notion/doc externo |

---

## 🟢 Baja prioridad / Ideas

| Tipo | Estado | Ítem |
|------|--------|------|
| Mejora | Idea | **Umbral configurable de fondo de emergencia** — actualmente hardcodeado en 6 meses (verde) / 3 meses (ámbar) / <3 (rojo). Agregar campo `mesesEmergenciaObjetivo` en Configuración (AppConfig) para que el usuario defina su propio objetivo. El semáforo del KPI en Dashboard se calcularía contra ese valor. |



| Tipo | Estado | Ítem |
|------|--------|------|
| Feature | Idea | **Gráfico distribución patrimonial en Análisis** — donut/pie con % por categoría (Savings, Investment Stock Exchange, etc.) usando datos de Patrimonio en tiempo real. Pendiente de diseño y ubicación dentro del módulo de Análisis |
| Feature | Idea | **Notificaciones por email** — alerta bajo umbral, recordatorio historial mensual |
| Feature | Idea | **Deudas** — módulo de seguimiento de deudas (existe código en `src/modules/Debts/Debts.tsx`). Oculto del nav por ahora. Retomar cuando sea relevante. |
| Feature | Idea | **Multi-moneda** — EUR, BRL, etc. |
| Feature | Idea | **Compartir escenarios** — link read-only |
| Feature | Idea | **App móvil (Capacitor)** — publicar MyFinance en App Store y Google Play usando Capacitor: envuelve el React existente en un shell nativo sin reescribir la UI. Alternativa más simple: PWA (manifest.json + service worker, 1-2h) si solo se quiere ícono en pantalla de inicio sin pasar por stores. Retomar cuando el uso diario de la app web lo justifique. |
| Técnico | Idea | **Code splitting** — bundle 1.6MB, dynamic imports por módulo |
| Técnico | Idea | **Tests** — cobertura mínima para `calculator.ts` |
| Técnico | Idea | **Auditoría de acciones** — tabla `audit_log` |
| Técnico | Idea | **Loop engineering** — automatización con `/schedule`: historial mensual automático, monitor de deploy, revisión semanal de backlog. Revisar cuando el proyecto esté más maduro |
| Técnico | Idea | **Skill `/myfinance-release`** — skill de Claude Code que lee `[Unreleased]` del CHANGELOG, propone número de versión siguiente, genera email de release notes listo para enviar y convierte la sección a versión numerada con fecha |
