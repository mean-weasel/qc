'use client'

import { useEffect, useRef } from 'react'

/**
 * Calls `onStale` when the tab becomes visible after being hidden for longer than `thresholdMs`.
 * Useful for refetching data after a laptop sleep/wake cycle.
 */
export function useVisibilityRefresh(onStale: () => void, thresholdMs = 60_000): void {
  const onStaleRef = useRef(onStale)
  useEffect(() => {
    onStaleRef.current = onStale
  }, [onStale])

  useEffect(() => {
    let hiddenAt: number | null = null

    const handler = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
      } else if (hiddenAt && Date.now() - hiddenAt > thresholdMs) {
        onStaleRef.current()
        hiddenAt = null
      }
    }

    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [thresholdMs])
}
