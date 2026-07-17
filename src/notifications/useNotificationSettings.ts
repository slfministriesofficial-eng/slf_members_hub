import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotificationSettings,
  updateMemberMuted,
  updateNotificationKeyEnabled,
  updateNotificationsEnabled,
  type NotificationSettings,
} from './api'

const SETTINGS_KEY = ['notification-settings']

/**
 * Shared, cached notification-control state (master switch + muted members) —
 * used by the Follow-ups controls card and every status bell on screen.
 * @returns react-query result whose data is the NotificationSettings
 */
export function useNotificationSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: fetchNotificationSettings,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

/**
 * Mutation for the master automation switch. The backend answers with the
 * full updated settings, which replace the cache directly — no refetch.
 * @returns react-query mutation taking the new enabled state
 */
export function useSetNotificationsEnabled() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (enabled: boolean) => updateNotificationsEnabled(enabled),
    onSuccess: (settings: NotificationSettings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings)
    },
  })
}

/**
 * Mutation for one individual notification switch on the Access page. The
 * upcoming-schedule cache is invalidated too, since switching a trigger off
 * removes it from the schedule view and the "Next Notification" hero.
 * @returns react-query mutation taking {key, enabled}
 */
export function useSetNotificationKeyEnabled() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      updateNotificationKeyEnabled(key, enabled),
    onSuccess: (settings: NotificationSettings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings)
      queryClient.invalidateQueries({ queryKey: ['upcoming-schedule'] })
    },
  })
}

/**
 * Mutation to pause/resume all notifications for one member. Also refreshes
 * the token count, since muted devices no longer count as reachable.
 * @returns react-query mutation taking {memberId, muted}
 */
export function useSetMemberMuted() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, muted }: { memberId: string; muted: boolean }) =>
      updateMemberMuted(memberId, muted),
    onSuccess: (settings: NotificationSettings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings)
      queryClient.invalidateQueries({ queryKey: ['fcm-token-count'] })
    },
  })
}
