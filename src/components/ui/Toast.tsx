import { useEffect } from 'react'
import { Icon } from './Icon'

/**
 * The app's floating pill toast — extracted from MemberProfileScreen so every
 * screen shows the same thing. Sits above the mobile bottom nav.
 *
 * @param {{message: string, tone?: 'info' | 'error', offset?: 'nav' | 'plain', onDismiss: () => void, duration?: number}} props
 *   `message` drives visibility (render it only when there is one to show).
 */
export function Toast({
  message,
  tone = 'info',
  offset = 'nav',
  onDismiss,
  duration = 4000,
}: {
  message: string
  tone?: 'info' | 'error'
  /** 'nav' clears the mobile bottom nav; 'plain' is for the standalone
   *  registration wizards, which have no bottom nav to clear. */
  offset?: 'nav' | 'plain'
  onDismiss: () => void
  duration?: number
}) {
  // Re-armed per message, so a second toast gets its own full duration rather
  // than inheriting what was left of the first one's timer.
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`motion-safe:animate-[fade-rise_0.3s_ease-out] fixed inset-x-0 z-[60] flex justify-center px-4 md:bottom-8 ${
        offset === 'nav' ? 'bottom-[168px]' : 'bottom-6'
      }`}
    >
      <div
        className={`flex max-w-[92vw] items-center gap-2 rounded-full px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-elev ${
          tone === 'error' ? 'bg-status-alert-fg' : 'bg-ink-deep'
        }`}
      >
        <Icon
          name={tone === 'error' ? 'flag' : 'chat'}
          className="icon !h-[14px] !w-[14px] shrink-0 text-white"
        />
        <span className="line-clamp-2 text-left">{message}</span>
      </div>
    </div>
  )
}
