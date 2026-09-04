import { DASHBOARD_LAYOUT_VERSION, type DashboardLayout } from '../../data/types'

// Layout por defecto: reproduce el dashboard clásico en la grilla de 60 columnas.
// 60 = mcm(5, 3, 4) → las 4 filas dividen en partes iguales.
// Fila 1: 5 KPIs (w=12) · Fila 2: 3 charts (w=20) · Fila 3: 3 listas (w=20) · Fila 4: 4 chips (w=15).
// rowHeight 36px. Se usa cuando el usuario nunca personalizó, y como base al
// entrar a "Personalizar".

export const DEFAULT_LAYOUT: DashboardLayout = {
  version: DASHBOARD_LAYOUT_VERSION,
  tiles: [
    // Fila 1 — KPIs (w=12, h=2)
    { id: 'kpi-patrimonio',  x: 0,  y: 0,  w: 12, h: 2 },
    { id: 'kpi-flujo',       x: 12, y: 0,  w: 12, h: 2 },
    { id: 'kpi-ahorro',      x: 24, y: 0,  w: 12, h: 2 },
    { id: 'kpi-emergencia',  x: 36, y: 0,  w: 12, h: 2 },
    { id: 'kpi-retiro',      x: 48, y: 0,  w: 12, h: 2 },
    // Fila 2 — charts (w=20, h=8)
    { id: 'chart-evolucion',   x: 0,  y: 2, w: 20, h: 8 },
    { id: 'chart-proyeccion',  x: 20, y: 2, w: 20, h: 8 },
    { id: 'chart-composicion', x: 40, y: 2, w: 20, h: 8 },
    // Fila 3 — listas (w=20, h=6)
    { id: 'list-suscripciones', x: 0,  y: 10, w: 20, h: 6 },
    { id: 'list-cuentas',       x: 20, y: 10, w: 20, h: 6 },
    { id: 'list-rendimientos',  x: 40, y: 10, w: 20, h: 6 },
    // Fila 4 — chips (w=15, h=1)
    { id: 'chip-tc',          x: 0,  y: 16, w: 15, h: 1 },
    { id: 'chip-vencimiento', x: 15, y: 16, w: 15, h: 1 },
    { id: 'chip-historial',   x: 30, y: 16, w: 15, h: 1 },
    { id: 'chip-salud',       x: 45, y: 16, w: 15, h: 1 },
  ],
}
