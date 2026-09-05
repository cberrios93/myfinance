import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LogOut, ShieldAlert } from 'lucide-react'
import { useAuth } from './auth/AuthContext'
import { ScenarioProvider } from './data/ScenarioContext'
import { PatrimonyProvider } from './data/PatrimonyContext'
import { FinanceDataProvider } from './data/FinanceDataContext'
import AppLayout from './components/Layout/AppLayout'
import UndoToast from './components/UndoToast'
import LoginPage from './modules/Auth/LoginPage'
import AcceptInvite from './modules/Auth/AcceptInvite'
import Dashboard from './modules/Dashboard/Dashboard'
import Parameters from './modules/Parameters/Parameters'
import Instruments from './modules/Instruments/Instruments'
import Movements from './modules/Movements/Movements'
import LifeEvents from './modules/LifeEvents/LifeEvents'
import Career from './modules/Career/Career'
import Scenarios from './modules/Scenarios/Scenarios'
import Projection from './modules/Projection/Projection'
import ExportImport from './modules/ExportImport/ExportImport'
import Settings from './modules/Settings/Settings'
import UserManagement from './modules/Admin/UserManagement'
import Patrimony from './modules/Patrimony/Patrimony'
import FinanceHistory from './modules/History/FinanceHistory'
import CashFlow from './modules/CashFlow/CashFlow'
import Returns from './modules/Returns/Returns'
import Paycheck from './modules/Paycheck/Paycheck'
import Subscriptions from './modules/Subscriptions/Subscriptions'
import Tax5th from './modules/Tax5th/Tax5th'
import FamilyExpenses from './modules/FamilyExpenses/FamilyExpenses'
import Debts from './modules/Debts/Debts'
import Notes from './modules/Notes/Notes'
import Analytics from './modules/Analytics/Analytics'
import OnboardingWizard from './modules/Onboarding/OnboardingWizard'
import CapitalFlows from './modules/CapitalFlows/CapitalFlows'

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-fondo)' }}>
      <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Cargando…</div>
    </div>
  )
}

function BlockedScreen({ reason, onSignOut }: { reason: string | null; onSignOut: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-fondo)' }}>
      <div className="text-center space-y-4 max-w-sm">
        <ShieldAlert size={48} style={{ color: '#E24C4C', margin: '0 auto' }} />
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-texto)' }}>Cuenta bloqueada</h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {reason ?? 'Tu cuenta ha sido suspendida. Contacta al administrador para más información.'}
        </p>
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#E24C4C' }}
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function ProtectedRoutes() {
  const { session, loading, userStatus, blockReason, signOut } = useAuth()

  // Onboarding: mostrar wizard una sola vez por usuario
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const userId = session?.user?.id
    if (!userId) return false
    return !localStorage.getItem(`onboarding_v1_${userId}`)
  })

  function completeOnboarding() {
    const userId = session?.user?.id
    if (userId) localStorage.setItem(`onboarding_v1_${userId}`, '1')
    setShowOnboarding(false)
  }

  // Detecta si el usuario llegó desde un link de invitación (hash type=invite)
  const [isInvitePending] = useState(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : '')
    const isInvite = params.get('type') === 'invite'
    if (isInvite) history.replaceState(null, '', window.location.pathname)
    return isInvite
  })

  if (loading) return <Loading />
  if (!session) return <Navigate to="/login" replace />

  // Muestra formulario de contraseña si es invite o cuenta pendiente
  if (isInvitePending || userStatus === 'pending') {
    return <AcceptInvite onComplete={() => window.location.reload()} />
  }

  if (userStatus === 'blocked') {
    return <BlockedScreen reason={blockReason} onSignOut={signOut} />
  }

  return (
    <ScenarioProvider>
      <PatrimonyProvider>
        <FinanceDataProvider>
          {showOnboarding && <OnboardingWizard onComplete={completeOnboarding} />}
          <UndoToast />
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/patrimonio" element={<Patrimony />} />
              <Route path="/historial" element={<FinanceHistory />} />
              <Route path="/flujo-caja" element={<CashFlow />} />
              <Route path="/rendimientos" element={<Returns />} />
              <Route path="/flujos-capital" element={<CapitalFlows />} />
              <Route path="/haberes" element={<Paycheck />} />
              <Route path="/suscripciones" element={<Subscriptions />} />
              <Route path="/gastos-familia" element={<FamilyExpenses />} />
              <Route path="/deudas" element={<Debts />} />
              <Route path="/notas" element={<Notes />} />
              <Route path="/analisis" element={<Analytics />} />
              <Route path="/impuesto-5ta" element={<Tax5th />} />
              <Route path="/parametros" element={<Parameters />} />
              <Route path="/instrumentos" element={<Instruments />} />
              <Route path="/movimientos" element={<Movements />} />
              <Route path="/eventos" element={<LifeEvents />} />
              <Route path="/carrera" element={<Career />} />
              <Route path="/proyeccion" element={<Projection />} />
              <Route path="/escenarios" element={<Scenarios />} />
              <Route path="/exportar" element={<ExportImport />} />
              <Route path="/configuracion" element={<Settings />} />
              <Route path="/admin/usuarios" element={<UserManagement />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </FinanceDataProvider>
      </PatrimonyProvider>
    </ScenarioProvider>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <Loading />

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}
