import type { CSSProperties, ReactNode } from 'react'
import TopNav from '@/components/cinematic/chrome/TopNav'
import BrandMark from '@/components/cinematic/chrome/BrandMark'
import SubpageFx from './SubpageFx'

/**
 * Standard-scroll subpage in the cinematic theme: same fixed chrome (brand
 * mark + nav), dark navy stage, real footer with the business contact info
 * (content sourced from www.integritywebcreations.com, 2026-06-11).
 *
 * With `hero` set, the page opens on a full-bleed concept plate — slow
 * Ken Burns pull-back (never zoom in, same rule as the landing), film grain
 * + vignette, and strictly sequential masked line reveals for the h1.
 */
export interface SubpageHero {
  /** desktop plate (concept artwork already shipped for the cinematic) */
  image: string
  /** mobile plate variant (swapped ≤768px) */
  imageMobile?: string
  /** object-position focal point */
  position?: string
  /** headline lines, revealed one at a time top→bottom */
  headline: string[]
  /** exact substring rendered italic gold (first match across lines) */
  goldText?: string
}

function renderLine(line: string, goldText?: string) {
  if (!goldText) return line
  const at = line.indexOf(goldText)
  if (at === -1) return line
  return (
    <>
      {line.slice(0, at)}
      <em className="gold">{goldText}</em>
      {line.slice(at + goldText.length)}
    </>
  )
}

export default function SubpageShell({
  label,
  title,
  lede,
  hero,
  children,
}: {
  label: string
  title: string
  lede?: string
  hero?: SubpageHero
  children: ReactNode
}) {
  return (
    <>
      <div id="chrome">
        <TopNav />
        <BrandMark />
      </div>
      <SubpageFx />
      <main className={hero ? 'subpage subpage--hero' : 'subpage'}>
        {hero && (
          <header
            className="subhero"
            style={{ '--subhero-pos': hero.position } as CSSProperties}
          >
            <div className="subhero__media" aria-hidden="true">
              <picture>
                {hero.imageMobile && (
                  <source media="(max-width: 768px)" srcSet={hero.imageMobile} />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed plate, already optimized webp */}
                <img src={hero.image} alt="" fetchPriority="high" />
              </picture>
            </div>
            <div className="subhero__scrim" />
            <div className="subhero__grain" />
            <div className="subhero__copy">
              <p className="page-label">{label}</p>
              <h1 style={{ '--lines': hero.headline.length } as CSSProperties}>
                {hero.headline.map((line, i) => (
                  <span className="subhero__line" key={line}>
                    <span style={{ '--i': i } as CSSProperties}>
                      {renderLine(line, hero.goldText)}
                    </span>
                  </span>
                ))}
              </h1>
              {lede && (
                <p
                  className="lede"
                  style={{ '--lines': hero.headline.length } as CSSProperties}
                >
                  {lede}
                </p>
              )}
            </div>
            <div className="subhero__cue" aria-hidden="true">
              <svg viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 2l11 10L24 2" />
              </svg>
            </div>
          </header>
        )}
        <div className="subpage__pad">
          <div className="subpage__inner">
            {!hero && (
              <header className="subpage__header">
                <p className="page-label">{label}</p>
                <h1>{title}</h1>
                {lede && <p className="lede">{lede}</p>}
              </header>
            )}
            {children}
          </div>
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
