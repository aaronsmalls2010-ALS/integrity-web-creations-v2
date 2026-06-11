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
        <noscript>
          <style>{`#preloader{display:none}.scene{position:relative!important;opacity:1!important;visibility:visible!important;height:100svh}`}</style>
        </noscript>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
