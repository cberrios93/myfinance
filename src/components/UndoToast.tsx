import { useEffect, useState } from 'react'
import { Undo2, X } from 'lucide-react'
import { useUndo } from '../contexts/UndoContext'
import { useConfig } from '../config/ConfigContext'

export default function UndoToast() {
  const { pending, dismiss, executeUndo } = useUndo()
  const { config } = useConfig()
  const [animKey, setAnimKey] = useState(0)
  const [undoing, setUndoing] = useState(false)

  useEffect(() => {
    if (pending) setAnimKey(k => k + 1)
  }, [pending])

  if (!pending) return null

  async function handleUndo() {
    setUndoing(true)
    try {
      await executeUndo()
    } finally {
      setUndoing(false)
    }
  }

  const durationS = config.undoTimeoutMs / 1000

  return (
    <>
      <style>{`
        @keyframes undo-bar {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @keyframes undo-in {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        minWidth: '300px',
        maxWidth: '90vw',
        background: 'var(--color-card)',
        border: '1px solid var(--color-borde)',
        borderRadius: '0.75rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        animation: 'undo-in 0.2s ease',
      }}>
        <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--color-texto)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pending.label}
          </span>
          <button
            onClick={handleUndo}
            disabled={undoing}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.875rem',
              borderRadius: '0.5rem',
              background: 'var(--color-acento)',
              color: '#fff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              border: 'none',
              cursor: undoing ? 'not-allowed' : 'pointer',
              opacity: undoing ? 0.6 : 1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Undo2 size={13} />
            {undoing ? 'Deshaciendo…' : 'Deshacer'}
          </button>
          <button
            onClick={dismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '0.25rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            <X size={15} />
          </button>
        </div>
        <div style={{ height: '3px', background: 'var(--color-borde)' }}>
          <div
            key={animKey}
            style={{
              height: '100%',
              background: 'var(--color-acento)',
              animation: `undo-bar ${durationS}s linear forwards`,
            }}
          />
        </div>
      </div>
    </>
  )
}
