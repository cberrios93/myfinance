import { useState, useEffect } from 'react'
import { UserPlus, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase/client'
import { useAuth } from '../../auth/AuthContext'

interface UserProfile {
  id: string
  user_id: string
  email: string
  role: 'admin' | 'guest'
  created_at: string
}

type Status = { ok: true; msg: string } | { ok: false; msg: string } | null

export default function UserManagement() {
  const { userRole, user } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  if (userRole !== 'admin') {
    return (
      <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>
        No tienes permiso para ver esta página.
      </div>
    )
  }

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error && data) setUsers(data as UserProfile[])
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function handleInvite() {
    if (!email.trim()) return
    setInviting(true)
    setStatus(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const res = await fetch('/api/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: email.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al invitar')
      setStatus({ ok: true, msg: `Invitación enviada a ${email.trim()}` })
      setEmail('')
      await loadUsers()
    } catch (err: any) {
      setStatus({ ok: false, msg: err.message ?? 'Error desconocido' })
    } finally {
      setInviting(false)
    }
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Gestión de Usuarios</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Invita a nuevos usuarios. Cada uno tendrá sus propios datos independientes.
        </p>
      </div>

      {/* Invitar nuevo usuario */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Invitar usuario</h2>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          El usuario recibirá un correo con un enlace para establecer su contraseña y acceder al sistema.
        </p>
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
        {status && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{
              background: status.ok ? '#10b98115' : '#ef444415',
              color: status.ok ? '#10b981' : '#ef4444',
            }}
          >
            {status.ok ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {status.msg}
          </div>
        )}
      </div>

      {/* Lista de usuarios */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-borde)' }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-borde)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
            Usuarios ({users.length})
          </h2>
          <button onClick={loadUsers} disabled={loading} className="hover:opacity-70" style={{ color: 'var(--color-muted)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {loading ? (
          <div className="px-5 py-8 text-sm text-center" style={{ color: 'var(--color-muted)' }}>Cargando…</div>
        ) : users.length === 0 ? (
          <div className="px-5 py-8 text-sm text-center" style={{ color: 'var(--color-muted)' }}>No hay usuarios.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-fondo)', color: 'var(--color-muted)' }}>
                <th className="text-left px-5 py-2 text-xs font-semibold uppercase tracking-wide">Email</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide">Rol</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide">Desde</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--color-borde)', background: 'var(--color-card)' }}>
                  <td className="px-5 py-3" style={{ color: 'var(--color-texto)' }}>
                    {u.email}
                    {u.user_id === user?.id && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-acento)', color: '#fff' }}>tú</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: u.role === 'admin' ? '#f59e0b20' : 'var(--color-fondo)',
                        color: u.role === 'admin' ? '#f59e0b' : 'var(--color-muted)',
                      }}
                    >
                      {u.role === 'admin' ? 'Admin' : 'Invitado'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                    {fmt(u.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        Para revocar acceso o cambiar roles, hazlo desde el panel de Supabase → Authentication → Users.
      </p>
    </div>
  )
}
