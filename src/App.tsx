import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { ScenarioProvider } from './data/ScenarioContext'
import { PatrimonyProvider } from './data/PatrimonyContext'
import { FinanceDataProvider } from './data/FinanceDataContext'
import AppLayout from './components/Layout/AppLayout'
import LoginPage from './modules/Auth/LoginPage'
import Dashboard from './modules/Dashboard/Dashboard'
import Parameters from './modules/Parameters/Parameters'
import Instruments from './modules/Instruments/Instruments'
import Movements from './modules/Movements/Movements'
import LifeEvents from './modules/LifeEvents/LifeEvents'
import Career from './modules/Career/Career'
import Scenarios from './modules/Scenarios/Scenarios'
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

function ProtectedRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-fondo)' }}>
        <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Cargando…</div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return (
    <ScenarioProvider>
      <PatrimonyProvider>
        <FinanceDataProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/patrimonio" element={<Patrimony />} />
              <Route path="/historial" element={<FinanceHistory />} />
              <Route path="/flujo-caja" element={<CashFlow />} />
              <Route path="/rendimientos" element={<Returns />} />
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-fondo)' }}>
        <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Cargando…</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}
