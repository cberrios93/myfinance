import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, CheckCheck, Activity, Trophy, AlertTriangle } from 'lucide-react'
import { useNotificacionesCtx } from '../../context/NotificacionesContext'
import type { Notificacion } from '../../lib/supabase/notificaciones'
import { useAlertas } from './useAlertas'

type Tab = 'actividad' | 'alertas' | 'logros'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `hace ${d}d`
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

const CATEGORIA_ICON: Record<string, string> = {
  rendimiento: '📈',
  evento_vida: '🗓',
  instrumento: '💼',
  escenario: '🔀',
  impuesto: '🧾',
  flujo_caja: '💸',
  logro: '🏆',
}

function NotifRow({ n, onRead }: { n: Notificacion; onRead: (id: string) => void }) {
  const navigate = useNavigate()
  const icon = CATEGORIA_ICON[n.categoria] ?? '🔔'

  function handleClick() {
    if (!n.leida) onRead(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:opacity-80"
      style={{
        background: n.leida ? 'transparent' : 'color-mix(in srgb, var(--color-acento) 8%, transparent)',
        borderBottom: '1px solid var(--color-borde)',
      }}
    >
      <span className="text-xl shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-texto)' }}>
          {n.titulo}
        </p>
        {n.descripcion && (
          <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--color-muted)' }}>
            {n.descripcion}
          </p>
        )}
        <p className="text-xs mt-1" style={{ color: 'var(--color-muted)', opacity: 0.7 }}>
          {timeAgo(n.creadoEn)}
        </p>
      </div>
      {!n.leida && (
        <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--color-acento)' }} />
      )}
    </button>
  )
}

function AlertaRow({ alerta }: { alerta: { emoji: string; titulo: string; descripcion?: string; link?: string } }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => alerta.link && navigate(alerta.link)}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:opacity-80"
      style={{ borderBottom: '1px solid var(--color-borde)' }}
    >
      <span className="text-xl shrink-0 mt-0.5">{alerta.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-texto)' }}>{alerta.titulo}</p>
        {alerta.descripcion && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{alerta.descripcion}</p>
        )}
      </div>
    </button>
  )
}

export function NotificacionesPanel({ placement = 'header' }: { placement?: 'header' | 'sidebar' }) {
  const { notificaciones, noLeidas, marcarUnaLeida, marcarTodas } = useNotificacionesCtx()
  const alertas = useAlertas()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('actividad')
  const panelRef = useRef<HTMLDivElement>(null)

  const actividad = notificaciones.filter(n => n.tipo === 'actividad')
  const logros    = notificaciones.filter(n => n.tipo === 'logro')

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const badge = noLeidas > 0

  return (
    <div ref={panelRef} className="relative">
      {/* Campana */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg transition-colors hover:opacity-70"
        style={{ color: 'var(--color-muted)' }}
        title="Notificaciones"
      >
        <Bell size={18} />
        {badge && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white font-bold"
            style={{ background: '#E24C4C', fontSize: '10px', lineHeight: 1, padding: '0 4px' }}
          >
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* Panel overlay */}
      {open && (
        <div
          className="absolute w-80 rounded-xl shadow-2xl overflow-hidden z-50"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-borde)',
            ...(placement === 'sidebar'
              ? { bottom: 'calc(100% + 8px)', left: 0 }
              : { top: 'calc(100% + 8px)', right: 0 }
            ),
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-borde)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>Notificaciones</h3>
            <div className="flex items-center gap-1">
              {noLeidas > 0 && (
                <button
                  onClick={marcarTodas}
                  className="p-1.5 rounded-lg hover:opacity-70 text-xs flex items-center gap-1"
                  style={{ color: 'var(--color-acento)' }}
                  title="Marcar todas como leídas"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--color-muted)' }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex" style={{ borderBottom: '1px solid var(--color-borde)' }}>
            {([
              { id: 'actividad' as Tab, label: 'Actividad', icon: Activity, count: notificaciones.filter(n => n.tipo === 'actividad' && !n.leida).length },
              { id: 'alertas'   as Tab, label: 'Alertas',   icon: AlertTriangle, count: alertas.length },
              { id: 'logros'    as Tab, label: 'Logros',    icon: Trophy, count: 0 },
            ] as const).map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors"
                style={{
                  color: tab === id ? 'var(--color-acento)' : 'var(--color-muted)',
                  borderBottom: tab === id ? '2px solid var(--color-acento)' : '2px solid transparent',
                }}
              >
                <Icon size={12} />
                {label}
                {count > 0 && (
                  <span className="text-white rounded-full px-1" style={{ background: id === 'alertas' ? '#F59E0B' : 'var(--color-acento)', fontSize: '9px' }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Contenido */}
          <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
            {tab === 'actividad' && (
              actividad.length === 0
                ? <Empty texto="Sin actividad registrada aún" />
                : actividad.map(n => <NotifRow key={n.id} n={n} onRead={marcarUnaLeida} />)
            )}
            {tab === 'alertas' && (
              alertas.length === 0
                ? <Empty texto="Sin alertas activas" emoji="✅" />
                : alertas.map((a, i) => <AlertaRow key={i} alerta={a} />)
            )}
            {tab === 'logros' && (
              logros.length === 0
                ? <Empty texto="Aún no hay logros registrados" emoji="🎯" />
                : logros.map(n => <NotifRow key={n.id} n={n} onRead={marcarUnaLeida} />)
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Empty({ texto, emoji = '🔔' }: { texto: string; emoji?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <span className="text-3xl">{emoji}</span>
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{texto}</p>
    </div>
  )
}
