import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'

const STEPS = [
  {
    emoji: '👋',
    title: 'Bienvenido a MyFinance',
    description: 'Tu sistema financiero personal. Aquí controlas todo tu dinero — patrimonio, gastos, inversiones — y proyectas tu futuro en un solo lugar.',
    detail: 'Este tour rápido te explica cómo está organizado el sistema.',
  },
  {
    emoji: '📊',
    title: 'Tracking — tu realidad financiera',
    description: 'Registra tus cuentas de ahorro e inversión en Patrimonio, lleva tu flujo de caja mensual, y controla suscripciones, deudas y gastos familiares.',
    detail: 'Empieza aquí: es la base de todo el sistema.',
  },
  {
    emoji: '📈',
    title: 'Análisis — entiende tu evolución',
    description: 'Visualiza cómo crece tu patrimonio mes a mes, revisa el rendimiento de tus inversiones y analiza tus finanzas con gráficos claros.',
    detail: 'El módulo de Historial captura una foto mensual de tu balance automáticamente.',
  },
  {
    emoji: '🔮',
    title: 'Simulación — proyecta tu futuro',
    description: 'Crea escenarios de retiro, proyecta tu patrimonio a 25+ años y simula eventos de vida como compra de casa, educación o negocios.',
    detail: 'Cuando tengas tus cuentas y flujo de caja listos, la simulación cobra vida.',
  },
  {
    emoji: '🚀',
    title: '¿Por dónde empezar?',
    description: 'Te recomendamos comenzar agregando tus cuentas e inversiones en Patrimonio. Con eso, el resto del sistema empieza a tener sentido.',
    detail: null,
  },
]

interface Props {
  onComplete: () => void
}

export default function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  function finish(to: string) {
    onComplete()
    navigate(to)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-8 flex flex-col"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}
      >
        {/* Botón cerrar */}
        <button
          onClick={() => finish('/')}
          className="absolute top-4 right-4 p-1.5 rounded-lg"
          style={{ color: 'var(--color-muted)' }}
          title="Saltar tour"
        >
          <X size={16} />
        </button>

        {/* Contenido */}
        <div className="flex flex-col items-center text-center flex-1 gap-4 py-2">
          <div className="text-6xl select-none">{current.emoji}</div>

          <h2 className="text-xl font-bold mt-2" style={{ color: 'var(--color-texto)' }}>
            {current.title}
          </h2>

          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {current.description}
          </p>

          {current.detail && (
            <p
              className="text-xs px-4 py-2.5 rounded-xl w-full text-left"
              style={{ background: 'var(--color-fondo)', color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}
            >
              💡 {current.detail}
            </p>
          )}
        </div>

        {/* Paso final: botones de acción */}
        {isLast && (
          <div className="flex flex-col gap-2 mt-6">
            <button
              onClick={() => finish('/patrimonio')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--color-acento)' }}
            >
              Ir a Patrimonio →
            </button>
            <button
              onClick={() => finish('/')}
              className="w-full py-2 rounded-xl text-sm"
              style={{ color: 'var(--color-muted)' }}
            >
              Explorar por mi cuenta
            </button>
          </div>
        )}

        {/* Navegación */}
        {!isLast && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
              style={{ color: step === 0 ? 'transparent' : 'var(--color-muted)', border: step === 0 ? '1px solid transparent' : '1px solid var(--color-borde)' }}
            >
              <ChevronLeft size={14} /> Anterior
            </button>

            {/* Dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === step ? 20 : 6,
                    height: 6,
                    background: i === step ? 'var(--color-acento)' : 'var(--color-borde)',
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--color-acento)' }}
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Dots en el paso final */}
        {isLast && (
          <div className="flex justify-center gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  background: i === step ? 'var(--color-acento)' : 'var(--color-borde)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
