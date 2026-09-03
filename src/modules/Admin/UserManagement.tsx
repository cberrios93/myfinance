import { useState, useEffect, useCallback } from 'react'
import { UserPlus, RefreshCw, CheckCircle, AlertTriangle, Trash2, ShieldOff, ShieldCheck, Clock, X } from 'lucide-react'
import { supabase } from '../../lib/supabase/client'
import { useAuth } from '../../auth/AuthContext'

interface UserProfile {
  id: string
  user_id: string
  email: string
  role: 'admin' | 'guest'
  status: 'active' | 'blocked' | 'pending'
  block_reason: string | null
  created_at: string
}

type ActionStatus = { ok: boolean; msg: string } | null

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function callApi(endpoint: string, body: object, token: string) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Error en la operación')
  return json
}

async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: UserProfile['status'] }) {
  const map = {
    active: { label: 'Activo', color: '#00C9A7', bg: '#00C9A715', icon: <CheckCircle size={11} /> },
    blocked: { label: 'Bloqueado', color: '#E24C4C', bg: '#E24C4C15', icon: <ShieldOff size={11} /> },
    pending: { label: 'Pendiente', color: '#F5A623', bg: '#F5A62315', icon: <Clock size={11} /> },
  }
  const s = map[status]
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
      {s.icon} {s.label}
    </span>
  )
}

// ─── Block modal ──────────────────────────────────────────────────────────────

function BlockModal({ user, onConfirm, onCancel }: {
  user: UserProfile
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: 'var(--color-texto)' }}>Bloquear usuario</h3>
          <button onClick={onCancel} style={{ color: 'var(--color-muted)' }}><X size={18} /></button>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          El usuario <strong style={{ color: 'var(--color-texto)' }}>{user.email}</strong> no podrá acceder al sistema y verá el mensaje que escribas abajo.
        </p>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
            Motivo del bloqueo (se muestra al usuario)
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ej: Cuenta suspendida por falta de pago. Contacta a soporte@myfinance.com para reactivarla."
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }}
            autoFocus
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#E24C4C' }}
          >
            Bloquear
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete modal ─────────────────────────────────────────────────────────────

function DeleteModal({ user, onConfirm, onCancel }: {
  user: UserProfile
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: 'var(--color-texto)' }}>Eliminar usuario</h3>
          <button onClick={onCancel} style={{ color: 'var(--color-muted)' }}><X size={18} /></button>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Estás a punto de eliminar permanentemente la cuenta de{' '}
          <strong style={{ color: 'var(--color-texto)' }}>{user.email}</strong>. Esta acción no se puede deshacer y borrará todos sus datos.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#E24C4C' }}
          >
            Eliminar permanentemente
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function UserManagement() {
  const { userRole, user } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [actionStatus, setActionStatus] = useState<ActionStatus>(null)
  const [blockTarget, setBlockTarget] = useState<UserProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  if (userRole !== 'admin') {
    return (
      <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>
        No tienes permiso para ver esta página.
      </div>
    )
  }

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error && data) setUsers(data as UserProfile[])
    setLoadingUsers(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  function showStatus(ok: boolean, msg: string) {
    setActionStatus({ ok, msg })
    setTimeout(() => setActionStatus(null), 4000)
  }

  async function handleInvite() {
    if (!email.trim()) return
    setInviting(true)
    try {
      const token = await getToken()
      await callApi('/api/invite-user', { email: email.trim() }, token)
      showStatus(true, `Invitación enviada a ${email.trim()}`)
      setEmail('')
      await loadUsers()
    } catch (err: unknown) {
      showStatus(false, err instanceof Error ? err.message : 'Error al invitar')
    } finally {
      setInviting(false)
    }
  }

  async function handleBlock(target: UserProfile, reason: string) {
    setBlockTarget(null)
    setActionLoading(target.user_id)
    try {
      const token = await getToken()
      await callApi('/api/block-user', { targetUserId: target.user_id, action: 'block', blockReason: reason || null }, token)
      showStatus(true, `${target.email} bloqueado`)
      await loadUsers()
    } catch (err: unknown) {
      showStatus(false, err instanceof Error ? err.message : 'Error al bloquear')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleUnblock(target: UserProfile) {
    setActionLoading(target.user_id)
    try {
      const token = await getToken()
      await callApi('/api/block-user', { targetUserId: target.user_id, action: 'unblock' }, token)
      showStatus(true, `${target.email} desbloqueado`)
      await loadUsers()
    } catch (err: unknown) {
      showStatus(false, err instanceof Error ? err.message : 'Error al desbloquear')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(target: UserProfile) {
    setDeleteTarget(null)
    setActionLoading(target.user_id)
    try {
      const token = await getToken()
      await callApi('/api/delete-user', { targetUserId: target.user_id }, token)
      showStatus(true, `${target.email} eliminado`)
      await loadUsers()
    } catch (err: unknown) {
      showStatus(false, err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setActionLoading(null)
    }
  }

  const active = users.filter(u => u.status === 'active').length
  const pending = users.filter(u => u.status === 'pending').length
  const blocked = users.filter(u => u.status === 'blocked').length

  return (
    <div className="max-w-4xl space-y-6">
      {/* Modales */}
      {blockTarget && (
        <BlockModal
          user={blockTarget}
          onConfirm={reason => handleBlock(blockTarget, reason)}
          onCancel={() => setBlockTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Gestión de Usuarios</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Invita, bloquea y gestiona el acceso al sistema. Cada usuario tiene datos independientes.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Activos', value: active, color: '#00C9A7' },
          { label: 'Pendientes', value: pending, color: '#F5A623' },
          { label: 'Bloqueados', value: blocked, color: '#E24C4C' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Feedback */}
      {actionStatus && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{
            background: actionStatus.ok ? '#00C9A715' : '#E24C4C15',
            color: actionStatus.ok ? '#00C9A7' : '#E24C4C',
            border: `1px solid ${actionStatus.ok ? '#00C9A730' : '#E24C4C30'}`,
          }}
        >
          {actionStatus.ok ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {actionStatus.msg}
        </div>
      )}

      {/* Invitar */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Invitar usuario</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
            El usuario recibirá un correo con un enlace para crear su contraseña y acceder al sistema.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            placeholder="correo@ejemplo.com"
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }}
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !email.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--color-acento)' }}
          >
            <UserPlus size={15} />
            {inviting ? 'Enviando…' : 'Invitar'}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-borde)' }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-borde)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
            Usuarios ({users.length})
          </h2>
          <button onClick={loadUsers} disabled={loadingUsers} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--color-muted)' }}>
            <RefreshCw size={14} className={loadingUsers ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingUsers ? (
          <div className="px-5 py-10 text-sm text-center" style={{ color: 'var(--color-muted)' }}>Cargando…</div>
        ) : users.length === 0 ? (
          <div className="px-5 py-10 text-sm text-center" style={{ color: 'var(--color-muted)' }}>No hay usuarios registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr style={{ background: 'var(--color-fondo)', color: 'var(--color-muted)' }}>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wide">Email</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wide">Rol</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wide">Estado</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wide">Desde</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isMe = u.user_id === user?.id
                  const busy = actionLoading === u.user_id
                  return (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--color-borde)', background: 'var(--color-card)' }}>
                      <td className="px-5 py-3" style={{ color: 'var(--color-texto)' }}>
                        <span>{u.email}</span>
                        {isMe && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--color-acento)', color: '#fff' }}>tú</span>
                        )}
                        {u.block_reason && (
                          <p className="text-xs mt-0.5" style={{ color: '#E24C4C' }}>{u.block_reason}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: u.role === 'admin' ? '#F5A62320' : 'var(--color-fondo)',
                            color: u.role === 'admin' ? '#F5A623' : 'var(--color-muted)',
                          }}
                        >
                          {u.role === 'admin' ? 'Admin' : 'Invitado'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                        {fmt(u.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        {!isMe && (
                          <div className="flex items-center gap-1 justify-end">
                            {u.status === 'blocked' ? (
                              <button
                                onClick={() => handleUnblock(u)}
                                disabled={busy}
                                title="Desbloquear"
                                className="p-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
                                style={{ background: '#00C9A715', color: '#00C9A7' }}
                              >
                                <ShieldCheck size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => setBlockTarget(u)}
                                disabled={busy}
                                title="Bloquear"
                                className="p-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
                                style={{ background: '#F5A62315', color: '#F5A623' }}
                              >
                                <ShieldOff size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteTarget(u)}
                              disabled={busy}
                              title="Eliminar"
                              className="p-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
                              style={{ background: '#E24C4C15', color: '#E24C4C' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
