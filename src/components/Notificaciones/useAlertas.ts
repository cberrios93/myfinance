import { useMemo } from 'react'
import { useFinanceData } from '../../data/FinanceDataContext'
import { useScenario } from '../../data/ScenarioContext'

interface Alerta {
  emoji: string
  titulo: string
  descripcion?: string
  link?: string
}

export function useAlertas(): Alerta[] {
  const { rendimientos, flujoCaja } = useFinanceData()
  const { escenarioActivo } = useScenario()

  return useMemo(() => {
    const alertas: Alerta[] = []
    const hoy = new Date()
    const mesActual = hoy.getMonth() + 1
    const anioActual = hoy.getFullYear()

    // 1. Rendimiento del mes anterior sin registrar
    const mesAnterior = mesActual === 1 ? 12 : mesActual - 1
    const anioAnterior = mesActual === 1 ? anioActual - 1 : anioActual
    const tieneRendMesAnterior = rendimientos.some(r => r.mes === mesAnterior && r.anio === anioAnterior)
    if (!tieneRendMesAnterior && rendimientos.length > 0) {
      const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
      alertas.push({
        emoji: '📊',
        titulo: `Rendimiento de ${meses[mesAnterior - 1]} ${anioAnterior} sin registrar`,
        descripcion: 'Mantén tu historial al día para proyecciones precisas',
        link: '/rendimientos',
      })
    }

    // 2. Impuestos pendientes de períodos vencidos
    const impuestosPendientes = rendimientos.filter(r => {
      if (r.impuestoPagado) return false
      if (!r.tasaImpuesto || r.tasaImpuesto === 0) return false
      const esVencido = r.anio < anioActual ||
        (r.anio === anioActual && (r.mes ?? 1) < mesActual)
      return esVencido
    })
    if (impuestosPendientes.length > 0) {
      alertas.push({
        emoji: '🧾',
        titulo: `${impuestosPendientes.length} impuesto${impuestosPendientes.length > 1 ? 's' : ''} pendiente${impuestosPendientes.length > 1 ? 's' : ''} de pago`,
        descripcion: 'Revisa la sección de Impuestos para regularizar',
        link: '/impuestos-inversiones',
      })
    }

    // 3. Eventos de vida próximos (dentro de 4 meses)
    const eventos = escenarioActivo?.eventosVida ?? []
    const anioBase = anioActual
    eventos.forEach(ev => {
      const anioEvento = (ev.gastoRecurrente?.anioInicioT ?? ev.retiroUnico?.anioT ?? 0) + anioBase
      const mesEvento = ev.gastoRecurrente?.mesInicio ?? ev.retiroUnico?.mes ?? 1
      const diffMeses = (anioEvento - anioActual) * 12 + (mesEvento - mesActual)
      if (diffMeses > 0 && diffMeses <= 4) {
        const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
        alertas.push({
          emoji: '🗓',
          titulo: `Evento próximo: ${ev.nombre}`,
          descripcion: `Empieza en ${meses[mesEvento - 1]} ${anioEvento} — en ${diffMeses} mes${diffMeses > 1 ? 'es' : ''}`,
          link: '/eventos',
        })
      }
    })

    // 4. Flujo de caja negativo (egresos > ingresos)
    const ingresos = flujoCaja.filter(f => f.tipo === 'ingreso' && f.activo).reduce((s, f) => s + (f.montoPEN ?? 0), 0)
    const egresos  = flujoCaja.filter(f => f.tipo === 'gasto'   && f.activo).reduce((s, f) => s + (f.montoPEN ?? 0), 0)
    if (ingresos > 0 && egresos > ingresos) {
      alertas.push({
        emoji: '⚠️',
        titulo: 'Flujo de caja mensual negativo',
        descripcion: `Egresos (S/ ${Math.round(egresos).toLocaleString('es-PE')}) superan ingresos (S/ ${Math.round(ingresos).toLocaleString('es-PE')})`,
        link: '/flujo-caja',
      })
    }

    return alertas
  }, [rendimientos, flujoCaja, escenarioActivo])
}
