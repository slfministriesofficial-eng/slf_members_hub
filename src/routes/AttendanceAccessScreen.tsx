import { useNavigate } from 'react-router-dom'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { AttendanceTakersPanel } from '../attendance/AttendanceTakersPanel'

/**
 * "Give Access" page (opened from the Attendance hub's second card). Grants a
 * volunteer a magic-link attendance login and manages the roster — the same
 * panel shown in Access Settings, on its own dedicated screen here.
 */
export function AttendanceAccessScreen() {
  const navigate = useNavigate()
  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <PageBackHeader title="Give Attendance Access" onBack={() => navigate('/attendance')} />
      <p className="-mt-2 mb-5 pl-11 text-[12px] text-slate">
        Send a volunteer a private link — they'll sign in on their own phone and only ever see the
        attendance and add-member screens.
      </p>
      <AttendanceTakersPanel />
    </div>
  )
}
