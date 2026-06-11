import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

// next/font self-hosts at build time — no Google Fonts <link> at runtime.
const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.integritywebcreations.com',
  ),
  title: 'Integrity Web Creations — Custom Web Design · Beaufort, SC',
  description:
    'Design. Function. Integrity. Custom web design for Lowcountry small businesses since 2010.',
  openGraph: {
    title: 'Integrity Web Creations',
    description: 'Design. Function. Integrity.',
    images: ['/og.jpg'],
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#050810',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        {/* inline critical CSS (canon): preloader visible <100ms even before
            the stylesheet arrives — full rules also live in globals.css */}
        <style
          dangerouslySetInnerHTML={{
            __html:
              '#preloader{position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.1rem;background:#050810}#preloader .preloader__mark{font-weight:900;font-size:clamp(2.4rem,6vw,4rem);letter-spacing:.18em;color:#f5f2ed}#preloader .preloader__sub{font-size:.55rem;letter-spacing:.45em;text-transform:uppercase;color:#c9a84c}#preloader .preloader__bar{width:min(220px,50vw);height:2px;margin-top:.8rem;background:rgba(200,205,214,.18);overflow:hidden}#preloader-bar-fill{display:block;width:100%;height:100%;background:#c9a84c;transform:scaleX(0);transform-origin:left center;transition:transform .3s ease-out}',
          }}
        />
        <noscript>
          <style>{`#preloader{display:none}.scene{position:relative!important;opacity:1!important;visibility:visible!important;height:100svh}.scene__bg img.bg-reveal{opacity:1!important;visibility:visible!important}`}</style>
        </noscript>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
