import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FINANCIAL_TERMS, type TermKey } from '../../lib/financialTerms'

const TOOLTIP_W = 240
const GAP = 8

export function FinancialTerm({ term, children }: { term: TermKey; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, below: false })
  const anchorRef = useRef<HTMLSpanElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const def = FINANCIAL_TERMS[term]

  const calcPos = useCallback(() => {
    if (!anchorRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    const centerX = r.left + r.width / 2
    // Muestra abajo si no hay espacio arriba (estimamos ~70px de alto del tooltip)
    const below = r.top < 80
    setPos({
      top: below ? r.bottom + GAP : r.top - GAP,
      left: Math.max(GAP, Math.min(centerX - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - GAP)),
      below,
    })
  }, [])

  const show = useCallback(() => {
    clearTimeout(hideTimer.current)
    calcPos()
    showTimer.current = setTimeout(() => setVisible(true), 180)
  }, [calcPos])

  const hide = useCallback(() => {
    clearTimeout(showTimer.current)
    hideTimer.current = setTimeout(() => setVisible(false), 150)
  }, [])

  useEffect(() => {
    if (!visible) return
    const close = () => setVisible(false)
    window.addEventListener('scroll', close, { passive: true, capture: true })
    return () => window.removeEventListener('scroll', close, { capture: true })
  }, [visible])

  // Offset del triángulo: apunta al centro del anchor
  const anchorCenterX = anchorRef.current
    ? anchorRef.current.getBoundingClientRect().left + anchorRef.current.getBoundingClientRect().width / 2
    : pos.left + TOOLTIP_W / 2
  const arrowLeft = Math.max(8, Math.min(anchorCenterX - pos.left - 4, TOOLTIP_W - 16))

  const tooltip = visible ? (
    <span
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: pos.below ? 'none' : 'translateY(-100%)',
        zIndex: 99999,
        background: 'var(--color-card)',
        border: '1px solid var(--color-borde)',
        borderRadius: 8,
        padding: '8px 12px',
        width: TOOLTIP_W,
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        pointerEvents: 'none',
        whiteSpace: 'normal',
        display: 'block',
      }}
    >
      {/* Triángulo — arriba o abajo según dirección */}
      <span style={{
        position: 'absolute',
        ...(pos.below
          ? { top: -5 }
          : { bottom: -5 }),
        left: arrowLeft,
        transform: 'rotate(45deg)',
        width: 8,
        height: 8,
        background: 'var(--color-card)',
        ...(pos.below
          ? { borderLeft: '1px solid var(--color-borde)', borderTop: '1px solid var(--color-borde)' }
          : { borderRight: '1px solid var(--color-borde)', borderBottom: '1px solid var(--color-borde)' }),
      }} />
      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#00C9A7', marginBottom: 3 }}>
        {def.label}
      </span>
      <span style={{ display: 'block', fontSize: 11, color: 'var(--color-texto)', lineHeight: 1.45 }}>
        {def.def}
      </span>
    </span>
  ) : null

  return (
    <span
      ref={anchorRef}
      style={{ display: 'inline' }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={e => { e.stopPropagation(); visible ? hide() : (calcPos(), setVisible(true)) }}
    >
      <span style={{ borderBottom: '1px dotted #00C9A7', cursor: 'help' }}>
        {children}
      </span>
      {typeof document !== 'undefined' && createPortal(tooltip, document.body)}
    </span>
  )
}
