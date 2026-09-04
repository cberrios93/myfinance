import { useDashboardData } from './useDashboardData'
import { DashboardCanvas } from './DashboardCanvas'

// Etapa 3 — Dashboard personalizable: canvas de mosaicos con modos Vista/Edición.
// Mientras el usuario no personalice, se ve el dashboard clásico (DashboardView).

export default function Dashboard() {
  const d = useDashboardData()

  if (d.isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
        <div className="text-4xl">📊</div>
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-texto)' }}>Sin datos aún</h2>
        <p className="text-sm max-w-xs" style={{ color: 'var(--color-muted)' }}>
          Agrega cuentas en Patrimonio y ítems en Flujo de Caja para ver tu resumen aquí.
        </p>
      </div>
    )
  }

  return <DashboardCanvas d={d} />
}
