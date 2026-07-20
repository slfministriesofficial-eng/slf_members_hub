import { useRef, useState, type ReactNode } from 'react'
import type { MemberStatus } from '../../components/ui/StatusPill'
import { IdCard } from './IdCard'
import { IdCardBack } from './IdCardBack'

// Real CR80 card size (the standard ID/membership card format) — the PDF page
// is set to exactly this, in millimeters, so a print shop gets a file that
// prints at true physical size instead of guessing a DPI from raw pixels.
const CARD_WIDTH_MM = 85.6
const CARD_HEIGHT_MM = 54

// Capture width MUST equal the card's authored design width: the card's inner
// sizes (logo, fonts, QR, padding) are fixed pixels tuned for this width, the
// same base the on-screen preview scales from. Capturing at any other width
// shrinks the content and clusters it at the top. Print resolution comes from
// CAPTURE_SCALE (500 × 4 = 2000px ≈ 590 DPI at 85.6mm — well past print-sharp,
// and keeps the QR cleanly scannable), not from inflating this width.
const CAPTURE_WIDTH_PX = 500
const CAPTURE_SCALE = 4

export type CardPdfData = {
  name: string
  memberId: string
  mobile?: string
  bloodGroup?: string
  status: MemberStatus
  statusLabel: string
  sinceYear?: string
  // Public digital profile only — hides the phone number (never shown publicly).
  hideMobile?: boolean
}

// Waits for every <img> inside el to finish loading (the QR code and card
// photos render async) so html2canvas never captures a still-blank image.
function waitForImages(el: HTMLElement, timeoutMs = 3000): Promise<void> {
  const pending = Array.from(el.querySelectorAll('img')).filter((img) => !img.complete)
  if (pending.length === 0) return Promise.resolve()
  return Promise.race([
    Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          }),
      ),
    ).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ])
}

/**
 * Shared "download the membership card as a print-ready PDF" logic, used on the
 * Membership Cards page, the admin member profile, and the public digital
 * profile. Captures a hidden, flat (non-flipped) front/back copy of the card and
 * lays them into a 2-page PDF sized to real CR80 card dimensions.
 *
 * Returns the trigger, a preparing flag, an error message, and `captureNodes` —
 * render `captureNodes` once anywhere in the component so the off-screen capture
 * source exists in the DOM. Wire any button's onClick to `downloadPdf`.
 */
export function useCardPdfDownload(card: CardPdfData) {
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function downloadPdf() {
    if (!frontRef.current || !backRef.current || isPreparing) return
    setIsPreparing(true)
    setError(null)
    try {
      // html2canvas-pro (drop-in fork): the original html2canvas can't parse
      // Tailwind v4's color-mix()/oklch() colours the card uses via opacity
      // modifiers, so it threw and the download silently failed.
      const [html2canvasModule, jsPdfModule] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jsPdfModule

      await Promise.all([waitForImages(frontRef.current), waitForImages(backRef.current)])

      // background-clip:text can't be captured — the "SARAH" wordmark's gold
      // gradient renders as a solid bar. In the cloned capture DOM only, flatten
      // it to solid gold so the text shows; the on-screen card keeps its gradient.
      const flattenGoldText = (doc: Document) => {
        doc.querySelectorAll<HTMLElement>('[data-gold-text]').forEach((el) => {
          el.style.backgroundImage = 'none'
          el.style.backgroundClip = 'border-box'
          el.style.webkitBackgroundClip = 'border-box'
          el.style.color = '#C79A45'
          el.style.webkitTextFillColor = '#C79A45'
        })
      }
      const opts = {
        scale: CAPTURE_SCALE,
        backgroundColor: '#ffffff',
        useCORS: true,
        onclone: flattenGoldText,
      }
      const [frontCanvas, backCanvas] = await Promise.all([
        html2canvas(frontRef.current, opts),
        html2canvas(backRef.current, opts),
      ])

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_WIDTH_MM, CARD_HEIGHT_MM] })
      pdf.addImage(frontCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM)
      pdf.addPage([CARD_WIDTH_MM, CARD_HEIGHT_MM], 'landscape')
      pdf.addImage(backCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM)
      pdf.save(`${(card.name || 'member').replace(/\s+/g, '-')}-membership-card.pdf`)
    } catch {
      setError('Could not generate the PDF — please try again.')
    } finally {
      setIsPreparing(false)
    }
  }

  // Off-screen, un-flipped front/back pair used only as the capture source —
  // html2canvas can't reliably capture the live card's 3D-rotated back face.
  const captureNodes: ReactNode = (
    <div className="fixed left-[-9999px] top-0" aria-hidden="true">
      <div ref={frontRef} style={{ width: CAPTURE_WIDTH_PX }}>
        <IdCard
          name={card.name}
          memberId={card.memberId}
          mobile={card.mobile}
          bloodGroup={card.bloodGroup}
          status={card.status}
          statusLabel={card.statusLabel}
          sinceYear={card.sinceYear}
          hideMobile={card.hideMobile}
        />
      </div>
      <div ref={backRef} style={{ width: CAPTURE_WIDTH_PX }}>
        <IdCardBack />
      </div>
    </div>
  )

  return { downloadPdf, isPreparing, error, captureNodes }
}
