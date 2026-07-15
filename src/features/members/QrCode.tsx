import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type QrCodeProps = {
  value: string
  className?: string
}

// Generates a real, scannable QR code entirely in the browser — no third-party
// image service involved, so it works offline and never depends on anyone else's uptime.
export function QrCode({ value, className = '' }: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, { margin: 0, width: 256, color: { dark: '#1A2235', light: '#0000' } })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [value])

  if (!dataUrl) return <div className={className} />
  return <img src={dataUrl} alt="Scan to verify" className={className} />
}
