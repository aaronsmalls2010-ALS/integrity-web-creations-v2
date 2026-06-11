import type { Metadata } from 'next'
import SubpageShell from '@/components/site/SubpageShell'

export const metadata: Metadata = {
  title: 'Portfolio — Integrity Web Creations',
  description:
    'Websites built for real businesses: churches, sports unions, travel agencies, medical practices, and marinas across the Lowcountry and beyond.',
}

// Content sourced from www.integritywebcreations.com/clients (2026-06-11)
const CLIENTS = [
  {
    name: 'The Friendship Baptist Church',
    meta: 'Church · Beaufort, SC',
    site: 'thefriendshipbaptist.com',
    quote:
      'The website A. Smalls created for our church has been a blessing. Visitors find us easily online now, and the site captures the spirit of our congregation.',
    by: 'Pastor Isiah Smalls',
  },
  {
    name: 'Arena Football Players Union',
    meta: 'Professional Sports Union · Atlanta, GA',
    site: 'aflpu.org',
    quote:
      'Integrity Web Creations built a site that truly represents our organization with the professionalism it deserves. A. Smalls was responsive, detailed, and genuinely invested in getting it right.',
    by: 'James Baron',
  },
  {
    name: 'Nora',
    meta: 'Travel Agency · United States',
  },
  {
    name: 'Epps Medical',
    meta: 'Medical Practice · Savannah, GA',
    quote:
      'A. Smalls delivered exactly what I needed — a professional, modern site that represents my practice the right way.',
    by: 'Dr. Willie Epps',
  },
  {
    name: 'The Beaufort Marina',
    meta: 'Marina · Beaufort, SC',
    quote:
      'Finally a web developer who actually listens. A. Smalls took the time to understand our marina, our customers, and what we needed to say online.',
    by: 'Rick & Mandy',
  },
]

export default function PortfolioPage() {
  return (
    <SubpageShell
      label="Our Work"
      title="Built for Real Businesses"
      lede="Custom websites for churches, unions, medical practices, travel agencies, and marinas — every one designed around the business behind it."
    >
      <ul className="sub-grid">
        {CLIENTS.map((c) => (
          <li className="sub-card" key={c.name}>
            <p className="sub-meta">{c.meta}</p>
            <h3>{c.name}</h3>
            {c.site && (
              <p>
                <a
                  href={`https://${c.site}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {c.site}
                </a>
              </p>
            )}
            {c.quote && (
              <blockquote className="sub-quote">
                &ldquo;{c.quote}&rdquo;
                <footer>— {c.by}</footer>
              </blockquote>
            )}
          </li>
        ))}
      </ul>

      <div className="cta-banner">
        <h2>Ready for a Website That Works For You?</h2>
        <p>
          Custom-built. Fully managed. Built around your budget. Let&rsquo;s
          have a real conversation about what your business deserves online.
        </p>
        <a className="cta cta--primary" href="/contact">
          Let&rsquo;s Talk
        </a>
      </div>
    </SubpageShell>
  )
}
