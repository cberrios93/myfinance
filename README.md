# MyFinance

App web de finanzas personales. Reemplaza el Excel de seguimiento patrimonial y de simulación financiera.

**PROD:** https://fin.cesarberrios.com

---

## Stack

- React + TypeScript + Vite + Tailwind CSS + Recharts
- Supabase Auth + Postgres con RLS
- Vercel (hosting + Edge Functions)

---

## Requisitos previos

- Node.js 18+
- Cuenta en Supabase (proyecto DEV separado del PROD)
- Vercel CLI (`npm i -g vercel`)

---

## Configuración inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

Las variables necesarias están en `.env.example`. Los valores los encuentras en:
- Supabase → proyecto DEV → Settings → API
- Anthropic Console → API Keys
- Supabase → proyecto DEV → Settings → API → service_role key

### 3. Migraciones de base de datos

Aplica las migraciones en orden desde `supabase/migrations/` usando el dashboard de Supabase o la CLI:

```bash
supabase db push
```

Para validar que el esquema esté correcto:

```bash
# Ejecutar supabase/migrations/validate_schema.sql en el SQL Editor de Supabase
```

---

## Correr en desarrollo

### Solo frontend

```bash
npm run dev
```

### Frontend + Edge Functions (necesario para gestión de usuarios)

```bash
vercel dev
```

Usar `vercel dev` cuando vayas a probar: invitar usuarios, bloquear/desbloquear, eliminar usuarios. Estas funciones viven en `api/` y requieren `SUPABASE_SERVICE_ROLE_KEY`.

---

## Deploy a producción

```bash
git push origin main
```

Vercel despliega automáticamente al hacer push a `main`. Asegúrate de que las migraciones nuevas estén aplicadas en el proyecto Supabase PROD antes del deploy.

---

## Estructura relevante

```
src/
├── engine/calculator.ts     # Motor de simulación financiera
├── data/                    # Contexts y tipos
├── modules/                 # Un directorio por módulo/pantalla
├── lib/                     # Utilidades (Supabase, Rextie, parseBoleta)
└── hooks/                   # Hooks reutilizables

api/                         # Edge Functions de Vercel
supabase/migrations/         # Migraciones SQL en orden
.claude/                     # Contexto y reglas de trabajo para Claude Code
```

---

## Documentación interna

| Archivo | Contenido |
|---------|-----------|
| `CHANGELOG.md` | Historial de versiones desplegadas |
| `.claude/PROJECT.md` | Módulos, decisiones técnicas, deploy |
| `.claude/BACKLOG.md` | Ítems pendientes con prioridad y estado |
| `.claude/CLAUDE.md` | Reglas de trabajo con Claude Code |
