# MyFinance — Recomendaciones UX para Usuarios No Técnicos

*Auditoría realizada: septiembre 2026 · Base: análisis completo del código fuente*

---

## Resumen ejecutivo

MyFinance está bien construido técnicamente. Los problemas UX son de dos tipos: (1) **terminología** — varios campos usan términos en inglés o jerga financiera sin explicación inline, y (2) **flujo de onboarding** — el sistema requiere pasos previos no obvios (crear escenario antes de poder registrar rendimientos) que no están señalizados claramente.

---

## Problemas críticos (bloquean al usuario nuevo)

### 1. Rendimientos requiere Instrumentos, pero no lo dice claramente
**Ubicación:** `src/modules/Returns/Returns.tsx` — selector de instrumento  
**Problema:** Si el usuario va directamente a Rendimientos y no tiene Instrumentos creados, el selector aparece vacío. No hay ningún mensaje que explique qué hacer. El usuario cree que algo está roto.  
**Recomendación:** Mostrar un callout cuando el selector esté vacío: *"Primero debes crear un instrumento en Simulación → Instrumentos. ¿Hacerlo ahora? →"*

### 2. Categorías de Patrimonio en inglés sin traducción
**Ubicación:** `src/modules/Patrimony/Patrimony.tsx` — selector de categoría  
**Problema:** "Savings", "Investment (Stock Exchange)", "Investment (Fintech)", "Investment (Business)", "Asset", "Liability" no tienen descripción ni traducción. Un usuario de 65 años no sabrá qué seleccionar.  
**Recomendación:** Mostrar la categoría con su descripción breve en español en el selector (tooltip o texto auxiliar bajo el campo).

### 3. El campo "Escenario activo" en el sidebar confunde si no usas Simulación
**Ubicación:** `src/components/Layout/AppLayout.tsx` — sidebar  
**Problema:** El selector de escenario aparece en el menú lateral incluso si el usuario no usa Simulación. Los usuarios de solo Tracking no entienden para qué sirve.  
**Recomendación:** Ocultar el selector de escenario si el módulo de Simulación está deshabilitado en Configuración, o agregar un tooltip explicativo.

---

## Problemas importantes (confusión, no bloqueo)

### 4. "TipoRenta" no se explica en el formulario de Rendimientos
**Ubicación:** `src/data/types.ts` — campo `tipoRenta`  
**Problema:** Los tipos `pago`, `capitalizacion`, `variable` cambian completamente qué campos aparecen y cómo se calcula la ganancia, pero no tienen descripción dentro del formulario.  
**Recomendación:** Agregar un párrafo de ayuda debajo del selector de tipo que explique brevemente qué significa cada opción y cuándo usarla.

### 5. La regla del "día 10" en Historial no está visible
**Ubicación:** `src/modules/History/FinanceHistory.tsx`  
**Problema:** El período de un registro se calcula automáticamente según si la fecha es antes o después del día 10, pero esta regla no está documentada en la UI.  
**Recomendación:** Agregar texto auxiliar bajo el campo de fecha: *"Si la fecha es día 10 o antes, el período se asigna al mes anterior. Día 11 en adelante: mes actual."*

### 6. El campo "Traspaso" en Rendimientos no tiene contexto
**Ubicación:** `src/modules/Returns/Returns.tsx` — checkbox `esTraspaso`  
**Problema:** Si el usuario marca "Traspaso", el formulario cambia de modo, pero no explica qué es un traspaso ni cuándo usarlo.  
**Recomendación:** Agregar tooltip o texto: *"Un traspaso mueve dinero de este instrumento a otro sin que sea ganancia ni pérdida."*

### 7. "SWR" en Parámetros no se explica
**Ubicación:** `src/modules/Parameters/Parameters.tsx`  
**Problema:** El campo SWR aparece sin descripción. Para el usuario promedio, "SWR" es completamente desconocido.  
**Recomendación:** Agregar texto auxiliar: *"Safe Withdrawal Rate — porcentaje que retiras de tu fondo cada año en el retiro. El valor más usado es 4%."*

### 8. El pin de Dashboard (📌) no avisa el límite de 5 hasta que falla
**Ubicación:** `src/modules/Patrimony/Patrimony.tsx`  
**Problema:** El usuario no sabe que hay un límite de 5 cuentas destacadas hasta que intenta destacar la 6ta y recibe un error.  
**Recomendación:** Mostrar el conteo actual junto al ícono: *"3/5 destacadas"* o agregar un tooltip que diga el límite antes de que el usuario lo alcance.

---

## Mejoras menores (pulimento)

### 9. El módulo "Impuesto 5ta" no aparece en el onboarding
**Ubicación:** `src/modules/Onboarding/OnboardingWizard.tsx`  
**Problema:** El wizard menciona Tracking, Análisis y Simulación, pero no menciona las Calculadoras. Un usuario peruano que quiere calcular su impuesto a la renta no sabrá que existe.  
**Recomendación:** Agregar una mención breve en el paso del wizard o en la pantalla de inicio.

### 10. "Marcado" en Rendimientos no explica su propósito
**Ubicación:** `src/modules/Returns/Returns.tsx` — checkbox `marcado`  
**Problema:** La casilla "Marcado (pendiente)" no tiene descripción de qué ocurre con los registros marcados.  
**Recomendación:** Agregar tooltip: *"Marca este registro como pendiente de revisión. Los registros marcados se muestran con un indicador visual en la tabla."*

### 11. El botón de "Análisis IA" (✨) no tiene texto de ayuda previo
**Ubicación:** `src/modules/Analytics/Analytics.tsx`  
**Problema:** El botón de instantánea IA aparece sin contexto. El usuario no sabe qué esperar, cuánto tarda, ni si tiene costo.  
**Recomendación:** Agregar tooltip o texto: *"Genera un resumen automático de tu situación financiera en segundos."*

### 12. Flujo de Caja no muestra el total equivalente en PEN cuando hay ítems en USD
**Ubicación:** `src/modules/CashFlow/CashFlow.tsx`  
**Problema:** Si el usuario tiene ingresos en PEN y gastos en USD, el balance final puede mostrar ambas monedas por separado, lo que dificulta entender el balance real.  
**Recomendación:** Agregar una línea de "Balance equivalente total en PEN" usando el TC actual.

---

## Observaciones de tono y lenguaje

- Los estados de error vacío (`EmptyState`) son correctos y bien escritos. ✅
- Los tooltips existentes en Suscripciones (ej: "Se normaliza a mensual automáticamente") son un buen patrón — replicarlo en otros formularios. ✅
- El onboarding wizard de 5 pasos es adecuado pero genérico. Podría ser más específico sobre el primer paso a tomar (ir a Patrimonio). ⚠️
- Evitar mostrar "NaN" o "undefined" en cualquier campo calculado cuando el valor no está disponible — usar "—" como fallback. (Revisar en todos los módulos.)

---

## Prioridades sugeridas

| Prioridad | Problema | Esfuerzo |
|-----------|----------|----------|
| 🔴 Alta | #1 — Rendimientos sin instrumentos | Bajo |
| 🔴 Alta | #2 — Categorías en inglés | Bajo |
| 🔴 Alta | #4 — TipoRenta sin descripción | Bajo |
| 🟡 Media | #3 — Selector escenario confuso | Medio |
| 🟡 Media | #5 — Regla día 10 en Historial | Bajo |
| 🟡 Media | #7 — SWR sin explicación | Bajo |
| 🟡 Media | #8 — Límite de pin no visible | Bajo |
| 🟢 Baja | Resto | Bajo |

---

*Este documento fue generado en base al análisis del código fuente de MyFinance y no requiere validación con usuarios reales para ser válido — todos los problemas identificados son verificables directamente en la UI.*
