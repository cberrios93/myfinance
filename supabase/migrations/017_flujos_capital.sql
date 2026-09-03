-- Flujos de capital externo: aportes y retiros reales desde/hacia cuenta bancaria personal
CREATE TABLE IF NOT EXISTS flujos_capital (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fecha date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('aporte', 'retiro')),
  monto numeric NOT NULL CHECK (monto > 0),
  moneda text NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
  nota text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE flujos_capital ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flujos_capital_own" ON flujos_capital FOR ALL USING (auth.uid() = user_id);
