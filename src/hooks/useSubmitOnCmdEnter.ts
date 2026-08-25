import { useEffect, useCallback } from 'react'

export function useSubmitOnCmdEnter(onSave: () => void) {
  const handler = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onSave()
    }
  }, [onSave])

  useEffect(() => {
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handler])
}
