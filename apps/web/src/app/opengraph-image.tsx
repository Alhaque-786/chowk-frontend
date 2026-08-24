import { ImageResponse } from 'next/og'
import { SITE_NAME } from '@/lib/seo'

/**
 * The social card, generated rather than a static asset.
 *
 * Generated because it stays in sync with the design tokens: a hand-made PNG
 * drifts the moment the palette changes, and nobody notices because it only
 * appears in someone else's WhatsApp preview.
 *
 * Deliberately typographic — no photography. A generic stock food image is worse
 * than none, and real dish photography belongs on the kitchen pages where it is
 * actually that kitchen's food.
 */
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = `${SITE_NAME} — order food from kitchens near you`

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          // Token values inlined: ImageResponse renders in isolation and cannot
          // read the stylesheet's CSS variables.
          background: '#fbf9f5',
          padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 30,
              fontWeight: 600,
              color: '#2f3f7a',
              letterSpacing: '0.02em',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                background: '#2f3f7a',
                borderRadius: 6,
                display: 'flex',
              }}
            />
            {SITE_NAME}
          </div>

          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              color: '#1c1a17',
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
              maxWidth: 900,
              display: 'flex',
            }}
          >
            Order from kitchens near you
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 30, color: '#55504a', display: 'flex', maxWidth: 620 }}>
            Lower commission for kitchens. Lower prices for you.
          </div>
          {/* A hairline in the accent, as the one warm note. */}
          <div style={{ display: 'flex', width: 120, height: 6, background: '#c2681a' }} />
        </div>
      </div>
    ),
    size,
  )
}
