import { useContext } from 'react'
import { NotificationContext, type NotificationContextValue } from './NotificationContext'

/**
 * Access push-notification state and actions anywhere in the app:
 * `permission`, `token`, `supported`, `lastUpdated`, `enabling`, `denied`,
 * `enableNotifications()`, `disableNotifications()`.
 * Must be used inside a NotificationProvider.
 * @returns {NotificationContextValue} the shared notifications state
 */
export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
