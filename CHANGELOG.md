# CHANGELOG — MyFinance

Registro oficial de versiones de MyFinance. Cada versión publicada en producción queda documentada aquí.

Criterios de tipo:
- **Feature** — funcionalidad nueva visible al usuario
- **Mejora** — mejora sobre algo ya existente
- **Fix** — corrección de error
- **Técnico** — cambio interno, no visible al usuario

---

## [v2.9.0] — 2026-09-08 — PROD

#### Evaluar con IA en Instrumentos
- **Feature** — Botón "Evaluar con IA" (ícono Sparkles) en el header de Simulación > Instrumentos. Abre un modal donde describes el instrumento candidato (nombre, monto en USD o PEN, rendimiento esperado, plazo, detalles libres). Genera un prompt estructurado con el contexto completo: patrimonio desglosado por categoría con % de concentración, últimos 3 meses de historial, portafolio actual del escenario activo (instrumentos, tasas, % de cada uno), flujo de caja mensual, y parámetros del escenario (edad de retiro, aporte anual, SWR). El prompt cierra con 5 preguntas específicas de evaluación. Botón "Copiar prompt" → pegar en Claude para análisis.

#### Fix eje Y en charts del Dashboard
- **Fix** — `ChartEvolucion` y `ChartProyeccion`: labels del eje Y se recortaban por `width={36}` insuficiente. Nuevo helper `fmtAxisY` en `shared.ts` con formato compacto sin prefijo de moneda (`3.2M`, `800k`) + `width` aumentado a 48px. El tooltip sigue usando `formatAbrev` completo.

#### Tooltips en términos financieros
- **Feature** — Componente `<FinancialTerm>`: subrayado punteado teal sobre cualquier término técnico; popup al hover (desktop) o tap (móvil) con nombre completo en teal y definición en 1 línea. Diccionario de 25 términos en `src/lib/financialTerms.ts`. Extensible: agregar término al diccionario + envolver con `<FinancialTerm term="clave">`.
- **Mejora** — Aplicado en 7 módulos: Dashboard (Patrimonio neto, Flujo neto, Tasa de ahorro, Fondo emergencia), Analytics (Racha actual, Aceleración patrimonial, CAGR), Proyección (SWR), Rendimientos (Retorno s/ capital propio), Haberes (Gratificación, AFP, EsSalud, Impuesto 5ta Categoría), Simulador de préstamos (TEA).

---

## [v2.8.0] — 2026-09-08 — PROD

#### Rendimientos — Rediseño completo del módulo (implementado 2026-09-07)
- **Mejora** — Instrumento se selecciona desde dropdown poblado con los instrumentos del escenario activo (ya no se escribe manualmente). El dropdown muestra nombre, moneda y tipo de renta de cada instrumento.
- **Mejora** — Período como fecha de pago (date picker nativo al día actual) + desglose mes/año derivados automáticamente de la fecha elegida. El campo `mes` (1–12) se persiste en la tabla `rendimientos` vía migración `012_rendimientos_mes.sql`.
- **Mejora** — Monto base (PEN o USD) se pre-llena desde el balance actual de la cuenta de Patrimonio vinculada al instrumento y es de solo lectura. La moneda es única por instrumento (sin bi-moneda).
- **Mejora** — Ganancia ↔ Rentabilidad bidireccionales: modificar el campo de ganancia actualiza la rentabilidad automáticamente (ganancia / monto base) y viceversa. El cambio es instantáneo mientras el usuario escribe.
- **Mejora** — Panel de información del formulario expandido a 5 columnas: Monto inicial · Balance actual · Ganancia acumulada (S/) · Rentabilidad acumulada (%) · Tipo de renta. Los acumulados se calculan desde el historial completo del instrumento.
- **Mejora** — Campo "Comentario" renombrado a "Notas".
- **Feature** — `tipoRenta` en `Instrumento`: define el comportamiento de reinversión a nivel de instrumento (se configura desde el módulo Instrumentos, no desde Rendimientos). Valores: `pago` (ganancia se cobra, capital queda igual), `capitalizacion` (ganancia se reinvierte, capital crece), `variable` (se registra el valor actual y el sistema calcula el delta automáticamente).
- **Feature** — Flujo post-save para instrumentos tipo `capitalizacion` y `variable`: tras guardar un rendimiento, aparece un banner que propone actualizar el saldo de la cuenta de Patrimonio vinculada al nuevo monto (base + ganancia). El usuario puede confirmar o descartar.
- **Técnico** — `InstrInfo = { moneda, montoInicial, montoActual, tipoRenta, cuentaId }` construido desde todos los instrumentos del escenario activo. `tipoRenta` se almacena en JSONB dentro de `escenarios` — no requiere migración SQL adicional.
- **Técnico** — Migración `012_rendimientos_mes.sql`: agrega columna `mes integer check (mes >= 1 and mes <= 12)` a la tabla `rendimientos`. ✓ DEV + PROD.

#### Instrumentos — Acumulados históricos en la lista (implementado 2026-09-07)
- **Mejora** — Cada tarjeta de instrumento en la lista muestra ahora **Ganancia acumulada (S/)** y **Rentabilidad acumulada (%)** calculadas desde el historial completo de Rendimientos. La ganancia acumulada convierte rendimientos USD a PEN usando el TC del momento. La rentabilidad se calcula sobre el monto efectivo actual del instrumento.
- **Mejora** — Badge visual por tipo de renta (`pago` / `capitalización` / `variable`) con color diferenciado en la tarjeta del instrumento.
- **Mejora** — Selector `tipoRenta` en el formulario de instrumento con texto descriptivo por tipo. Valor por defecto: `pago`.

#### Patrimonio — Persistencia del estado colapsado (implementado 2026-09-07)
- **Mejora** — El estado de collapse/expand de las categorías en Patrimonio persiste en `localStorage` bajo la clave `patrimony_collapsed_<userId>`. Al navegar a otro módulo y volver, las categorías quedan exactamente como el usuario las dejó. Scoped por usuario para evitar conflictos en uso multi-usuario.

#### Sistema de Undo global (implementado 2026-09-07)
- **Feature** — Sistema de deshacer acción en toda la app. Toast centrado en la parte inferior con barra de countdown configurable (default 8s, ajustable 5–30s). Cubre **crear, editar y eliminar** en todos los módulos: Patrimonio (cuentas + historial), Escenarios, Rendimientos, Flujo de Caja, Flujos de Capital, Haberes, Suscripciones, Gastos Familia, Deudas, Notas.
- **Mejora** — Configuración → slider "Tiempo para deshacer" (5s–30s). Persiste en localStorage via `AppConfig.undoTimeoutMs`.
- **Técnico** — Archivos nuevos: `src/contexts/UndoContext.tsx` (UndoProvider + `useUndo()` hook), `src/components/UndoToast.tsx`. `makeCRUD` en `FinanceDataContext` refactorizado con `useRef` para snapshot sin stale closures. Suscripciones y GastosFamilia capturan también el snapshot del FlujoCajaItem vinculado antes del borrado para restaurarlo en el undo.

#### Wizard de Matrimonio (implementado 2026-08-31)
- **Feature** — `MatrimonioWizard.tsx`: wizard de 3 pasos para presupuestar una boda. Paso 1: año + nº de invitados con detección automática de escala (íntima ≤30 / estándar 31–80 / grande 81–150 / gran boda 151+) y botones de escala rápida. Paso 2: 5 categorías agrupadas (venue+catering, foto+video, ceremonia+deco+música, vestimenta+logística+papelería, buffer); cada categoría tiene **% editable bidireccional** (edito % → monto se ajusta sobre subtotal, edito monto → % se recalcula); **toggle PEN/USD global** con TC Rextie en tiempo real (compra) — los inputs de monto se editan en la moneda elegida y se almacenan internamente en PEN; **total editable** (onBlur/Enter) que redistribuye las 4 categorías proporcionalmente manteniendo sus ratios; badge "ajustado" en categorías redistribuidas y botón "↺ Restablecer estimados". Paso 3: financiamiento — ahorro actual, aportes externos, período de adelantos (meses), % adelantado; calcula ahorro mensual requerido; genera 2 entradas en el escenario: `gastoRecurrente` (adelantos/mes en N meses previos) + `retiroUnico` (pago final el año de la boda). Reemplaza el campo genérico `costoCelebracion` que existía antes. Sin cambios en DB ni en `types.ts`.
- **Decisión de producto** — Luna de Miel se modela como evento separado (tipo "viaje") con su propio wizard futuro. No está incluida en el wizard de Matrimonio.

#### Historial mensual automático — multi-usuario con toggle en Settings (implementado 2026-08-26)
- **Feature** — Toggle "Historial mensual automático" en Configuración → sección Automatización. Persiste en `user_profiles.historial_auto` (Supabase, no localStorage). Al activarlo, el cron de GitHub Actions incluirá al usuario en la ejecución del 1° de cada mes.
- **Técnico** — `src/lib/supabase/preferences.ts`: funciones `obtenerHistorialAuto()` / `setHistorialAuto()` para leer/escribir la preferencia.
- **Técnico** — `scripts/crear-historial.mjs` refactorizado: ya no usa el secret `SUPABASE_USER_ID` hardcodeado — consulta todos los usuarios con `historial_auto = true` y procesa cada uno en loop (multi-usuario).
- **Técnico** — `.github/workflows/historial-mensual.yml`: eliminado el env `SUPABASE_USER_ID`. El secret en GitHub Actions puede borrarse.
- **Técnico** — Migración `008_user_preferences.sql`: agrega columna `historial_auto boolean default false` a `user_profiles` + policy de UPDATE para que el usuario actualice su propio perfil. ✓ DEV + PROD.

#### Posgrado Wizard — reescritura completa con variables opcionales (implementado 2026-09-07)
- **Mejora** — `PosgradoWizard.tsx` reescrito como wizard de 4 pasos: (1) El programa, (2) Financiamiento, (3) Gastos, (4) Resumen.
- **Fix de diseño** — Input principal pasa de "cuota mensual" a **costo total del programa** (el precio que da la institución). El usuario elige después cómo financiarlo.
- **Feature** — 3 estrategias de financiamiento: Cuotas propias (distribuye costoNeto / duracionMeses), Préstamo (amortización francesa con TEA, plazo, cuota inicial %; avisa si el crédito excede la duración del programa), Pago adelantado (retiro único al inicio).
- **Feature** — Soporte local / extranjero: local muestra gastos adicionales mensuales; extranjero muestra alojamiento, vida, vuelos (N × costo/año mensualizado), seguro + visa/año mensualizado — todo en USD con TC Rextie live.
- **Feature** — Beca (toggle paso 1): slider 0–100% de cobertura → reduce costoNeto antes de calcular cualquier estrategia.
- **Feature** — Ingreso TA/RA (toggle paso 1): monto mensual PEN o USD → se descuenta de la cuota mensual neta.
- **Feature** — Sección colapsable "Costos únicos opcionales" en paso 3, todos desactivados por defecto: Proceso de admisión (GMAT/GRE) → `retiroUnico` al inicio; Inscripción / matrícula → `retiroUnico` al inicio; Cursos de idioma → `gastoRecurrente` N meses antes; Mudanza / establecimiento (solo extranjero) → `retiroUnico` al inicio; Tesis / proyecto final → `retiroUnico` al término.
- **Técnico** — Genera hasta 8 entradas en `eventosVida[]` según opciones activas. Preview paso 4 muestra todas con año, edad, tipo y monto. Compila limpio (`npx tsc --noEmit`).

#### Dashboard — Redesign visual y nuevas funcionalidades (implementado 2026-09-07)
- **Mejora** — Suscripciones activas muestran hasta 9 ítems en grilla 3×3 compacta. Cada celda: badge inicial (borde amarillo si vencimiento próximo), nombre truncado, periodicidad y monto.
- **Feature** — Barra de estado inferior con 4 chips compactos: (1) TC Rextie compra/venta en tiempo real, (2) próximo vencimiento de suscripción con días restantes, (3) alerta de historial mensual pendiente (basado en `PERIODO_THRESHOLD=10`), (4) score de salud financiera 0–100 compuesto: fondo emergencia 30pts + tasa ahorro 30pts + crecimiento MoM patrimonial 20pts + suscripciones sin vencidas 20pts.
- **Mejora** — Zoom 1.1 como baseline del layout (`zoom: 1.1` en el container raíz + `height: calc(100%/1.1)` para compensar desbordamiento). La vista al 100% del navegador equivale a la anterior vista al 110%.
- **Técnico** — `CAT_COLORES` en Dashboard sincronizado a `CAT_COLORS` de `Patrimony.tsx` (fuente canónica): Savings=#3B82F6, Stock=#8B5CF6, Fintech=#F59E0B, Business=#10B981, Asset=#6B7280, Liability=#EF4444.
- **Feature** — Cuentas destacadas: el mosaico "Cuentas principales" muestra las hasta 5 cuentas pinneadas desde Patrimonio. Sin cuentas pinneadas, muestra top-5 por valor. Título dinámico: "Cuentas destacadas" / "Cuentas principales".
- **Feature** — Pin de cuentas en Patrimonio: botón Pin por cuenta (amarillo cuando activo), límite de 5 con alerta inline (banner amarillo auto-dismiss 3s vía `useRef`). Persistido en `cuentas.pinned` en Supabase.
- **Mejora** — `ComposicionBar`: barra horizontal estilo almacenamiento macOS con leyenda 2 columnas y tooltip hover por segmento. Reemplaza el donut+leyenda anterior que se recortaba.
- **Mejora** — Evolución del Patrimonio: `LineChart` con 3 líneas (total=azul sólido, PEN=amarillo punteado, USD=verde punteado). Reemplaza `AreaChart` de una sola serie.
- **Técnico** — `CuentaPatrimonio.pinned: boolean` en `types.ts`. Migración `011_cuenta_pinned.sql` ✓ DEV + PROD. Función `togglePinnedCuenta()` en `src/lib/supabase/patrimony.ts`. Acción `togglePinCuenta()` en `PatrimonyContext`.

#### Analytics — FlujoRealTab + Donut de concentración (implementado 2026-09-07)
- **Feature** — Nueva pestaña **Flujo real** en el módulo Análisis. Gráfico de barras que compara el flujo neto mensual declarado en Flujo de Caja (línea de referencia) contra el delta mensual real del patrimonio total (barra verde/roja). Permite detectar meses donde el gasto real diverge del presupuesto. Filtrado por el mismo rango de fechas del dual range slider.
- **Feature** — Donut de concentración en pestaña **Rendimientos** de Análisis: `PieChart` con `innerRadius={55}` que muestra la distribución de ganancias netas por instrumento. Visible solo cuando el filtro es "todos los instrumentos" y hay al menos un instrumento con ganancia positiva. Traspasos excluidos del cálculo.
- **Técnico** — Tab type del módulo Análisis actualizado a `'patrimonio' | 'flujo-real' | 'rendimientos'`. Imports de `PieChart`, `Pie`, `Cell` añadidos desde Recharts.

#### Tablas ordenables — Rendimientos, Historial, Patrimonio (implementado 2026-09-07)
- **Mejora** — Rendimientos: todas las columnas de la tabla son ordenables (click en header). Columnas: Instrumento, Período, Fecha pago, Ganancia, Base, Rentabilidad. Cicla: ascendente ↑ → descendente ↓ → sin orden (cronológico). Indicador ⇅ en columnas inactivas. `SortTh` helper component, `sortedFiltered` via `useMemo`.
- **Mejora** — Historial Mensual: columnas ordenables: Fecha, PEN, Δ% PEN, USD, Δ% USD, Total S/, Δ% Total, Δ Monto, TC. Los deltas se precomputan siempre en orden cronológico (`rowData` useMemo), luego `displayData` reordena el resultado — así el "mejor mes" por crecimiento es correcto aunque la tabla esté ordenada de otra forma.
- **Mejora** — Patrimonio: sub-header clicable para ordenar cuentas dentro de cada categoría por Cuenta (nombre), PEN o USD. El agrupamiento por categoría se mantiene; el sort opera dentro de cada grupo con `sortedItems()`.
- **Nota técnica** — v2.4.0 documentó este feature como PROD (2026-09-05) pero el código no tenía la implementación. Esta sesión (2026-09-07) es la implementación real.

---

## [v2.7.0] — 2026-09-07 — PROD

### Brand System & UI
- **Mejora** — Sistema de marca completo: logo SVG (escalera ascendente teal sobre cuadrado navy) en sidebar y login; wordmark "my**Finance**" (DM Sans 200i + 700); tokens CSS `--color-*` y `--chart-*` alineados a paleta oficial (teal `#00C9A7`); tipografía DM Sans + DM Mono vía Google Fonts; reemplazo global de colores hardcodeados en `.tsx` por tokens de marca.
- **Mejora** — Modo Day/Night en Configuración: Day con fondo claro (`#F2F6FA`, cards blancas, texto navy) y Night con fondo oscuro (`#060E1B`); eliminadas las 6 paletas anteriores y el picker de acento custom. El teal `#00C9A7` es fijo en ambos modos.
- **Mejora** — Tipografía de marca fija (DM Sans): eliminado selector de fuentes en Configuración.
- **Fix** — Colores únicos por serie en charts del Dashboard: `Investment (Business)` → `#5B8CF7` (azul), `ETFs / Bolsa` → `#C47FD5` (violeta), línea "USD en S/" en Evolución del patrimonio → `#5B8CF7`. Antes `Savings` y `Business` compartían teal.

### Responsive
- **Mejora** — Responsive móvil completo: Dashboard con grids adaptativos (5→2 col KPIs, 3→1 col contenido); tablas con scroll horizontal en Patrimonio, Debts, CashFlow, Tax5th, Analytics; hook `useIsMobile` para breakpoints dinámicos; charts con altura explícita en mobile.
- **Fix** — `AuthContext`: eliminada race condition entre `getSession()` y `onAuthStateChange`. Ahora `onAuthStateChange` es la única fuente de verdad (dispara `INITIAL_SESSION` al montar). El `setLoading(false)` se hace en `finally` de `fetchRole`, y en el branch `else` se limpian `userStatus` y `blockReason` al cerrar sesión.
- **Fix** — `FinanceDataContext` y `PatrimonyContext`: dependency arrays `[user]` → `[user?.id]` para evitar re-renders innecesarios cuando el objeto `user` se recrea sin cambiar de identidad.

---

## [v2.6.0] — 2026-09-05 — PROD

### Analytics — Prompt IA: mejoras de Patrimonio + nuevo enfoque Eventos de vida

#### Patrimonio — Mejoras visuales y UX
- **Mejora** — Rango de análisis: control compacto en una sola fila (label "Rango", fechas inicio→fin en monospace, botón Reset condicional) encima del dual range slider. Eliminada la vista duplicada de chips dentro del slider.
- **Mejora** — KPIs en fila única `grid-cols-4`: Racha, Aceleración patrimonial, Variación del período, CAGR. Antes en grid 2×2.
- **Feature** — KPI **Racha**: número de meses consecutivos al alza o a la baja al final del rango seleccionado.
- **Feature** — KPI **Aceleración patrimonial**: delta entre el crecimiento de los últimos 12 meses vs. los 12 anteriores (acelerando / desacelerando).
- **Mejora** — Variación del período: subtítulo con Inicio S/X · Fin S/X (+Y%) para entender de dónde a dónde.
- **Mejora** — Barras MoM coloreadas: verde si el cambio es positivo, rojo si negativo (usando `<Cell>` por barra). Tooltip con texto blanco explícito.
- **Mejora** — Heatmap anual: columna de año muestra % de crecimiento anual en lugar de monto. Todas las celdas muestran su valor (sin filtro de umbral); texto siempre blanco.
- **Fix** — Eliminada línea de inflación del gráfico de evolución (campo `inflacionAnual` se mantiene en Configuración para uso futuro).
- **Fix** — Pantalla negra en Home al pasar el mouse: `ComposicionBar` (función module-level) accedía a `config` del closure de `Dashboard` → `ReferenceError` → desmontaje silencioso del árbol React. Solucionado con `useConfig()` dentro de `ComposicionBar`.

#### Prompt para IA — nuevo enfoque Eventos de vida
- **Feature** — 5to enfoque **✦ Eventos de vida** en el modal del Prompt, como card de ancho completo. Lee los eventos directamente del escenario activo (`escenario.eventosVida[]`) — no requiere re-ingresarlos. Convierte años relativos (`anioT`, `anioInicioT`) a años absolutos con `escenario.general.anioActual`.
- **Feature** — Para cada evento el prompt incluye: año absoluto, años desde hoy, tipo, monto total, proporción propia si es compartido, y para gastos recurrentes el total acumulado proyectado.
- **Feature** — Todos los enfoques incluyen ahora una sección **PARÁMETROS DE SIMULACIÓN** con: horizonte temporal (edad actual, retiro, expectativa de vida, años restantes), SWR, incremento salarial, tasa de crecimiento patrimonio no invertido, aporte anual base, crecimiento real de carrera y saltos de carrera proyectados con año absoluto.
- **Feature** — Si hay eventos definidos y se usa cualquier otro enfoque (general, optimización, proyección, riesgo), los eventos aparecen como `## EVENTOS DE VIDA (contexto adicional)` automáticamente al final del prompt.
- **Fix** — Porcentajes de simulación (SWR, tasas de crecimiento) almacenados como decimales (0.0375) ahora se muestran correctamente multiplicados × 100 (3.75%) en el prompt.

#### Nav y Settings
- **Mejora** — Renombrado "Dashboard" → "Home" en el menú lateral.
- **Mejora** — Eliminados "Ideas & Notas" y "Deudas" del nav de Tracking (Deudas pasa al backlog como baja prioridad — el código existe en `src/modules/Debts/`).

---

## [v2.5.0] — 2026-09-05 — PROD

### Eventos de vida — Carga de pareja

- **Feature** — Toggle "Yo / Pareja" en la vista Gráfica de Eventos de vida. Visible solo cuando hay al menos un evento compartido (< 100%). En modo "Pareja": barras y los 3 KPIs (año pico, carga mensual, total egresos únicos) muestran los montos que corresponden a la pareja, calculados como `monto_usuario × (100−pct) / pct`.
- **Técnico** — Campo `proporcionPropia?: number` en `EventoVida` (JSONB, sin migración SQL). `HijoWizard`, `MatrimonioWizard` y `LoanSimulator` lo persisten en eventos con distribución < 100%. Para eventos anteriores al cambio, `parseProporcion()` extrae el % del nombre del evento como fallback (`(60%)` → 60).

---

## [v2.4.0] — 2026-09-05 — PROD

### Tablas ordenables + Evento Nacimiento de hijo con etapas y distribución

#### Tablas ordenables — Rendimientos, Historial, Patrimonio
- **Mejora** — Rendimientos: todas las columnas de la tabla son ahora ordenables (click en header). Columnas: Instrumento, Período, Fecha pago, Ganancia, Base, Rentabilidad. Cicla entre ascendente ↑ / descendente ↓ / sin orden (cronológico por defecto). Indicador ⇅ en columnas inactivas.
- **Mejora** — Historial Mensual: columnas ordenables: Fecha, PEN, Δ% PEN, USD, Δ% USD, Total S/, Δ% Total, Δ Monto, TC. Los deltas se calculan siempre sobre el orden cronológico (invariante al orden de display), así el "mejor mes" por crecimiento % es correcto independientemente de cómo esté ordenada la tabla.
- **Mejora** — Patrimonio: sub-header clicable para ordenar cuentas dentro de cada categoría por Cuenta (nombre), PEN o USD. El agrupamiento por categoría se mantiene; el sort opera dentro de cada grupo.

#### Evento Nacimiento de hijo — Wizard completo por etapas + distribución
- **Mejora** — El wizard "Nacimiento de hijo" fue reemplazado por un wizard dedicado (`HijoWizard`) con 5 etapas configurables: Bebé (0-2), Nido (3-5), Colegio (6-17), Universidad (18-22) y Apoyo post-uni (23+, opcional). Cada etapa tiene costo mensual editable, duración auto-calculada, años calendario y total por etapa.
- **Feature** — Campo "Nombre / identificador" en el wizard de hijo: permite distinguir "Primer hijo", "Segundo hijo" o un nombre propio. Aparece en cada entrada generada.
- **Feature** — Distribución de gastos con pareja en el wizard de hijo: slider 0-100% + input numérico. Los montos guardados en el escenario reflejan solo la proporción del usuario. El resumen final muestra costo bruto (pareja), mi parte y parte de la pareja.
- **Feature** — `GeneralParams` → nuevo campo `proporcionPropia?: number` (0-100). Define la proporción por defecto de gastos compartidos. Se pre-rellena en el wizard de hijo; puede ajustarse por evento.
- **Feature** — Parámetros > nueva sección "Gastos compartidos con pareja": campo para configurar `proporcionPropia` con explicación de su uso.
- **Fix** — `actualizarEscenario` en `ScenarioContext` ahora actualiza el estado local antes del `await guardarEscenario` (optimistic update). Elimina race condition donde el wizard montaba con datos viejos si el usuario navegaba antes de que terminara el save a Supabase.
- **Fix** — `HijoWizard`: `useEffect` + `useRef` que sincroniza `miPorcentaje` si `general.proporcionPropia` llega después del mount, sin pisar cambios manuales del usuario.

---

## [v2.3.0] — 2026-09-05 — PROD

### Proyección financiera + Mejoras de visualización

#### Módulo Proyección (nuevo)
- **Feature** — Nueva sección "Proyección" bajo Simulación. Muestra: (1) 4 KPIs: patrimonio total al retiro (portafolio invertido + no invertido), renta pasiva mensual SWR, supervivencia del fondo post-retiro, años con flujo crítico. (2) Gráfico de patrimonio total apilado: portafolio invertido (azul) + patrimonio no enlazado a instrumentos (verde), detectado automáticamente de Patrimonio. (3) Gráfico de ingreso total vs. eventos: sueldo activo (desde Haberes: promedio sueldoBasico + comisionesAnioActual del ciclo de compensación vigente) + rendimiento portafolio vs. carga de eventos mensual. (4) Panel post-retiro con mini-chart de drawdown del fondo. (5) Tabla año a año colapsable: patrimonio, sueldo/mes, rendimiento/mes, total disponible, eventos/mes, % comprometido, retiros únicos.
- **Feature** — Parámetros > "Proyección de ingresos": mes de ajuste salarial (dropdown 1–12 con nombre de mes), incremento salarial anual %, tasa de crecimiento patrimonio no invertido %.
- **Técnico** — El sueldo base se detecta de los recibos de Haberes desde el último mes de ajuste salarial hasta hoy (máx. 12 meses, excluye meses con gratificación). Si no hay recibos, usa aporteAnualBase como fallback.
- **Técnico** — El patrimonio no invertido se detecta como las cuentas de Patrimonio sin `cuentaPatrimonioId` vinculado a ningún instrumento del escenario activo. Se proyecta a la tasa configurada independientemente del portafolio.

#### Eventos de vida — Vista Gráfica
- **Feature** — Toggle Lista/Gráfica en Eventos de vida. La vista Gráfica muestra: 3 KPI cards (año pico, carga mensual pico, total egresos únicos), gráfico de barras apiladas por tipo de evento con zona de retiros únicos (puntos encima de cada barra, apilados en filas de máx. 3), panel de detalle al hover fijo sobre el gráfico (evita overflow), leyenda por tipo, lista de egresos puntuales al pie.
- **Fix** — Tooltip del gráfico de eventos no se recortaba por el contenedor con overflow-x. Reemplazado por panel de estado fijo arriba del scroll.
- **Fix** — Puntos de retiros únicos se apilaban en una sola fila y se desbordaban. Corregido con flex-wrap + content-end para apilar en filas desde abajo.

#### MatrimonioWizard
- **Fix** — Pantalla en blanco al pasar del paso 2 al 3 cuando se activaba la categoría `weddingPlanner`. Dos causas: (1) `redistribuirDesdeTotal()` no incluía `weddingPlanner` en el setS, (2) referencia a campo inexistente `resultado.montoAdelantos` (correcto: `resultado.montoAdelantosTu`).

#### Responsive y UI — Ajustes finales
- **Fix** — Patrimonio: header responsive en móvil. Los botones (TC widget, "Ocultas", "Agregar cuenta") ya no se salen de pantalla. Usan `flex-wrap` y apilan verticalmente en pantallas pequeñas.
- **Fix** — CuentaForm (Patrimonio): grid pasa de `grid-cols-2 sm:grid-cols-4` a `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. Los campos se apilan en móvil y se distribuyen correctamente a partir de tablet.
- **Fix** — Returns header: mismo patrón responsive que Patrimonio. Filtros y botón "Registrar" se apilan en móvil.
- **Feature** — Rendimientos: gráfica histórica de rentabilidad por año. ComposedChart (Recharts) con barras de monto base (K PEN eq., eje derecho) y línea de rentabilidad neta % (eje izquierdo). Visible cuando hay ≥ 2 años de datos. Incluye insights: promedio histórico, mejor año y peor año.
- **Mejora** — Configuración: layout reescrito con 2 columnas en desktop. Agrupa las opciones en 5 secciones: Apariencia / Datos y moneda / Alertas y tiempos / Automatización / Módulos.
- **Mejora** — Impuesto 5ta ocultado del sidebar. La ruta sigue existiendo; re-activable desde Configuración > Módulos.
- **Mejora** — Simulación > Carrera y Aportes: los saltos de carrera ahora muestran año calendario real (ej. "2028") y edad correspondiente (ej. "34 años") basados en los datos de Parámetros (`anioActual`, `edadActual`). El campo de año es un `<select>` con todos los años hasta retiro — reemplaza el input numérico que causaba re-ordenamiento inmediato al tipear (imposible editar). El valor interno sigue siendo `anioT` relativo.
- **Mejora** — Simulación > Movimientos: mismo patrón — formulario muestra dropdown de año calendario + edad. La lista desplegada muestra año y edad en cada fila en lugar de "Año T".

---

## [v2.2.1] — 2026-09-04 — PROD

### UI/UX — Mejoras de usabilidad (multi-usuario)

- **Mejora** — KPIs del Dashboard con frase interpretativa: cada KPI muestra un punto de color semáforo y una banda de texto explicando qué significa el número (ej. "Gastas más de lo que ingresas este mes"). Aplica a los 5 KPIs: Patrimonio, Flujo, Ahorro, Fondo emergencia, Retiro.
- **Mejora** — Empty states instructivos: Patrimonio, Suscripciones, Gastos Familia y Rendimientos reemplazan el texto gris vacío por un panel con ícono, título, descripción y botón CTA que abre el formulario directamente. Rendimientos distingue entre "sin datos" (panel completo) y "sin resultados de filtro" (texto simple).
- **Mejora** — Subtextos explicativos en formularios: CuentaForm (Monto PEN, Monto USD, Categoría), SusForm (Monto total, Periodicidad, Vencimiento) y GastoForm (Monto PEN, Periodicidad) muestran una línea de ayuda en color teal debajo de cada campo para explicar qué va ahí. Componente compartido `EmptyState` en `src/components/common/`.

---

## [v2.2.0] — 2026-09-04 — PROD

### Dashboard personalizable (canvas de mosaicos)
- **Feature** — El Dashboard ahora se puede reordenar. Botón "Personalizar" (ícono, esquina superior derecha) → modo Edición con arrastrar/redimensionar cada mosaico, "Agregar mosaico" (paleta con los tiles que sacaste), quitar (×), "Restablecer", "Cancelar" / "Guardar". Mientras no personalizas, se ve el dashboard clásico idéntico. Ya personalizado: canvas estático + "Quitar personalización" para volver al clásico. En móvil no hay canvas (dashboard apilado de siempre). El layout persiste por usuario en `user_profiles.dashboard_layout` (migración `018`) con fallback a `localStorage`.
- **Técnico** — `react-grid-layout` 2.2.4 (import `/legacy`; +75 kB al bundle). Grilla de 60 columnas (mcm 5·3·4 → KPIs/charts/listas/chips dividen parejo), rowHeight 36, margin 8. `DASHBOARD_LAYOUT_VERSION = 2`: un layout guardado con otra versión de grilla se descarta y vuelve al default.
- **Técnico** — Refactor de `Dashboard.tsx` (623 líneas) → `useDashboardData` (todo el cómputo) + 15 tiles independientes (`src/modules/Dashboard/tiles/`) + `DashboardView` (layout clásico) + `DashboardCanvas` (canvas) + `TileCatalog` + `DEFAULT_LAYOUT` + `useDashboardLayout`. Verificado en navegador con datos mock: view→edit→drag→resize→quitar→paleta→re-agregar→guardar→reload persiste; "Quitar personalización" limpia; empty-guard; fallback móvil; layout v1 obsoleto se descarta.

### Ícono al agregar a inicio (iOS/Android)
- **Fix** — El ícono de "Agregar a inicio" en iOS mostraba un placeholder (cuadrado negro con "M") porque `index.html` no tenía `apple-touch-icon`. Agregado `apple-touch-icon.png` (180×180), `favicon-96.png`, `icon-192.png`/`icon-512.png` y `manifest.webmanifest`, generados desde el mark real de la marca (cuadrado navy `#0C1A2E` + escalera teal `#00C9A7`, tomado de `.claude/myfinance-logo.html`). De paso se reemplazó `public/favicon.svg`, que no era el logo de MyFinance sino un ícono morado de un template.
- **Técnico** — `theme-color` `#0C1A2E` y `apple-mobile-web-app-title`. Manifest con `display: "browser"` (sin forzar modo standalone) — queda listo para cuando se aborde el ítem de PWA del backlog.

### Migraciones
- `018_dashboard_layout.sql` — `user_profiles.dashboard_layout jsonb` (DEV + PROD).

---

## [v2.0.0] — 2026-09-03 — PROD

### Flujos de Capital (módulo nuevo)
- **Feature** — Nuevo módulo `/flujos-capital` en nav (Tracking). Registro de aportes y retiros reales desde/hacia cuenta bancaria personal. KPIs: total aportes, total retiros, capital propio neto. Nota explicativa sobre qué registrar. Persiste en DB (tabla `flujos_capital`, migración `017`).
- **Feature** — KPI "Retorno s/ capital propio" en Rendimientos: ganancias netas / capital propio neto (aportes − retiros en PEN eq.). Muestra base usada o mensaje "Registra flujos de capital" si no hay datos.

### Rendimientos
- **Feature** — Tasa de impuesto por registro (`tasaImpuesto %`): campo en el formulario de registro/edición. La ganancia mostrada en tabla y todos los KPIs (Ganancias totales, Rentabilidad) son sobre el neto. Si hay impuesto: la celda muestra ganancia neta + bruto tachado + badge `−X%`. Acción bulk "Aplicar X% a todos los registros" disponible cuando se filtra por un instrumento específico (excluye traspasos). Persiste en DB (`tasa_impuesto` en tabla `rendimientos`, migración `016`).

### Patrimonio
- **Feature** — Ocultar cuentas vacías: botón `EyeOff` en filas con saldo 0 para ocultar la cuenta de la vista. Toggle "Ocultas (N)" en el header aparece cuando hay al menos una oculta. Al guardar saldo > 0 en una cuenta oculta, se desoculta automáticamente. Persiste en DB (`is_hidden` en tabla `cuentas`, migración `015_cuenta_hidden.sql`).

### Global
- **Mejora** — Propagación de `monedaPrincipal` y `decimales` a todos los módulos de tracking: nuevo helper `src/lib/formatMonto.ts` (`formatMonto`, `formatAbrev`, `simboloMoneda`). Aplicado en Dashboard, CashFlow, Subscriptions, FamilyExpenses, History, Tax5th, Paycheck, Returns, Career. El símbolo de moneda y los decimales ahora siguen la configuración del usuario en lugar de estar hardcodeados como `S/` con 0 ó 2 decimales fijos.

### Eventos de vida
- **Feature** — Wizard de Matrimonio (`MatrimonioWizard.tsx`): 3 pasos guiados. Paso 1: año de boda + nº de invitados con detección automática de escala (íntima / estándar / grande / gran boda). Paso 2: 5 categorías agrupadas con estimados pre-cargados por escala (venue+catering, foto+video, ceremonia+deco+música, vestimenta+logística, buffer) + total editable bidireccional — editar el total redistribuye categorías proporcionalmente (onBlur/Enter), editar una categoría recalcula el total; badge "ajustado" y botón "↺ Restablecer estimados". Paso 3: financiamiento — ahorro actual, aportes externos, período de adelantos y % adelantado; genera automáticamente 2 entradas: gasto recurrente (adelantos/mes durante N meses previos) + retiro único (pago final el año de la boda). Muestra ahorro mensual requerido para llegar al objetivo.

### Análisis — Pestaña Patrimonio
- **Mejora** — Rango de análisis compactado: card más corto, chips "De → hasta" en línea, sin contador de registros.
- **Mejora** — Toggle Mensual/Anual movido fuera del card de controles, integrado en el header del gráfico de evolución.
- **Mejora** — 4 stat cards condensados a 2: "Variación del período" (diff absoluto + rango + %) y "CAGR" con interpretación verbal (sobre objetivo / sobre inflación / bajo inflación / en retroceso).
- **Feature** — Línea de inflación acumulada sobre el gráfico de evolución (configurable en Configuración → Inflación anual de referencia, default 6%).
- **Mejora** — Toggle de líneas en el gráfico de evolución: botones para mostrar/ocultar Total, PEN, USD→PEN e Inflación independientemente.
- **Mejora** — Tooltip del gráfico muestra Δ vs período anterior para la línea Total.
- **Mejora** — Barras del gráfico MoM/YoY coloreadas en verde (positivo) y rojo (negativo) usando `Cell`.
- **Feature** — KPI "Racha actual": meses consecutivos en positivo o negativo, calculado sobre todos los registros históricos.
- **Feature** — KPI "Aceleración patrimonial": crecimiento de los últimos 12m vs 12m anteriores, muestra el delta de velocidad.
- **Mejora** — Heatmap: columna "Año" con la variación absoluta en S/ (verde/rojo) al final de cada fila.
- **Feature** — Configuración → "Inflación anual de referencia": slider 1–20% (default 6%), persiste en `AppConfig`.

### Nav / Layout
- **Mejora** — "Dashboard" renombrado a "Home" en el menú lateral.
- **Mejora** — Ítems "Deudas" e "Ideas & Notas" ocultados del menú Tracking (código preservado; Deudas en backlog baja prioridad).

### Dashboard
- **Fix** — Pantalla negra al hacer hover sobre la barra de composición: `ComposicionBar` (función a nivel de módulo) referenciaba `config` del scope de `Dashboard`, causando `ReferenceError` y desmonte del árbol React. Corregido llamando `useConfig()` directamente dentro de `ComposicionBar`.
- **Fix** — Eliminado `zoom: 1.1` del div raíz del Dashboard que causaba conflictos con el `ResizeObserver` de Recharts.
- **Mejora** — Rediseño completo del Dashboard sin scroll: layout de 3 filas fijas. Fila 1: 5 KPIs compactos (patrimonio neto con delta MoM + YoY en color, flujo neto, tasa de ahorro con semáforo, fondo de emergencia en meses reales de cobertura, proyección de retiro con "Faltan N años"). Fila 2: evolución del patrimonio (LineChart 3 líneas: total azul / PEN amarillo / USD verde), proyección del escenario activo (líneas de referencia con label "Hoy (Xa)"), barra de composición horizontal tipo Mac storage con hover tooltip. Fila 3: suscripciones, cuentas destacadas (pinned) o top-5 por valor, rendimientos YTD.
- **Feature** — Cuentas destacadas en Dashboard: ícono pin en cada cuenta de Patrimonio (amarillo = fijada), muestra hasta 5 cuentas seleccionadas; fallback a top-5 por valor si ninguna está pinneada. Requiere migración `011_cuenta_pinned.sql`.

### Rendimientos
- **Feature** — `tipoRenta` en instrumentos: "Renta fija — pago periódico" / "Renta fija — capitalización" / "Renta variable". Sin migración (JSONB en escenarios).
- **Mejora** — Rediseño del módulo: instrumento se selecciona desde dropdown (instrumentos registrados en Simulación, deduplicados por nombre); período ahora es mes + año (no solo año); monto base se pre-llena automáticamente desde la cuenta de Patrimonio vinculada al instrumento; rentabilidad se calcula sola; KPI de rentabilidad promedio agregado. Requiere `012_rendimientos_mes.sql`.
- **Feature** — Campo "Aporte del mes" (USD/PEN): permite registrar capital nuevo inyectado mid-mes por separado de la ganancia. El sistema recalcula ganancia y rentabilidad usando `base + aporte` como denominador. La propuesta de actualizar Patrimonio también incluye el aporte. Requiere `013_rendimientos_aporte_mes.sql` ✓ DEV + PROD.
- **Feature** — Tipo de registro "Traspaso": checkbox "Es un traspaso" en el formulario. En modo traspaso: no cuenta como ganancia/pérdida en totales, muestra badge ámbar "Traspaso" en la tabla, y propone actualizar Patrimonio al saldo final indicado. Permite registrar movimientos entre instrumentos con trazabilidad. Requiere `014_rendimientos_traspaso.sql` ✓ DEV + PROD.
- **Fix** — Rentabilidad acumulada en formulario: dividía ganancias PEN entre base USD sin convertir → corregido a `ganAcumPEN / (base * TC)` para instrumentos USD.
- **Fix** — `montoInicial` de instrumento USD se mostraba en PEN (sincronizado automáticamente) → ahora se divide por TC para mostrar el equivalente en la moneda de la cuenta.
- **Fix** — "Monto base" en KPIs: sumaba la base de todos los registros mensuales acumulados → corregido para mostrar solo la base del registro más reciente por instrumento.
- **Fix** — Propuesta de actualizar Patrimonio no incluía el aporte del mes → corregido.
- **Fix** — Cambiar "Aporte del mes" después de haber ingresado "Valor actual" no recalculaba la ganancia → corregido.
- **Feature** — Detección de ciclo cerrado: al seleccionar un instrumento cuyo último registro es un Traspaso, el formulario muestra un banner ámbar con nombre sugerido para el nuevo ciclo (formato `"Nombre · MM/AAAA"`), seleccionable con un click para copiar fácilmente.
- **Mejora** — Instrumentos tipo Capitalización ahora muestran ambos campos: "Valor actual" (opcional, calcula ganancia automáticamente al ingresarlo) y "Ganancia" (editable directo). Permite registrar meses sin saldo total disponible ingresando ganancia directo, o meses con estado de cuenta ingresando el valor actual.
- **Fix** — Mensaje inline de propuesta Patrimonio en Capitalización mostraba `base + ganancia` ignorando el aporte del mes → corregido a `base + aporte + ganancia`.
- **Fix** — Módulo Análisis (tab Rendimientos): registros de tipo Traspaso se incluían en ganancias por instrumento, por año y en totales → corregido con filtro `esTraspaso` en todos los cálculos y en el prompt de IA.

### Historial
- **Mejora** — Panel de revisión de períodos por registro: reemplaza el botón "Corregir todos" por un panel que muestra cada conflicto individualmente con opciones "Aplicar regla" o "Mantener como está". Los registros descartados se guardan en localStorage y no vuelven a alertar para ese conflicto específico.

### Patrimonio
- **Mejora** — Estado colapsado/expandido de categorías persiste en localStorage por usuario (sobrevive navegación entre módulos)
- **Feature** — Subtotales por categoría en el header de cada grupo, colapsable con chevron animado
- **Feature** — Timestamp "última actualización" sutil por cuenta (tiempo relativo: "hace 2h", "ayer", etc.)
- **Feature** — Historial de últimos 5 cambios de montos por cuenta con botón Restaurar (`009_cuenta_log.sql` ✓ DEV + PROD)
- **Feature** — Alerta sutil (puntito naranja) en cuentas no actualizadas según umbral configurable (default 30 días, ajustable en Configuración → "Alerta — Patrimonio desactualizado")

### Gastos Familia
- **Feature** — Sync automático con Flujo de Caja al crear/editar/borrar (igual que Suscripciones): badge "Familia" naranja, ítems no editables directamente desde Flujo de Caja sino redirigen al módulo fuente (`010_gastos_familia_links.sql` ✓ DEV + PROD)

### Flujo de Caja
- **Mejora** — Suscripciones y Gastos Familia en modo lectura: solo muestran ↗ que redirige al módulo fuente, sin Edit/Delete directo
- **Mejora** — Categorías del formulario depuradas: eliminadas "Suscripciones/Membresías" y "Familia" (gestionadas por sus módulos)
- **Fix** — `suscripcionId` y `gastoFamiliaId` ahora persisten correctamente en DB y se reestablecen al recargar vía cross-reference con `flujoCajaItemId`

### Sistema
- **Feature** — Onboarding wizard de 5 pasos para usuarios nuevos (una sola vez por userId vía localStorage), redirige a Patrimonio al finalizar
- **Mejora** — Hover/active global en todos los botones: `brightness(1.18)` en hover, `scale(0.96)` + `brightness(0.88)` en click
- **Fix** — Errores TypeScript que bloqueaban el build de Vercel: `fmtPct` no utilizado eliminado de `Analytics.tsx`; tipos de `formatter` de Recharts corregidos en `Analytics.tsx` y `Dashboard.tsx` (params tipados como `unknown` + cast); función `fmt` añadida a `FamilyExpenses.tsx` y `Paycheck.tsx` donde se usaba sin definir; variable `fechaTraspaso` no utilizada eliminada de `Returns.tsx`.

---

## [v1.3.0] — 2026-08-26 — PROD

### Gestión de usuarios completa

| Tipo | Descripción |
|------|-------------|
| Feature | **Flujo de aceptación de invitación** — usuario nuevo crea contraseña al aceptar el invite (validaciones: 8+ chars, mayúscula, número, carácter especial) |
| Feature | **Bloquear / desbloquear usuarios** — modal con campo de motivo; usuario bloqueado ve pantalla de bloqueo con razón y botón de cierre de sesión |
| Feature | **Eliminar usuario** — modal de confirmación, eliminación en cascada desde base de datos |
| Mejora | **Panel de estadísticas en Gestión de Usuarios** — contadores de activos / pendientes / bloqueados, badges de estado por fila, acciones visibles por usuario |
| Técnico | Migración `007_user_status.sql` — campo de estado y motivo de bloqueo en `user_profiles` |
| Fix | Política RLS recursiva en `user_profiles` corregida (`is_admin()` como `SECURITY DEFINER`) |

---

## [v1.2.0] — 2026-08-26 — PROD

### Eventos de vida mejorados + módulo Analytics

| Tipo | Descripción |
|------|-------------|
| Feature | **Wizards de eventos de vida** — asistentes guiados para Posgrado e Hijo (precarga parámetros típicos) |
| Feature | **Simulador de préstamos** — calcula cuotas, intereses y amortización dentro de Eventos de Vida |
| Feature | **Módulo Analytics** — análisis histórico de patrimonio: CAGR, gráficos de evolución, desglose PEN/USD, rendimientos por instrumento, flujo de caja visual |

---

## [v1.1.0] — 2026-08-26 — PROD

### Exportar / Importar + Configuración + Base de administración

| Tipo | Descripción |
|------|-------------|
| Feature | **Exportar / Importar unificado** — página con tabs, checkboxes por módulo (Instrumentos, Movimientos, Eventos, Carrera, Proyección) |
| Feature | **Configuración extendida** — paleta, tipografía, tamaño de texto, densidad, alto contraste, moneda principal (PEN/USD), decimales (0/1/2), día de corte del historial (slider 1-20), módulos ocultos (toggle por módulo) |
| Feature | **Gestión de Usuarios (base)** — sección Admin solo visible para admins; invitación por email usando Supabase Admin API |
| Feature | **Roles de usuario** — `admin` y `guest`; datos completamente independientes por usuario (RLS en todas las tablas) |
| Técnico | Migración `006_user_profiles.sql` — tabla `user_profiles` con rol y trigger de auto-creación |
| Técnico | Edge Function `api/invite-user.ts` — usa `SUPABASE_SERVICE_ROLE_KEY` para invitar sin limitaciones |

---

## [v1.0.0] — 2026-08-25 — PROD

### Lanzamiento inicial — App completa de finanzas personales

#### Módulos de Seguimiento (datos reales)

| Tipo | Descripción |
|------|-------------|
| Feature | **Patrimonio** — cuentas PEN/USD agrupadas por categoría; tipo de cambio live de Rextie en el header |
| Feature | **Flujo de Caja** — ingresos y gastos mensuales recurrentes; totales consolidados en PEN con TC live |
| Feature | **Rendimientos** — ganancias por instrumento y año; totales en PEN con TC live |
| Feature | **Haberes** — recibos de sueldo con ~50 campos (5 secciones); importación por CSV y OCR de PDF vía Claude AI |
| Feature | **Suscripciones** — servicios con responsables y montos; sincronización automática con Flujo de Caja |
| Feature | **Gastos Familia** — gastos por beneficiario, PEN/USD, mensual/anual |
| Feature | **Deudas** — deudas pendientes con estados (Pendiente / Parcial / Cobrado) |
| Feature | **Notas** — ideas y notas con tags |
| Feature | **Historial** — registro mensual de patrimonio total; importación/exportación CSV; TC auto-llenado desde Rextie al crear registro |
| Feature | **Impuesto 5ta Categoría** — calculadora de renta de 5ta categoría con tramos SUNAT, UIT configurable |

#### Módulos de Simulación (proyección futura)

| Tipo | Descripción |
|------|-------------|
| Feature | **Escenarios** — múltiples escenarios financieros, comparación gráfica, renombrar inline |
| Feature | **Parámetros** — edad actual/retiro/vida estimada, SWR, metas de ingreso; panel de supervivencia post-retiro (Trinity study) |
| Feature | **Instrumentos** — vinculación a cuentas de Patrimonio; sincronización de montos; indicador visual de desync |
| Feature | **Carrera** — aportes anuales y saltos de carrera proyectados |
| Feature | **Eventos de Vida** — retiros únicos y gastos recurrentes por período dentro del escenario |
| Feature | **Movimientos** — reasignaciones entre instrumentos en año T |

#### Sistema

| Tipo | Descripción |
|------|-------------|
| Feature | **Autenticación** — Supabase Auth; registro, login, recuperación de contraseña |
| Feature | **Sidebar colapsable** — secciones Root / Tracking / Simulación / Sistema; auto-apertura según ruta activa |
| Feature | **Tipo de cambio live** — integración con Rextie (tasa compra y venta); cache localStorage 1h; proxy Vercel para evitar CORS |
| Técnico | Migraciones `001_initial.sql` a `005_suscripciones_links.sql` |
| Técnico | Proxy Vercel para Rextie (`api/tipo-cambio.ts`) y para Anthropic API (`api/boleta.ts`) |

---

## Convenciones de versionado

- **vMAYOR.MENOR.PATCH** — MAYOR: cambio estructural grande · MENOR: features o mejoras en cada deploy · PATCH: hotfixes puntuales
- **Política de deploy:** por demanda (se agrupan al menos 2-3 ítems antes de subir a PROD)
- Cada versión desplegada a PROD debe tener su entrada aquí antes del deploy
