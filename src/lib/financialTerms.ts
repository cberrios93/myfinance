export const FINANCIAL_TERMS = {
  patrimonio_neto: {
    label: 'Patrimonio neto',
    def: 'Total de tus activos (cuentas, inversiones) menos tus deudas.',
  },
  flujo_neto: {
    label: 'Flujo neto',
    def: 'Ingresos del mes menos egresos. Positivo = ahorro; negativo = déficit.',
  },
  tasa_ahorro: {
    label: 'Tasa de ahorro',
    def: 'Porcentaje de tus ingresos que estás guardando cada mes.',
  },
  fondo_emergencia: {
    label: 'Fondo de emergencia',
    def: 'Meses de gastos que puedes cubrir con tu efectivo disponible ahora mismo.',
  },
  swr: {
    label: 'SWR — Tasa de retiro seguro',
    def: '% del fondo que puedes retirar cada año en el retiro sin que el capital se agote.',
  },
  cagr: {
    label: 'CAGR — Crecimiento anual compuesto',
    def: 'Tasa de crecimiento promedio del patrimonio si hubiera crecido de forma constante cada año.',
  },
  racha: {
    label: 'Racha patrimonial',
    def: 'Meses consecutivos que tu patrimonio lleva subiendo (o bajando) al cierre del período seleccionado.',
  },
  aceleracion: {
    label: 'Aceleración patrimonial',
    def: 'Compara el crecimiento de los últimos 12 meses vs. los 12 anteriores. Positiva = estás creciendo más rápido que antes.',
  },
  traspaso: {
    label: 'Traspaso',
    def: 'Movimiento de capital entre instrumentos propios. No cuenta como ganancia ni pérdida.',
  },
  retorno_capital: {
    label: 'Retorno sobre capital propio',
    def: 'Ganancias netas divididas entre el capital que tú pusiste (aportes menos retiros). Mide cuánto rinde tu dinero real.',
  },
  renta_fija_pago: {
    label: 'Renta fija — pago periódico',
    def: 'El instrumento paga ganancias periódicamente. Tu capital original no cambia.',
  },
  renta_fija_cap: {
    label: 'Renta fija — capitalización',
    def: 'Las ganancias se reinvierten automáticamente y el capital crece. No recibes pagos periódicos.',
  },
  renta_variable: {
    label: 'Renta variable',
    def: 'El valor del instrumento fluctúa con el mercado. Se registra el valor actual y el sistema calcula la ganancia.',
  },
  tea: {
    label: 'TEA — Tasa Efectiva Anual',
    def: 'Costo real anual de un préstamo, incluyendo la capitalización de intereses. Sirve para comparar distintos préstamos entre sí.',
  },
  amortizacion_francesa: {
    label: 'Amortización francesa',
    def: 'Sistema de pago con cuota fija mensual. Al inicio pagas más interés; al final, más capital.',
  },
  tc: {
    label: 'Tipo de cambio',
    def: 'Precio del dólar en soles. Compra = lo que recibes al vender tus dólares. Venta = lo que pagas al comprarlos.',
  },
  cts: {
    label: 'CTS — Compensación por Tiempo de Servicios',
    def: 'Beneficio laboral equivalente a medio sueldo, depositado dos veces al año (mayo y noviembre).',
  },
  gratificacion: {
    label: 'Gratificación',
    def: 'Bono equivalente a un sueldo completo, pagado en julio (Fiestas Patrias) y diciembre (Navidad).',
  },
  afp: {
    label: 'AFP — Administradora de Fondos de Pensiones',
    def: 'Descuento mensual del sueldo que va a tu cuenta individual de pensiones. Tú eres dueño del fondo acumulado.',
  },
  onp: {
    label: 'ONP — Oficina de Normalización Previsional',
    def: 'Sistema de pensiones estatal, alternativo a la AFP. Descuento fijo del 13% del sueldo.',
  },
  essalud: {
    label: 'EsSalud',
    def: 'Seguro de salud pagado por el empleador (9% de tu sueldo). Te da acceso a hospitales y clínicas EsSalud.',
  },
  impuesto_5ta: {
    label: 'Impuesto 5ta Categoría',
    def: 'Retención mensual del impuesto a la renta por trabajo en planilla. Se descuenta directo del sueldo.',
  },
  patrimonio_no_invertido: {
    label: 'Patrimonio no invertido',
    def: 'Cuentas de Patrimonio que no están vinculadas a ningún instrumento de simulación (ej. efectivo, inmuebles).',
  },
  salto_carrera: {
    label: 'Salto de carrera',
    def: 'Cambio proyectado de sueldo en un año futuro, dentro del escenario de simulación.',
  },
  proporcion_propia: {
    label: 'Proporción propia',
    def: 'Porcentaje de un gasto compartido (ej. con pareja) que corresponde a tu parte.',
  },
} as const

export type TermKey = keyof typeof FINANCIAL_TERMS
