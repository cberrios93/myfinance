# MyFinance — Reglas de trabajo

## Regla 1 — Inicio de sesión
Al comenzar cualquier sesión, leer siempre:
1. `.claude/PROJECT.md` — módulos, decisiones técnicas, deploy, archivos clave
2. `.claude/BACKLOG.md` — ítems pendientes con prioridad, tipo y estado
3. `CHANGELOG.md` — versiones en PROD y qué hay en `[Unreleased]`

## Regla 2 — Flujo DEV → PROD
- Todo se implementa en DEV primero, nunca directo a PROD
- Al terminar algo en DEV → agregar a `[Unreleased]` en `CHANGELOG.md` antes de cerrar la sesión
- Al hacer deploy → convertir `[Unreleased]` a versión numerada con fecha, generar release notes

## Regla 3 — Gestión del backlog
- El backlog vive en `.claude/BACKLOG.md`
- Cada ítem tiene: Prioridad + Tipo + Estado
- Flujo de estados: `Idea → Definido → En DEV → Listo DEV → En PROD`
- Al llegar a "En PROD": el ítem sale del backlog y queda registrado en `CHANGELOG.md`

## Regla 4 — Migraciones de base de datos
- Toda migración nueva se ejecuta en DEV primero
- Se documenta en la tabla de migraciones de `PROJECT.md` como `✓ DEV`
- Solo pasa a `✓ DEV + PROD` cuando se confirma ejecución en producción

## Regla 5 — Restricciones técnicas
Antes de tocar estas áreas, revisar las decisiones técnicas en `PROJECT.md`:
- No renombrar campos internos de `src/engine/calculator.ts`
- El orden de providers en `App.tsx` es fijo: `ScenarioProvider > PatrimonyProvider > FinanceDataProvider`
- Para probar Edge Functions (`api/`) en local: usar `vercel dev`, no `npm run dev`

## Regla 6 — Ideas que surgen mid-sesión
Si durante el trabajo aparece una idea o mejora nueva, agregarla a `BACKLOG.md` con Estado "Idea" antes de continuar. No implementarla en ese momento salvo que César lo indique explícitamente.

## Regla 7 — Archivos y estructura
- Nunca borrar archivos sin confirmar primero con César
- Antes de crear algo nuevo, verificar que no exista algo similar en el proyecto
