'use client'

import Script from 'next/script'
import { useEffect } from 'react'

interface AnalyticsProps {
  googleAnalyticsId?: string
  googleTagManagerId?: string
  facebookPixelId?: string
}

export function Analytics({
  googleAnalyticsId,
  googleTagManagerId,
  facebookPixelId,
}: Readonly<AnalyticsProps>) {
  useEffect(() => {
    if (facebookPixelId) {
      // Initialize Facebook Pixel
      ;(function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return
        n = f.fbq = function (...args: any[]) {
          n.callMethod ? n.callMethod(...args) : n.queue.push(args)
        }
        if (!f._fbq) f._fbq = n
        n.push = n
        n.loaded = !0
        n.version = '2.0'
        n.queue = []
        t = b.createElement(e)
        t.async = !0
        t.src = v
        s = b.getElementsByTagName(e)[0]
        s.parentNode.insertBefore(t, s)
      })(globalThis, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

      if (globalThis.fbq) {
        globalThis.fbq('init', facebookPixelId)
        globalThis.fbq('track', 'PageView')
      }
    }
  }, [facebookPixelId])

  return (
    <>
      {/* Google Tag Manager */}
      {googleTagManagerId && (
        <>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(globalThis,document,'script','dataLayer','${googleTagManagerId}');
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              title="Google Tag Manager"
            />
          </noscript>
        </>
      )}

      {/* Google Analytics */}
      {googleAnalyticsId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                globalThis.dataLayer = globalThis.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');
              `,
            }}
          />
        </>
      )}

      {/* Facebook Pixel - noscript fallback */}
      {facebookPixelId && (
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${facebookPixelId}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      )}
    </>
  )
}

// Extend globalThis for TypeScript
declare global {
  var fbq: any
  var _fbq: any
  var dataLayer: any
}
