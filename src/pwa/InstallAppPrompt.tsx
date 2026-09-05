import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { isIosDevice, useInstallPrompt } from './useInstallPrompt'

/** Let the splash / welcome transition finish before anything covers the app,
 *  so the very first impression isn't a dialog. */
const APPEAR_DELAY_MS = 4000

/** The public member page (what every ID card's QR code opens) gets the
 *  notification opt-in popup instead of this one. */
const MEMBER_ROUTE = '/member'

/**
 * "Download the app" popup. The app is a PWA, but on a phone it opens in a
 * browser tab unless the visitor digs the install option out of Chrome's menu —
 * almost nobody does. This offers it as one download button instead.
 * On Android/desktop the button installs directly. iOS ships no install API at
 * all, so there the same button falls back to the two-tap Share → Add to Home
 * Screen route, shown only once it's been pressed.
 * Mounted once, app-wide, and silent for anyone already running it installed.
 * Skipped on the public member link (/member), which asks members to turn on
 * notifications instead — one popup per visitor, not two.
 */
export function InstallAppPrompt() {
  const { canInstall, installed, snoozedUntil, forced, snooze, dismiss, promptInstall } =
    useInstallPrompt()
  const [ready, setReady] = useState(false)
  const [showIosSteps, setShowIosSteps] = useState(false)

  const { pathname } = useLocation()

  const iosFallback = !canInstall && isIosDevice()
  const eligible =
    !installed &&
    pathname !== MEMBER_ROUTE &&
    (canInstall || iosFallback) &&
    (forced || Date.now() >= snoozedUntil)

  useEffect(() => {
    if (!eligible) {
      setReady(false)
      return
    }
    if (forced) {
      setReady(true) // asked for by hand — no waiting
      return
    }
    const timer = setTimeout(() => setReady(true), APPEAR_DELAY_MS)
    return () => clearTimeout(timer)
  }, [eligible, forced])

  if (!eligible || !ready) return null

  const close = () => (forced ? dismiss() : snooze())

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-deep/60 p-4 backdrop-blur-[2px] sm:items-center print:hidden"
      onClick={close}
    >
      <div
        className="w-full max-w-[380px] rounded-3xl bg-surface p-6 text-center shadow-elev motion-safe:animate-[fade-rise_.28s_ease-out]"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src="/icons/android/pwa-192.png"
          alt=""
          className="mx-auto h-16 w-16 rounded-[18px] shadow-card"
        />
        <h2 className="mt-3.5 font-display text-[19px] font-bold text-heading">
          Download SLF Members Hub
        </h2>
        <p className="mx-auto mt-1.5 max-w-[300px] text-[12.5px] leading-relaxed text-slate">
          Get the app on your home screen — it opens straight into the app instead of a browser tab,
          loads instantly, and keeps notifications coming.
        </p>

        <div className="mt-5 space-y-2.5">
          <button
            onClick={() => (iosFallback ? setShowIosSteps(true) : promptInstall())}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-[13.5px] font-bold text-white transition-transform hover:scale-[1.02]"
          >
            <Icon name="download" className="icon !h-[15px] !w-[15px]" />
            Download App
          </button>

          {/* iPhone/iPad only, and only after the button is pressed: Apple gives
              no way to install from script, so this is the shortest honest path. */}
          {showIosSteps && (
            <ol className="space-y-2 pt-1 text-left motion-safe:animate-[fade-rise_.22s_ease-out]">
              {[
                { icon: 'share', text: 'Tap the Share button in your browser toolbar' },
                { icon: 'plus', text: 'Choose "Add to Home Screen"' },
                { icon: 'check', text: 'Tap "Add" — the app lands on your home screen' },
              ].map((step, index) => (
                <li
                  key={step.icon}
                  className="flex items-center gap-3 rounded-2xl border border-hairline bg-paper px-3.5 py-2.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  <Icon name={step.icon} className="icon !h-[15px] !w-[15px] shrink-0 text-brass-deep" />
                  <span className="text-[12.5px] font-semibold text-charcoal">{step.text}</span>
                </li>
              ))}
            </ol>
          )}

          <button
            onClick={close}
            className="w-full rounded-full py-2.5 text-[12.5px] font-semibold text-slate hover:text-heading"
          >
            {showIosSteps ? 'Got it' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  )
}
