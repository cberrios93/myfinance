import { useState } from 'react'
import { Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase/client'

interface Props {
  onComplete: () => void
}

const RULES = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Al menos una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Al menos un número', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Al menos un carácter especial (!@#$%...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export default function AcceptInvite({ onComplete }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const rules = RULES.map(r => ({ ...r, ok: r.test(password) }))
  const passwordsMatch = password === confirm && confirm.length > 0
  const allOk = rules.every(r => r.ok) && passwordsMatch

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allOk) return
    setLoading(true)
    setError(null)
    try {
      const { error: pwdErr } = await supabase.auth.updateUser({ password })
      if (pwdErr) throw pwdErr
      await supabase.rpc('activate_own_account')
      setSuccess(true)
      setTimeout(onComplete, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-fondo)' }}>
        <div className="text-center space-y-3">
          <CheckCircle size={48} style={{ color: '#00C9A7', margin: '0 auto' }} />
          <p className="text-xl font-bold" style={{ color: 'var(--color-texto)' }}>¡Cuenta activada!</p>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Redirigiendo al sistema…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-fondo)' }}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <span className="text-4xl">📈</span>
          <h1 className="text-2xl font-bold mt-3" style={{ color: 'var(--color-texto)' }}>Crea tu contraseña</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Configura el acceso permanente a tu cuenta en MyFinance
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl p-6"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}
        >
          {/* Contraseña */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3 py-2.5 rounded-lg text-sm pr-10 outline-none"
                style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-muted)' }}
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirmar */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
              Confirmar contraseña
            </label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }}
            />
          </div>

          {/* Requisitos */}
          {password.length > 0 && (
            <ul className="space-y-1.5 py-1">
              {rules.map(r => (
                <li key={r.label} className="flex items-center gap-2 text-xs">
                  <span style={{ color: r.ok ? '#00C9A7' : 'var(--color-muted)', fontWeight: 600 }}>
                    {r.ok ? '✓' : '○'}
                  </span>
                  <span style={{ color: r.ok ? '#00C9A7' : 'var(--color-muted)' }}>{r.label}</span>
                </li>
              ))}
              <li className="flex items-center gap-2 text-xs">
                <span style={{ color: passwordsMatch ? '#00C9A7' : 'var(--color-muted)', fontWeight: 600 }}>
                  {passwordsMatch ? '✓' : '○'}
                </span>
                <span style={{ color: passwordsMatch ? '#00C9A7' : 'var(--color-muted)' }}>
                  Las contraseñas coinciden
                </span>
              </li>
            </ul>
          )}

          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background: '#E24C4C15', color: '#E24C4C' }}
            >
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!allOk || loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
            style={{ background: 'var(--color-acento)' }}
          >
            {loading ? 'Activando cuenta…' : 'Activar cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}
