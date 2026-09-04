import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: 'rgba(0,201,167,0.1)',
        border: '1px solid rgba(0,201,167,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={26} style={{ color: 'var(--color-acento)' }} />
      </div>
      <div style={{ maxWidth: 340 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-texto)', marginBottom: 6 }}>{title}</p>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background: 'var(--color-acento)', color: '#fff', border: 'none',
            padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
