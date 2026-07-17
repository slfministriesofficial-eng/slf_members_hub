import { createContext, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { useAuth } from '../auth/AuthContext'
import { isMessagingSupported } from '../firebase-messaging'
import {
  initializeNotifications,
  enableNotifications as serviceEnable,
  deleteToken as serviceDeleteToken,
  onForegroundMessage,
  getPermission,
  getStoredTokenRecord,
  wasPermissionDenied,
} from './NotificationService'

/** Everything the app needs to read or drive push notifications. */
export type NotificationContextValue = {
  /** Current browser permission state. */
  permission: NotificationPermission
  /** Active FCM token (null until enabled). */
  token: string | null
  /** Whether this browser/config supports FCM push at all. */
  supported: boolean
  /** When the token was last saved to the backend (ISO string). */
  lastUpdated: string | null
  /** True while the enable flow is running. */
  enabling: boolean
  /** True when a past prompt was denied (don't re-ask; guide to settings). */
  denied: boolean
  /** Prompt (once) and register this browser for pushes. */
  enableNotifications: () => Promise<void>
  /** Stop pushes for this browser and clean up the backend record. */
  disableNotifications: () => Promise<void>
}

export const NotificationContext = createContext<NotificationContextValue | null>(null)

/**
 * App-wide notifications provider. On mount it (a) detects support, (b) if
 * permission was already granted, silently refreshes + re-saves the token
 * (handles Firebase's token rotation), and (c) listens for foreground pushes
 * so they show as real notifications. It never prompts on its own — the
 * permission prompt only ever comes from the user pressing Enable.
 * @param {PropsWithChildren} props children to render inside the provider
 */
export function NotificationProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, adminName } = useAuth()
  const [permission, setPermission] = useState<NotificationPermission>(getPermission())
  const [token, setToken] = useState<string | null>(() => getStoredTokenRecord()?.token ?? null)
  const [supported, setSupported] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(() => getStoredTokenRecord()?.updatedAt ?? null)
  const [enabling, setEnabling] = useState(false)

  // The token is linked to whoever is signed in — this is an admin console,
  // so the admin's name is the "member" identity on token records.
  const memberId = adminName || 'admin'

  useEffect(() => {
    let cancelled = false
    isMessagingSupported().then((ok) => {
      if (!cancelled) setSupported(ok)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Silent startup sync — only does anything when permission is already granted.
  useEffect(() => {
    if (!isAuthenticated || !supported) return
    let cancelled = false
    initializeNotifications(memberId).then((freshToken) => {
      if (cancelled || !freshToken) return
      setToken(freshToken)
      setLastUpdated(getStoredTokenRecord()?.updatedAt ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, supported, memberId])

  // Foreground pushes → visible notifications while the app is open.
  useEffect(() => {
    if (!supported || permission !== 'granted') return
    const unsubscribe = onForegroundMessage()
    return unsubscribe
  }, [supported, permission])

  const enableNotifications = useCallback(async () => {
    setEnabling(true)
    try {
      const result = await serviceEnable(memberId)
      setPermission(result.permission)
      setToken(result.token)
      setLastUpdated(getStoredTokenRecord()?.updatedAt ?? null)
    } finally {
      setEnabling(false)
    }
  }, [memberId])

  const disableNotifications = useCallback(async () => {
    await serviceDeleteToken()
    setToken(null)
    setLastUpdated(null)
  }, [])

  const value = useMemo<NotificationContextValue>(
    () => ({
      permission,
      token,
      supported,
      lastUpdated,
      enabling,
      denied: wasPermissionDenied(),
      enableNotifications,
      disableNotifications,
    }),
    [permission, token, supported, lastUpdated, enabling, enableNotifications, disableNotifications],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
