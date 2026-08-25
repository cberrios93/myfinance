import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('cberrios93@gmail.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-fondo)' }}>
      <div className="w-full max-w-sm p-8 rounded-2xl shadow-xl" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
        <div className="mb-8 text-center">
          <div className="text-3xl mb-2">📈</div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-texto)' }}>MyFinance</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Ingresa con tu cuenta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-muted)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg text-sm outline-none focus:ring-2"
              style={{
                background: 'var(--color-fondo)',
                color: 'var(--color-texto)',
                border: '1px solid var(--color-borde)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-muted)' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg text-sm outline-none focus:ring-2"
              style={{
                background: 'var(--color-fondo)',
                color: 'var(--color-texto)',
                border: '1px solid var(--color-borde)',
              }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50"
            style={{ background: 'var(--color-acento)', color: '#fff' }}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
