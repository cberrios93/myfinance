export interface Meta {
  nombre: string
  montoMensual: number
}

export interface GeneralParams {
  edadActual: number
  edadRetiro: number
  edadVidaEstimada: number  // para calcular supervivencia del fondo post-retiro
  anioActual: number
  swr: number
  metas: Meta[]
}

export interface CambioTasa {
  anioT: number
  nuevaTasa: number
}

export interface Instrumento {
  id: string
  nombre: string
  montoInicial: number
  tasaReal: number
  categoria: string
  esPool: boolean
  cambioTasa?: CambioTasa
  cuentaPatrimonioId?: string  // vinculado a CuentaPatrimonio — monto se sincroniza desde ahí
}

export interface Movimiento {
  id: string
  anioT: number
  desdeInstrumentoId: string | null
  haciaInstrumentoId: string | null
  monto: number | 'todo'
}

export interface RetiroUnico {
  anioT: number
  monto: number
}

export interface GastoRecurrente {
  anioInicioT: number
  anioFinT: number
  montoMensual: number
}

export interface EventoVida {
  id: string
  nombre: string
  retiroUnico?: RetiroUnico
  gastoRecurrente?: GastoRecurrente
}

export interface SaltoCarrera {
  anioT: number
  nuevoAporteAnual: number
}

export interface Carrera {
  aporteAnualBase: number
  crecimientoRealAnual: number
  saltos: SaltoCarrera[]
}

export interface Escenario {
  id: string
  nombre: string
  general: GeneralParams
  instrumentos: Instrumento[]
  movimientos: Movimiento[]
  eventosVida: EventoVida[]
  carrera: Carrera
  creadoEn: string
  actualizadoEn: string
}

export interface ResultadoAnio {
  anioT: number
  edad: number
  anioCalendario: number
  balances: Record<string, number>
  total: number
  ingresoMensual: number
  aporteNeto: number
}

export interface ResultadoAnioPostRetiro {
  edad: number
  capital: number
  retiroAnual: number
  agotado: boolean
}

export interface ResultadoPostRetiro {
  anios: ResultadoAnioPostRetiro[]
  capitalRetiro: number      // fondo al momento de retirarse
  retiroAnualFijo: number    // monto retirado cada año (capitalRetiro × swr)
  agotadoEnEdad: number | null  // null si el fondo sobrevive hasta edadVidaEstimada
  aniosSupervivencia: number    // cuántos años dura el fondo
  tasaPromedioPonderada: number // tasa real ponderada usada en la simulación
}

export interface ResultadoSimulacion {
  anios: ResultadoAnio[]
  metasAlcanzadas: Record<string, number | null>
  postRetiro: ResultadoPostRetiro | null
}

// --- Patrimonio real ---

export const CATEGORIAS_PATRIMONIO = [
  'Savings',
  'Investment (Stock Exchange)',
  'Investment (Fintech)',
  'Investment (Business)',
  'Asset',
  'Liability',
] as const

export type CategoriaPatrimonio = typeof CATEGORIAS_PATRIMONIO[number]

export interface CuentaPatrimonio {
  id: string
  nombre: string
  categoria: CategoriaPatrimonio
  montoPEN?: number
  montoUSD?: number
  esRiesgo: boolean
  orden: number
  creadoEn: string
  actualizadoEn: string
}

// --- Flujo de caja ---

export interface FlujoCajaItem {
  id: string
  nombre: string
  tipo: 'Income' | 'Expense'
  categoria?: string
  montoPEN?: number
  montoUSD?: number
  activo: boolean
  orden: number
  suscripcionId?: string  // si está seteado, este ítem es gestionado por Suscripciones
  creadoEn: string
  actualizadoEn: string
}

// --- Rendimiento de inversiones ---

export interface Rendimiento {
  id: string
  anio: number
  instrumentoNombre: string
  fechaPago?: string
  gananciasPEN?: number
  gananciasUSD?: number
  inversionPEN?: number
  inversionUSD?: number
  rentabilidad?: number
  reinvertido: boolean
  marcado: boolean
  comentario?: string
  creadoEn: string
  actualizadoEn: string
}

// --- Recibo de haberes ---

export interface ReciboHaberes {
  id: string
  fecha: string

  // Haberes
  sueldoBasico: number
  aporteEmpresa: number
  teletrabajo: number
  premioReconocimientoImpto: number
  ticketsAlimentacion: number
  comisionesAnioActual: number
  valeGasolina: number
  sueldoVacaciones: number
  ventaVacaciones: number
  remuneracion1Mayo: number
  vacacionesDevengadas: number
  gratificacion: number
  equitySharesTaxable: number
  totalHaberes: number

  // Otros Haberes
  seguroVida: number
  premioReconocimientoGrossUp: number
  comisionesAnioAnterior: number
  participacionUtilidades: number
  equityRsuPsuPayout: number
  indemVacacional: number
  bonificacionExtraord: number
  equityCashPayout: number
  equityTaxCoverAdvance: number
  equityNetSaleProceeds: number
  totalOtrosHaberes: number

  // Descuentos
  afp: number
  seguroAfp: number
  comisionAfp: number
  impuesto5ta: number
  totalDescuentos: number

  // Otros Descuentos
  abonoGratificacion: number
  abonoUtilidades: number
  dctoValeGasolina: number
  dctoPremioReconocimiento: number
  contribucionEmpleado: number
  desctoAporteEmpresa: number
  dctoSeguroVida: number
  dctoTicketsAlimentacion: number
  essaludVida: number
  equitySharesTaxableDscto: number
  equityTaxCoverAdvanceDscto: number
  totalOtrosDescuentos: number

  // Aportes (empleador)
  epsPrivado: number
  essalud: number
  vidaLey: number
  totalAportes: number

  netoAPagar: number
  notas?: string
  creadoEn: string
  actualizadoEn: string
}

// --- Suscripciones ---

export interface PersonaSuscripcion {
  nombre: string
  monto: number
}

export interface Suscripcion {
  id: string
  nombre: string
  montoTotal: number
  moneda: 'PEN' | 'USD'
  periodicidad: 'Mensual' | 'Anual'
  personas: PersonaSuscripcion[]
  activa: boolean
  vencimiento?: string
  notas?: string
  flujoCajaItemId?: string  // ID del FlujoCajaItem vinculado (gestionado automáticamente)
  creadoEn: string
  actualizadoEn: string
}

// --- Gastos familia ---

export interface GastoFamilia {
  id: string
  descripcion: string
  beneficiario: string
  tipo: string
  montoPEN?: number
  montoUSD?: number
  periodicidad: 'Mensual' | 'Anual'
  activo: boolean
  notas?: string
  creadoEn: string
  actualizadoEn: string
}

// --- Deudas pendientes ---

export type EstadoDeuda = 'Pendiente' | 'En proceso judicial' | 'Cobrado parcial' | 'Cobrado total'

export interface DeudaPendiente {
  id: string
  deudor: string
  concepto: string
  fechaDeposito?: string
  capital: number
  intereses: number
  estado: EstadoDeuda
  notas?: string
  creadoEn: string
  actualizadoEn: string
}

// --- Notas e ideas ---

export interface Nota {
  id: string
  titulo: string
  contenido?: string
  tags: string[]
  creadoEn: string
  actualizadoEn: string
}

// --- Historial mensual ---

export interface HistorialMensual {
  id: string
  fecha: string      // ISO "2026-08-01"
  periodo: string    // "08 - 2026"
  totalPEN: number
  totalUSD: number
  tipoCambio: number
  nota?: string
  creadoEn: string
  actualizadoEn: string
}
