import type { Metadata } from 'next'
import SubpageShell from '@/components/site/SubpageShell'

export const metadata: Metadata = {
  title: 'Services — Integrity Web Creations',
  description:
    'Custom web design, brand identity, SEO, e-commerce, monthly maintenance, and digital marketing for small businesses in Beaufort, SC and beyond.',
}

// Content sourced from www.integritywebcreations.com (2026-06-11)
const SERVICES = [
  {
    title: 'Custom Web Design',
    body: 'A site built from scratch, tailored to your exact business — no templates, no shortcuts.',
  },
  {
    title: 'Brand Identity',
    body: 'Logos, colors, typography, and brand systems that tell your story and make you instantly recognizable.',
  },
  {
    title: 'Search Visibility (SEO)',
    body: 'Local SEO, technical optimization, and content strategy that moves you up in Google.',
  },
  {
    title: 'E-Commerce',
    body: 'Full e-commerce solutions — product pages, secure checkout, inventory management.',
  },
  {
    title: 'Monthly Maintenance',
    body: 'Updates, backups, security monitoring, and improvements handled every single month.',
  },
  {
    title: 'Digital Marketing',
    body: 'Targeted campaigns that reach your specific customers in Beaufort and beyond.',
  },
]

const PROCESS = [
  'Conversation',
  'Strategy',
  'Design',
  'Build',
  'Launch',
  'Partnership',
]

export default function ServicesPage() {
  return (
    <SubpageShell
      label="What We Do"
      title="Full-Service Solutions"
      lede="Everything your business needs to succeed online, delivered by one person who's invested in your success."
      hero={{
        image: '/images/scenes/scene-5-desktop.webp', // concept 6 — the monitor
        imageMobile: '/images/scenes/scene-5-mobile.webp',
        position: 'center 30%',
        headline: ['Full-Service', 'Solutions'],
        goldText: 'Solutions',
      }}
    >
      <ul className="sub-grid">
        {SERVICES.map((s) => (
          <li className="sub-card" key={s.title}>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ul>

      <h2>Your Journey With Us</h2>
      <p className="lede">
        A clear, collaborative process that keeps you in control — from first
        call to launch day and beyond.
      </p>
      <ol className="process-steps" style={{ marginTop: '2rem' }}>
        {PROCESS.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>

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
