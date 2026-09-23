-- Módulo Prestamype: DPFs y préstamos con garantía hipotecaria
CREATE TABLE IF NOT EXISTS prestamype_instrumentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('dpf', 'hipotecario')),
  nombre text NOT NULL,
  capital_invertido numeric NOT NULL CHECK (capital_invertido > 0),
  premio_subasta numeric NOT NULL DEFAULT 0 CHECK (premio_subasta >= 0),
  tasa_mensual numeric NOT NULL CHECK (tasa_mensual > 0),
  tasa_efectiva_anual numeric,
  plazo_meses integer,
  frecuencia_pago text CHECK (frecuencia_pago IN ('mensual', 'trimestral', 'semestral', 'al_vencimiento')),
  fecha_inicio date NOT NULL,
  fecha_vencimiento date,
  valor_garantia numeric,
  moneda_garantia text DEFAULT 'USD' CHECK (moneda_garantia IN ('PEN', 'USD')),
  ltv numeric,
  tipo_propiedad text,
  ubicacion text,
  nivel_riesgo text CHECK (nivel_riesgo IN ('bajo', 'medio', 'alto')),
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cancelado', 'mora')),
  notas text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prestamype_cuotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrumento_id uuid REFERENCES prestamype_instrumentos(id) ON DELETE CASCADE NOT NULL,
  numero_cuota integer NOT NULL,
  fecha_pago date NOT NULL,
  capital_pendiente numeric NOT NULL,
  interes numeric NOT NULL,
  amortizacion numeric NOT NULL DEFAULT 0,
  cuota_total numeric NOT NULL,
  pagado boolean NOT NULL DEFAULT false,
  fecha_pago_real date,
  rendimiento_id uuid,
  creado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE(instrumento_id, numero_cuota)
);

ALTER TABLE prestamype_instrumentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prestamype_instrumentos_own" ON prestamype_instrumentos
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE prestamype_cuotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prestamype_cuotas_own" ON prestamype_cuotas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM prestamype_instrumentos pi
      WHERE pi.id = prestamype_cuotas.instrumento_id
        AND pi.user_id = auth.uid()
    )
  );
