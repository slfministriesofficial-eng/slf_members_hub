import { Icon } from '../components/ui/Icon'
import { MobileBackButton } from '../components/ui/MobileBackButton'

// The two blank new-member registration forms live in public/ and are served
// statically. Spaces in the filenames are URL-encoded; `download` forces a save
// with a clean, language-tagged name.
const FORMS = [
  {
    title: 'English Form',
    language: 'English',
    description: 'Printable new-member registration form in English.',
    href: '/REGISTRATION%20FORM.pdf',
    downloadName: 'SLF-Registration-Form-English.pdf',
    iconBg: 'bg-gradient-to-br from-ink to-ink-deep',
    buttonBg: 'bg-ink hover:bg-ink-deep',
  },
  {
    title: 'Telugu Form',
    language: 'తెలుగు',
    description: 'Printable new-member registration form in Telugu.',
    href: '/REGISTRATION%20FORM%20-%20telugu.pdf',
    downloadName: 'SLF-Registration-Form-Telugu.pdf',
    iconBg: 'bg-gradient-to-br from-brass to-brass-deep',
    buttonBg: 'bg-brass-deep hover:brightness-110',
  },
]

/**
 * Registration Forms — two cards (same treatment as the Attendance/Announcements
 * hubs), one per language, each downloading the printable blank form PDF.
 */
export function RegistrationFormsScreen() {
  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <div className="mb-1 flex items-center gap-1">
        <MobileBackButton />
        <h1 className="font-display text-[22px] font-bold text-heading md:text-[26px]">Registration Forms</h1>
      </div>
      <p className="mb-5 text-[12.5px] text-slate">
        Download a printable blank membership registration form to hand out or fill in for a new member.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {FORMS.map((form) => (
          <a
            key={form.title}
            href={form.href}
            download={form.downloadName}
            className="motion-safe:animate-[fade-rise_0.3s_ease-out_both] flex cursor-pointer flex-col rounded-2xl bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elev md:p-5"
          >
            <div className="flex items-center gap-3.5 md:flex-col md:items-start md:gap-0">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl md:mb-3 ${form.iconBg}`}>
                <Icon name="note" className="icon !h-[21px] !w-[21px] text-white" />
              </span>
              <span className="min-w-0 flex-1 md:flex-none">
                <span className="block text-[14.5px] font-bold text-heading">{form.title}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-slate">{form.description}</span>
                <span className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-brass-deep">
                  <Icon name="globe" className="icon !h-[11px] !w-[11px]" />
                  {form.language} · PDF
                </span>
              </span>
            </div>
            <span
              className={`mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-[12px] font-bold text-white transition-transform hover:scale-[1.02] ${form.buttonBg}`}
            >
              <Icon name="download" className="icon !h-[14px] !w-[14px]" />
              Download {form.title}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
