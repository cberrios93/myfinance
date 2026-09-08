import { useState, useRef, useCallback } from 'react'
import { FINANCIAL_TERMS, type TermKey } from '../../lib/financialTerms'

export function FinancialTerm({ term, children }: { term: TermKey; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const showTimer = useRef<ReturnType<typeof setTimeout>>()
  const def = FINANCIAL_TERMS[term]

  const show = useCallback(() => {
    clearTimeout(hideTimer.current)
    showTimer.current = setTimeout(() => setVisible(true), 180)
  }, [])

  const hide = useCallback(() => {
    clearTimeout(showTimer.current)
    hideTimer.current = setTimeout(() => setVisible(false), 150)
  }, [])

  return (
    <span
      style={{ position: 'relative', display: 'inline' }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={e => { e.stopPropagation(); setVisible(v => !v) }}
    >
      <span style={{ borderBottom: '1px dotted #00C9A7', cursor: 'help' }}>
        {children}
      </span>
      {visible && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'var(--color-card)',
          border: '1px solid var(--color-borde)',
          borderRadius: 8,
          padding: '8px 12px',
          width: 240,
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
          whiteSpace: 'normal',
          display: 'block',
        }}>
          <span style={{
            position: 'absolute',
            bottom: -5,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 8,
            height: 8,
            background: 'var(--color-card)',
            borderRight: '1px solid var(--color-borde)',
            borderBottom: '1px solid var(--color-borde)',
          }} />
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#00C9A7', marginBottom: 3 }}>
            {def.label}
          </span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--color-texto)', lineHeight: 1.45 }}>
            {def.def}
          </span>
        </span>
      )}
    </span>
  )
}
