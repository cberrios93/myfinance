# CHANGELOG — MyFinance

Registro oficial de versiones de MyFinance. Cada versión publicada en producción queda documentada aquí.

Criterios de tipo:
- **Feature** — funcionalidad nueva visible al usuario
- **Mejora** — mejora sobre algo ya existente
- **Fix** — corrección de error
- **Técnico** — cambio interno, no visible al usuario

---

## [Unreleased] — DEV

---

## [v2.1.0] — 2026-09-03 — PROD

### Brand System & UI
- **Mejora** — Sistema de marca completo: logo SVG (escalera ascendente teal sobre cuadrado navy) en sidebar y login; wordmark "my**Finance**" (DM Sans 200i + 700); tokens CSS `--color-*` y `--chart-*` alineados a paleta oficial (teal `#00C9A7`); tipografía DM Sans + DM Mono vía Google Fonts; reemplazo global de colores hardcodeados en `.tsx` por tokens de marca.
- **Mejora** — Modo Day/Night en Configuración: Day con fondo claro (`#F2F6FA`, cards blancas, texto navy) y Night con fondo oscuro (`#060E1B`); eliminadas las 6 paletas anteriores y el picker de acento custom. El teal `#00C9A7` es fijo en ambos modos.
- **Mejora** — Tipografía de marca fija (DM Sans): eliminado selector de fuentes en Configuración.

### Responsive
- **Mejora** — Responsive móvil completo: Dashboard con grids adaptativos (5→2 col KPIs, 3→1 col contenido); tablas con scroll horizontal en Patrimonio, Debts, CashFlow, Tax5th, Analytics; hook `useIsMobile` para breakpoints dinámicos; charts con altura explícita en mobile.

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
