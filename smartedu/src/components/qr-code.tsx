'use client'

import Image from 'next/image'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

/** QR-kod (brauzerda, tashqi xizmatsiz). `text` o'zgarsa qayta chiziladi. */
export function QrCode({
  text,
  size = 240,
  className = '',
}: {
  text: string
  size?: number
  className?: string
}) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    QRCode.toDataURL(text, { margin: 1, width: size * 2, errorCorrectionLevel: 'M' })
      .then((u) => live && setSrc(u))
      .catch(() => live && setSrc(null))
    return () => {
      live = false
    }
  }, [text, size])
  return src ? (
    <Image
      src={src}
      width={size}
      height={size}
      alt="QR"
      unoptimized
      className={`bg-white ${className}`}
    />
  ) : (
    <div style={{ width: size, height: size }} className={`bg-white ${className}`} />
  )
}
