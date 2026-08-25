import { useState, useRef, useEffect, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Settings2, Landmark, ArrowLeftRight,
  CalendarClock, TrendingUp, GitBranch, FileDown, FileUp, Settings, LogOut, Menu, X,
  Wallet, History, ArrowRightLeft, BarChart3, Receipt, CreditCard, Calculator,
  Users, AlertCircle, Lightbulb, ChevronRight
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useScenario } from '../../data/ScenarioContext'

type NavSection = { section: string; items: { to: string; label: string; icon: React.ElementType }[] }

const NAV_SECTIONS: NavSection[] = [
  {
    section: '',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Tracking',
    items: [
      { to: '/patrimonio', label: 'Patrimonio', icon: Wallet },
      { to: '/historial', label: 'Historial', icon: History },
      { to: '/flujo-caja', label: 'Flujo de Caja', icon: ArrowRightLeft },
      { to: '/rendimientos', label: 'Rendimientos', icon: BarChart3 },
      { to: '/haberes', label: 'Haberes', icon: Receipt },
      { to: '/suscripciones', label: 'Suscripciones', icon: CreditCard },
      { to: '/gastos-familia', label: 'Gastos Familia', icon: Users },
      { to: '/deudas', label: 'Deudas', icon: AlertCircle },
      { to: '/notas', label: 'Ideas & Notas', icon: Lightbulb },
    ],
  },
  {
    section: 'Calculadoras',
    items: [
      { to: '/impuesto-5ta', label: 'Impuesto 5ta', icon: Calculator },
    ],
  },
  {
    section: 'Simulación',
    items: [
      { to: '/parametros', label: 'Parámetros', icon: Settings2 },
      { to: '/instrumentos', label: 'Instrumentos', icon: Landmark },
      { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
      { to: '/eventos', label: 'Eventos de vida', icon: CalendarClock },
      { to: '/carrera', label: 'Carrera y aportes', icon: TrendingUp },
      { to: '/escenarios', label: 'Escenarios', icon: GitBranch },
    ],
  },
  {
    section: 'Sistema',
    items: [
      { to: '/exportar', label: 'Exportar Excel', icon: FileDown },
      { to: '/importar', label: 'Importar Excel', icon: FileUp },
      { to: '/configuracion', label: 'Configuración', icon: Settings },
    ],
  },
]

function CollapsibleSection({ section, items, onNavClick }: {
  section: string
  items: { to: string; label: string; icon: React.ElementType }[]
  onNavClick: () => void
}) {
  const location = useLocation()
  const hasActiveChild = items.some(item => item.to === location.pathname || (item.to !== '/' && location.pathname.startsWith(item.to)))
  const [open, setOpen] = useState(hasActiveChild)
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(hasActiveChild ? undefined : 0)

  useEffect(() => {
    if (!innerRef.current) return
    if (open) {
      const h = innerRef.current.scrollHeight
      setHeight(h)
      const t = setTimeout(() => setHeight(undefined), 280)
      return () => clearTimeout(t)
    } else {
      setHeight(innerRef.current.scrollHeight)
      requestAnimationFrame(() => requestAnimationFrame(() => setHeight(0)))
    }
  }, [open])

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center w-full px-4 py-2 gap-2 text-xs font-semibold uppercase tracking-wide select-none group"
        style={{ color: open ? 'var(--color-texto)' : 'var(--color-muted)' }}
      >
        <ChevronRight
          size={12}
          style={{
            transition: 'transform 240ms cubic-bezier(0.4, 0, 0.2, 1)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
        {section}
      </button>
      <div
        ref={innerRef}
        style={{
          overflow: 'hidden',
          height: height === undefined ? 'auto' : height,
          transition: 'height 240ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {items.map(({ to, label, icon: Icon }, i) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 mx-2 my-0.5 rounded-lg text-sm transition-colors ${isActive ? 'font-medium' : ''}`
            }
            style={({ isActive }) => ({
              background: isActive ? 'var(--color-acento)' : 'transparent',
              color: isActive ? '#fff' : 'var(--color-muted)',
              transitionDelay: open ? `${i * 25}ms` : '0ms',
              opacity: open ? 1 : 0,
              transform: open ? 'translateX(0)' : 'translateX(-6px)',
              transition: 'background 150ms, color 150ms, opacity 200ms, transform 200ms',
            })}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth()
  const { escenarioActivo, escenarios, seleccionarEscenario } = useScenario()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-fondo)', fontFamily: 'var(--font-family)' }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--color-card)', borderRight: '1px solid var(--color-borde)' }}
      >
        <div className="flex items-center gap-2 px-4 py-4 border-b" style={{ borderColor: 'var(--color-borde)' }}>
          <span className="text-xl">📈</span>
          <span className="font-bold text-sm" style={{ color: 'var(--color-texto)' }}>MyFinance</span>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)} style={{ color: 'var(--color-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Selector de escenario */}
        {escenarios.length > 0 && (
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--color-borde)' }}>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Escenario activo</label>
            <select
              value={escenarioActivo?.id ?? ''}
              onChange={e => seleccionarEscenario(e.target.value)}
              className="w-full text-xs px-2 py-1 rounded"
              style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }}
            >
              {escenarios.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-2 space-y-1">
          {NAV_SECTIONS.map(({ section, items }) =>
            section === '' ? (
              items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${isActive ? 'font-medium' : ''}`
                  }
                  style={({ isActive }) => ({
                    background: isActive ? 'var(--color-acento)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--color-muted)',
                  })}
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))
            ) : (
              <CollapsibleSection
                key={section}
                section={section}
                items={items}
                onNavClick={() => setSidebarOpen(false)}
              />
            )
          )}
        </nav>

        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-borde)' }}>
          <p className="text-xs truncate mb-2" style={{ color: 'var(--color-muted)' }}>{user?.email}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm w-full px-2 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--color-muted)' }}
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 lg:hidden border-b" style={{ background: 'var(--color-card)', borderColor: 'var(--color-borde)' }}>
          <button onClick={() => setSidebarOpen(true)} style={{ color: 'var(--color-muted)' }}>
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm" style={{ color: 'var(--color-texto)' }}>MyFinance</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ color: 'var(--color-texto)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
