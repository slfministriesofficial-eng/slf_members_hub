import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import logo from '../assets/slf_logo_cropped.png'

/**
 * Magic-link landing page — the destination of the WhatsApp invite an
 * attendance taker receives (`/attend/:token`). It verifies the token with the
 * backend, signs the taker in, and drops them straight into the attendance
 * screen. Public (mounted before the auth gate), since the taker isn't signed
 * in yet when they tap the link.
 */
export function AttendanceLoginScreen() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { loginAsTaker } = useAuth()
  const [error, setError] = useState<string | null>(null)
  // StrictMode double-invokes effects in dev — guard so we verify only once.
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!token) {
      setError('This attendance link is incomplete. Ask the church office for a new one.')
      return
    }
    loginAsTaker(token).then((res) => {
      if (res.ok) navigate('/attendance', { replace: true })
      else setError(res.error)
    })
  }, [token, loginAsTaker, navigate])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 text-center">
      <span className="mb-5 h-20 w-20 overflow-hidden rounded-full shadow-card">
        <img src={logo} alt="SLF" className="h-full w-full object-cover" />
      </span>
      {error ? (
        <>
          <h1 className="font-display text-[19px] font-bold text-heading">Link not valid</h1>
          <p className="mt-2 max-w-[320px] text-[13px] leading-relaxed text-slate">{error}</p>
        </>
      ) : (
        <>
          <h1 className="font-display text-[19px] font-bold text-heading">Signing you in…</h1>
          <p className="mt-2 max-w-[320px] text-[13px] leading-relaxed text-slate">
            Setting up your attendance access for Sarah Living Faith Ministries.
          </p>
        </>
      )}
    </div>
  )
}
