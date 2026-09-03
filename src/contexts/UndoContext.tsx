import { createContext, useContext, useCallback, useRef, useState, type ReactNode } from 'react'
import { useConfig } from '../config/ConfigContext'

interface UndoAction {
  label: string
  undo: () => Promise<void>
}

interface UndoContextValue {
  pending: UndoAction | null
  showUndo: (label: string, undoFn: () => Promise<void>) => void
  dismiss: () => void
  executeUndo: () => Promise<void>
}

const UndoContext = createContext<UndoContextValue | null>(null)

export function UndoProvider({ children }: { children: ReactNode }) {
  const { config } = useConfig()
  const [pending, setPending] = useState<UndoAction | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setPending(null)
  }, [])

  const showUndo = useCallback((label: string, undoFn: () => Promise<void>) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setPending({ label, undo: undoFn })
    timerRef.current = setTimeout(() => {
      setPending(null)
      timerRef.current = null
    }, config.undoTimeoutMs)
  }, [config.undoTimeoutMs])

  const executeUndo = useCallback(async () => {
    if (!pending) return
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    const action = pending
    setPending(null)
    await action.undo()
  }, [pending])

  return (
    <UndoContext.Provider value={{ pending, showUndo, dismiss, executeUndo }}>
      {children}
    </UndoContext.Provider>
  )
}

export function useUndo() {
  const ctx = useContext(UndoContext)
  if (!ctx) throw new Error('useUndo must be used within UndoProvider')
  return ctx
}
