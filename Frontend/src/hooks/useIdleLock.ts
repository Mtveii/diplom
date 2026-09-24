import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getLocaleDictionary } from '@/store/localeStore'
import { toast } from '@/store/toastStore'

/** Автолок при простое: чужой открытый браузер не останется залогиненным. */
export const IDLE_TIMEOUT_MS = 30 * 60_000

const CHECK_INTERVAL_MS = 30_000
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const

/**
 * Следит за активностью; при простое дольше таймаута чистит токен.
 * Работает только пока есть токен. Слушатели и таймер снимаются при размонтировании.
 */
export function useIdleLock(timeoutMs: number = IDLE_TIMEOUT_MS) {
  const lastActivityRef = useRef<number>(Date.now())
  const token = useAuthStore((state) => state.accessToken)

  useEffect(() => {
    if (!token) {
      return undefined
    }
    lastActivityRef.current = Date.now()

    const markActive = () => {
      lastActivityRef.current = Date.now()
    }
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true })
    }

    const timer = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= timeoutMs) {
        useAuthStore.getState().clearAccessToken()
        toast.warning(getLocaleDictionary().common.sessionExpired)
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive)
      }
      window.clearInterval(timer)
    }
  }, [token, timeoutMs])
}
