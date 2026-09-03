import { supabase } from './client'
import type {
  FlujoCajaItem, Rendimiento, ReciboHaberes,
  Suscripcion, GastoFamilia, DeudaPendiente, Nota,
  EstadoDeuda, FlujoCapital,
} from '../../data/types'

async function uid(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  return user.id
}

// ── Flujo de caja ──────────────────────────────────────────────

export async function listarFlujoCaja(): Promise<FlujoCajaItem[]> {
  const { data, error } = await supabase.from('flujo_caja').select('*').order('orden').order('creado_en')
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, nombre: r.nombre, tipo: r.tipo, categoria: r.categoria ?? undefined,
    montoPEN: r.monto_pen ?? undefined, montoUSD: r.monto_usd ?? undefined,
    activo: r.activo, orden: r.orden,
    suscripcionId: r.suscripcion_id ?? undefined,
    gastoFamiliaId: r.gasto_familia_id ?? undefined,
    creadoEn: r.creado_en, actualizadoEn: r.actualizado_en,
  }))
}

export async function guardarFlujoCajaItem(item: FlujoCajaItem): Promise<void> {
  const user_id = await uid()
  const { error } = await supabase.from('flujo_caja').upsert({
    id: item.id, user_id, nombre: item.nombre, tipo: item.tipo,
    categoria: item.categoria ?? null, monto_pen: item.montoPEN ?? null,
    monto_usd: item.montoUSD ?? null, activo: item.activo, orden: item.orden,
    actualizado_en: new Date().toISOString(),
  })
  if (error) throw error
}

export async function eliminarFlujoCajaItem(id: string): Promise<void> {
  const { error } = await supabase.from('flujo_caja').delete().eq('id', id)
  if (error) throw error
}

// ── Rendimientos ───────────────────────────────────────────────

export async function listarRendimientos(): Promise<Rendimiento[]> {
  const { data, error } = await supabase.from('rendimientos').select('*')
    .order('anio', { ascending: false }).order('mes', { ascending: false }).order('fecha_pago')
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, anio: r.anio, mes: r.mes ?? undefined, instrumentoNombre: r.instrumento_nombre,
    fechaPago: r.fecha_pago ?? undefined, gananciasPEN: r.ganancias_pen ?? undefined,
    gananciasUSD: r.ganancias_usd ?? undefined, inversionPEN: r.inversion_pen ?? undefined,
    inversionUSD: r.inversion_usd ?? undefined, aporteMesPEN: r.aporte_mes_pen ?? undefined,
    aporteMesUSD: r.aporte_mes_usd ?? undefined, rentabilidad: r.rentabilidad ?? undefined,
    tasaImpuesto: r.tasa_impuesto != null ? Number(r.tasa_impuesto) : 0,
    reinvertido: r.reinvertido, marcado: r.marcado, esTraspaso: r.es_traspaso ?? false,
    comentario: r.comentario ?? undefined,
    creadoEn: r.creado_en, actualizadoEn: r.actualizado_en,
  }))
}

export async function guardarRendimiento(r: Rendimiento): Promise<void> {
  const user_id = await uid()
  const { error } = await supabase.from('rendimientos').upsert({
    id: r.id, user_id, anio: r.anio, mes: r.mes ?? null, instrumento_nombre: r.instrumentoNombre,
    fecha_pago: r.fechaPago ?? null, ganancias_pen: r.gananciasPEN ?? null,
    ganancias_usd: r.gananciasUSD ?? null, inversion_pen: r.inversionPEN ?? null,
    inversion_usd: r.inversionUSD ?? null, aporte_mes_pen: r.aporteMesPEN ?? null,
    aporte_mes_usd: r.aporteMesUSD ?? null, rentabilidad: r.rentabilidad ?? null,
    tasa_impuesto: r.tasaImpuesto ?? 0,
    reinvertido: r.reinvertido, marcado: r.marcado, es_traspaso: r.esTraspaso ?? false,
    comentario: r.comentario ?? null,
    actualizado_en: new Date().toISOString(),
  })
  if (error) throw error
}

export async function eliminarRendimiento(id: string): Promise<void> {
  const { error } = await supabase.from('rendimientos').delete().eq('id', id)
  if (error) throw error
}

// ── Recibos de haberes ─────────────────────────────────────────

export async function listarRecibos(): Promise<ReciboHaberes[]> {
  const { data, error } = await supabase.from('recibos_haberes').select('*').order('fecha', { ascending: false })
  if (error) throw error
  const n = (v: unknown) => Number(v ?? 0)
  return (data ?? []).map(r => ({
    id: r.id, fecha: r.fecha,
    // Haberes
    sueldoBasico: n(r.sueldo_basico), aporteEmpresa: n(r.aporte_empresa),
    teletrabajo: n(r.teletrabajo), premioReconocimientoImpto: n(r.premio_reconocimiento_impto),
    ticketsAlimentacion: n(r.tickets_alimentacion),
    comisionesAnioActual: n(r.comisiones_anio_actual) || n(r.comisiones),
    valeGasolina: n(r.vale_gasolina), sueldoVacaciones: n(r.sueldo_vacaciones),
    ventaVacaciones: n(r.venta_vacaciones), remuneracion1Mayo: n(r.remuneracion_1_mayo),
    vacacionesDevengadas: n(r.vacaciones_devengadas), gratificacion: n(r.gratificacion),
    equitySharesTaxable: n(r.equity_shares_taxable), totalHaberes: n(r.total_haberes),
    // Otros Haberes
    seguroVida: n(r.seguro_vida), premioReconocimientoGrossUp: n(r.premio_reconocimiento_gross_up),
    comisionesAnioAnterior: n(r.comisiones_anio_anterior), participacionUtilidades: n(r.participacion_utilidades),
    equityRsuPsuPayout: n(r.equity_rsu_psu_payout), indemVacacional: n(r.indem_vacacional),
    bonificacionExtraord: n(r.bonificacion_extraord), equityCashPayout: n(r.equity_cash_payout),
    equityTaxCoverAdvance: n(r.equity_tax_cover_advance), equityNetSaleProceeds: n(r.equity_net_sale_proceeds),
    totalOtrosHaberes: n(r.total_otros_haberes),
    // Descuentos
    afp: n(r.afp), seguroAfp: n(r.seguro_afp), comisionAfp: n(r.comision_afp),
    impuesto5ta: n(r.impuesto_5ta), totalDescuentos: n(r.total_descuentos),
    // Otros Descuentos
    abonoGratificacion: n(r.abono_gratificacion), abonoUtilidades: n(r.abono_utilidades),
    dctoValeGasolina: n(r.dcto_vale_gasolina), dctoPremioReconocimiento: n(r.dcto_premio_reconocimiento),
    contribucionEmpleado: n(r.contribucion_empleado), desctoAporteEmpresa: n(r.descto_aporte_empresa),
    dctoSeguroVida: n(r.dcto_seguro_vida), dctoTicketsAlimentacion: n(r.dcto_tickets_alimentacion),
    essaludVida: n(r.essalud_vida), equitySharesTaxableDscto: n(r.equity_shares_taxable_dscto),
    equityTaxCoverAdvanceDscto: n(r.equity_tax_cover_advance_dscto), totalOtrosDescuentos: n(r.total_otros_descuentos),
    // Aportes
    epsPrivado: n(r.eps_privado), essalud: n(r.essalud), vidaLey: n(r.vida_ley), totalAportes: n(r.total_aportes),
    netoAPagar: n(r.neto_a_pagar), notas: r.notas ?? undefined,
    creadoEn: r.creado_en, actualizadoEn: r.actualizado_en,
  }))
}

export async function guardarRecibo(rec: ReciboHaberes): Promise<void> {
  const user_id = await uid()
  const { error } = await supabase.from('recibos_haberes').upsert({
    id: rec.id, user_id, fecha: rec.fecha,
    // Haberes
    sueldo_basico: rec.sueldoBasico, aporte_empresa: rec.aporteEmpresa,
    teletrabajo: rec.teletrabajo, premio_reconocimiento_impto: rec.premioReconocimientoImpto,
    tickets_alimentacion: rec.ticketsAlimentacion, comisiones_anio_actual: rec.comisionesAnioActual,
    vale_gasolina: rec.valeGasolina, sueldo_vacaciones: rec.sueldoVacaciones,
    venta_vacaciones: rec.ventaVacaciones, remuneracion_1_mayo: rec.remuneracion1Mayo,
    vacaciones_devengadas: rec.vacacionesDevengadas, gratificacion: rec.gratificacion,
    equity_shares_taxable: rec.equitySharesTaxable, total_haberes: rec.totalHaberes,
    // Otros Haberes
    seguro_vida: rec.seguroVida, premio_reconocimiento_gross_up: rec.premioReconocimientoGrossUp,
    comisiones_anio_anterior: rec.comisionesAnioAnterior, participacion_utilidades: rec.participacionUtilidades,
    equity_rsu_psu_payout: rec.equityRsuPsuPayout, indem_vacacional: rec.indemVacacional,
    bonificacion_extraord: rec.bonificacionExtraord, equity_cash_payout: rec.equityCashPayout,
    equity_tax_cover_advance: rec.equityTaxCoverAdvance, equity_net_sale_proceeds: rec.equityNetSaleProceeds,
    total_otros_haberes: rec.totalOtrosHaberes,
    // Descuentos
    afp: rec.afp, seguro_afp: rec.seguroAfp, comision_afp: rec.comisionAfp,
    impuesto_5ta: rec.impuesto5ta, total_descuentos: rec.totalDescuentos,
    // Otros Descuentos
    abono_gratificacion: rec.abonoGratificacion, abono_utilidades: rec.abonoUtilidades,
    dcto_vale_gasolina: rec.dctoValeGasolina, dcto_premio_reconocimiento: rec.dctoPremioReconocimiento,
    contribucion_empleado: rec.contribucionEmpleado, descto_aporte_empresa: rec.desctoAporteEmpresa,
    dcto_seguro_vida: rec.dctoSeguroVida, dcto_tickets_alimentacion: rec.dctoTicketsAlimentacion,
    essalud_vida: rec.essaludVida, equity_shares_taxable_dscto: rec.equitySharesTaxableDscto,
    equity_tax_cover_advance_dscto: rec.equityTaxCoverAdvanceDscto, total_otros_descuentos: rec.totalOtrosDescuentos,
    // Aportes
    eps_privado: rec.epsPrivado, essalud: rec.essalud, vida_ley: rec.vidaLey, total_aportes: rec.totalAportes,
    neto_a_pagar: rec.netoAPagar, notas: rec.notas ?? null,
    actualizado_en: new Date().toISOString(),
  }, { onConflict: 'user_id,fecha' })
  if (error) throw error
}

export async function eliminarRecibo(id: string): Promise<void> {
  const { error } = await supabase.from('recibos_haberes').delete().eq('id', id)
  if (error) throw error
}

// ── Suscripciones ──────────────────────────────────────────────

export async function listarSuscripciones(): Promise<Suscripcion[]> {
  const { data, error } = await supabase.from('suscripciones').select('*').order('creado_en')
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, nombre: r.nombre, montoTotal: Number(r.monto_total),
    moneda: r.moneda, periodicidad: r.periodicidad,
    personas: r.personas ?? [], activa: r.activa,
    vencimiento: r.vencimiento ?? undefined, notas: r.notas ?? undefined,
    flujoCajaItemId: r.flujo_caja_item_id ?? undefined,
    creadoEn: r.creado_en, actualizadoEn: r.actualizado_en,
  }))
}

export async function guardarSuscripcion(s: Suscripcion): Promise<void> {
  const user_id = await uid()
  const { error } = await supabase.from('suscripciones').upsert({
    id: s.id, user_id, nombre: s.nombre, monto_total: s.montoTotal,
    moneda: s.moneda, periodicidad: s.periodicidad, personas: s.personas,
    activa: s.activa, vencimiento: s.vencimiento ?? null, notas: s.notas ?? null,
    flujo_caja_item_id: s.flujoCajaItemId ?? null,
    actualizado_en: new Date().toISOString(),
  })
  if (error) throw error
}

export async function eliminarSuscripcion(id: string): Promise<void> {
  const { error } = await supabase.from('suscripciones').delete().eq('id', id)
  if (error) throw error
}

// ── Gastos familia ─────────────────────────────────────────────

export async function listarGastosFamilia(): Promise<GastoFamilia[]> {
  const { data, error } = await supabase.from('gastos_familia').select('*').order('beneficiario').order('creado_en')
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, descripcion: r.descripcion, beneficiario: r.beneficiario, tipo: r.tipo,
    montoPEN: r.monto_pen ?? undefined, montoUSD: r.monto_usd ?? undefined,
    periodicidad: r.periodicidad, activo: r.activo, notas: r.notas ?? undefined,
    flujoCajaItemId: r.flujo_caja_item_id ?? undefined,
    creadoEn: r.creado_en, actualizadoEn: r.actualizado_en,
  }))
}

export async function guardarGastoFamilia(g: GastoFamilia): Promise<void> {
  const user_id = await uid()
  const { error } = await supabase.from('gastos_familia').upsert({
    id: g.id, user_id, descripcion: g.descripcion, beneficiario: g.beneficiario,
    tipo: g.tipo, monto_pen: g.montoPEN ?? null, monto_usd: g.montoUSD ?? null,
    periodicidad: g.periodicidad, activo: g.activo, notas: g.notas ?? null,
    flujo_caja_item_id: g.flujoCajaItemId ?? null,
    actualizado_en: new Date().toISOString(),
  })
  if (error) throw error
}

export async function eliminarGastoFamilia(id: string): Promise<void> {
  const { error } = await supabase.from('gastos_familia').delete().eq('id', id)
  if (error) throw error
}

// ── Deudas pendientes ──────────────────────────────────────────

export async function listarDeudas(): Promise<DeudaPendiente[]> {
  const { data, error } = await supabase.from('deudas_pendientes').select('*').order('deudor').order('creado_en')
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, deudor: r.deudor, concepto: r.concepto,
    fechaDeposito: r.fecha_deposito ?? undefined,
    capital: Number(r.capital), intereses: Number(r.intereses),
    estado: r.estado as EstadoDeuda, notas: r.notas ?? undefined,
    creadoEn: r.creado_en, actualizadoEn: r.actualizado_en,
  }))
}

export async function guardarDeuda(d: DeudaPendiente): Promise<void> {
  const user_id = await uid()
  const { error } = await supabase.from('deudas_pendientes').upsert({
    id: d.id, user_id, deudor: d.deudor, concepto: d.concepto,
    fecha_deposito: d.fechaDeposito ?? null, capital: d.capital,
    intereses: d.intereses, estado: d.estado, notas: d.notas ?? null,
    actualizado_en: new Date().toISOString(),
  })
  if (error) throw error
}

export async function eliminarDeuda(id: string): Promise<void> {
  const { error } = await supabase.from('deudas_pendientes').delete().eq('id', id)
  if (error) throw error
}

// ── Notas ──────────────────────────────────────────────────────

export async function listarNotas(): Promise<Nota[]> {
  const { data, error } = await supabase.from('notas').select('*').order('actualizado_en', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, titulo: r.titulo, contenido: r.contenido ?? undefined,
    tags: r.tags ?? [], creadoEn: r.creado_en, actualizadoEn: r.actualizado_en,
  }))
}

export async function guardarNota(n: Nota): Promise<void> {
  const user_id = await uid()
  const { error } = await supabase.from('notas').upsert({
    id: n.id, user_id, titulo: n.titulo, contenido: n.contenido ?? null,
    tags: n.tags, actualizado_en: new Date().toISOString(),
  })
  if (error) throw error
}

export async function eliminarNota(id: string): Promise<void> {
  const { error } = await supabase.from('notas').delete().eq('id', id)
  if (error) throw error
}

// ── Flujos de Capital ──────────────────────────────────────────

export async function listarFlujosCapital(): Promise<FlujoCapital[]> {
  const { data, error } = await supabase.from('flujos_capital').select('*').order('fecha', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id, fecha: r.fecha, tipo: r.tipo as 'aporte' | 'retiro',
    monto: Number(r.monto), moneda: r.moneda as 'PEN' | 'USD',
    nota: r.nota ?? undefined, creadoEn: r.creado_en, actualizadoEn: r.actualizado_en,
  }))
}

export async function guardarFlujoCapital(f: FlujoCapital): Promise<void> {
  const user_id = await uid()
  const { error } = await supabase.from('flujos_capital').upsert({
    id: f.id, user_id, fecha: f.fecha, tipo: f.tipo,
    monto: f.monto, moneda: f.moneda, nota: f.nota ?? null,
    actualizado_en: new Date().toISOString(),
  })
  if (error) throw error
}

export async function eliminarFlujoCapital(id: string): Promise<void> {
  const { error } = await supabase.from('flujos_capital').delete().eq('id', id)
  if (error) throw error
}
