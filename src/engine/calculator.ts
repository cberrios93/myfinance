import type { Escenario, ResultadoAnio, ResultadoSimulacion, ResultadoAnioPostRetiro } from '../data/types'

export function simular(escenario: Escenario): ResultadoSimulacion {
  const { general, instrumentos, movimientos, eventosVida, carrera } = escenario
  const { edadActual, edadRetiro, edadVidaEstimada = 85, anioActual, swr, metas } = general
  const horizonte = edadRetiro - edadActual

  const balances: Record<string, number> = {}
  for (const inst of instrumentos) {
    balances[inst.id] = inst.montoInicial
  }

  const poolId = instrumentos.find(i => i.esPool)?.id ?? null

  const anios: ResultadoAnio[] = []

  const total0 = Object.values(balances).reduce((a, b) => a + b, 0)
  anios.push({
    anioT: 0,
    edad: edadActual,
    anioCalendario: anioActual,
    balances: { ...balances },
    total: total0,
    ingresoMensual: total0 * swr / 12,
    aporteNeto: 0,
  })

  for (let t = 1; t <= horizonte; t++) {
    // a. Crecer cada instrumento
    for (const inst of instrumentos) {
      let tasa = inst.tasaReal
      if (inst.cambioTasa && t > inst.cambioTasa.anioT) {
        tasa = inst.cambioTasa.nuevaTasa
      }
      balances[inst.id] = balances[inst.id] * (1 + tasa)
    }

    // b. Aplicar movimientos
    for (const mov of movimientos.filter(m => m.anioT === t)) {
      let monto: number
      if (mov.monto === 'todo') {
        monto = mov.desdeInstrumentoId ? balances[mov.desdeInstrumentoId] : 0
      } else {
        monto = mov.monto
      }
      if (mov.desdeInstrumentoId) {
        balances[mov.desdeInstrumentoId] = Math.max(0, balances[mov.desdeInstrumentoId] - monto)
      }
      if (mov.haciaInstrumentoId) {
        balances[mov.haciaInstrumentoId] = (balances[mov.haciaInstrumentoId] ?? 0) + monto
      }
    }

    // c. Calcular aporte base
    let aporteBase: number
    const saltosAplicables = carrera.saltos
      .filter(s => s.anioT <= t)
      .sort((a, b) => b.anioT - a.anioT)

    if (saltosAplicables.length > 0) {
      const saltoBase = saltosAplicables[0]
      const aniosDesde = t - saltoBase.anioT
      aporteBase = saltoBase.nuevoAporteAnual * Math.pow(1 + carrera.crecimientoRealAnual, aniosDesde)
    } else {
      aporteBase = carrera.aporteAnualBase * Math.pow(1 + carrera.crecimientoRealAnual, t - 1)
    }

    // d. Gastos recurrentes activos
    let gastosRecurrentes = 0
    for (const ev of eventosVida) {
      if (ev.gastoRecurrente) {
        const { anioInicioT, anioFinT, montoMensual } = ev.gastoRecurrente
        if (t >= anioInicioT && t <= anioFinT) {
          gastosRecurrentes += montoMensual * 12
        }
      }
    }

    // e. Aporte neto
    const aporteNeto = Math.max(aporteBase - gastosRecurrentes, 0)

    // f. Retiros únicos
    let retirosPuntuales = 0
    for (const ev of eventosVida) {
      if (ev.retiroUnico && ev.retiroUnico.anioT === t) {
        retirosPuntuales += ev.retiroUnico.monto
      }
    }

    // g. El pool recibe el aporte neto menos retiros puntuales
    if (poolId) {
      balances[poolId] = Math.max(balances[poolId] + aporteNeto - retirosPuntuales, 0)
    }

    const total = Object.values(balances).reduce((a, b) => a + b, 0)
    anios.push({
      anioT: t,
      edad: edadActual + t,
      anioCalendario: anioActual + t,
      balances: { ...balances },
      total,
      ingresoMensual: total * swr / 12,
      aporteNeto,
    })
  }

  const metasAlcanzadas: Record<string, number | null> = {}
  for (const meta of metas) {
    const anioAlcanzado = anios.find(a => a.ingresoMensual >= meta.montoMensual)
    metasAlcanzadas[meta.nombre] = anioAlcanzado ? anioAlcanzado.edad : null
  }

  // ── Fase post-retiro ──────────────────────────────────────────────────────
  const aniosPostRetiro = Math.max(0, edadVidaEstimada - edadRetiro)
  const capitalRetiro = anios[anios.length - 1]?.total ?? 0

  // Tasa real ponderada por balance al momento del retiro
  const totalRetiro = Object.values(balances).reduce((s, v) => s + v, 0)
  const tasaPromedioPonderada = totalRetiro > 0
    ? instrumentos.reduce((s, inst) => s + (balances[inst.id] ?? 0) * inst.tasaReal, 0) / totalRetiro
    : 0.04

  // Retiro anual fijo = capitalRetiro × SWR (estilo Trinity: monto fijo, no porcentaje del saldo actual)
  const retiroAnualFijo = capitalRetiro * swr

  const postRetiroAnios: ResultadoAnioPostRetiro[] = []
  let capital = capitalRetiro
  let agotadoEnEdad: number | null = null

  for (let i = 1; i <= aniosPostRetiro; i++) {
    capital = capital * (1 + tasaPromedioPonderada) - retiroAnualFijo
    const agotado = capital <= 0
    if (agotado) capital = 0
    postRetiroAnios.push({ edad: edadRetiro + i, capital, retiroAnual: retiroAnualFijo, agotado })
    if (agotado && agotadoEnEdad === null) {
      agotadoEnEdad = edadRetiro + i
      break
    }
  }

  const aniosSupervivencia = agotadoEnEdad != null
    ? agotadoEnEdad - edadRetiro
    : aniosPostRetiro

  return {
    anios,
    metasAlcanzadas,
    postRetiro: aniosPostRetiro > 0 ? {
      anios: postRetiroAnios,
      capitalRetiro,
      retiroAnualFijo,
      agotadoEnEdad,
      aniosSupervivencia,
      tasaPromedioPonderada,
    } : null,
  }
}
