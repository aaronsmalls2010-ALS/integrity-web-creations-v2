import type { ReactNode } from 'react'
import TopNav from '@/components/cinematic/chrome/TopNav'
import BrandMark from '@/components/cinematic/chrome/BrandMark'
import SubpageFx from './SubpageFx'

/**
 * Standard-scroll subpage in the cinematic theme: same fixed chrome (brand
 * mark + nav), dark navy stage, real footer with the business contact info
 * (content sourced from www.integritywebcreations.com, 2026-06-11).
 */
export default function SubpageShell({
  label,
  title,
  lede,
  children,
}: {
  label: string
  title: string
  lede?: string
  children: ReactNode
}) {
  return (
    <>
      <div id="chrome">
        <TopNav />
        <BrandMark />
      </div>
      <SubpageFx />
      <main className="subpage">
        <div className="subpage__inner">
          <header className="subpage__header">
            <p className="page-label">{label}</p>
            <h1>{title}</h1>
            {lede && <p className="lede">{lede}</p>}
          </header>
          {children}
        </div>
        <footer className="subpage-footer">
          <div className="subpage__inner subpage-footer__grid">
            <div>
              <p className="page-label">Integrity Web Creations</p>
              <p>
                Premium custom websites built exclusively for your business.
                Every pixel designed with purpose.
              </p>
            </div>
            <div>
              <p className="page-label">Contact</p>
              <p>
                <a href="tel:+18432630072">(843) 263-0072</a>
                <br />
                <a href="mailto:asmalls@integritywebcreations.com">
                  asmalls@integritywebcreations.com
                </a>
                <br />
                Beaufort, South Carolina
              </p>
            </div>
            <div>
              <p className="page-label">Explore</p>
              <p>
                <a href="/">Home</a> · <a href="/about">About</a> ·{' '}
                <a href="/services">Services</a> ·{' '}
                <a href="/portfolio">Portfolio</a> ·{' '}
                <a href="/contact">Contact</a>
              </p>
            </div>
          </div>
          <p className="subpage-footer__legal">
            © 2026 Integrity Web Creations · Founded 2010 · Beaufort, SC ·{' '}
            <a href="/privacy">Privacy</a>
          </p>
        </footer>
      </main>
    </>
  )
}
