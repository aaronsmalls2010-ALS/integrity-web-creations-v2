import type { Metadata } from 'next'
import SubpageShell from '@/components/site/SubpageShell'

export const metadata: Metadata = {
  title: 'About — Integrity Web Creations',
  description:
    'One person. Full attention. No shortcuts. A. Smalls — founder of Integrity Web Creations, USC Computer Engineering graduate, Beaufort, SC native.',
}

// Content sourced from www.integritywebcreations.com (2026-06-11)
const VALUES = [
  {
    title: 'Integrity',
    body: 'We do what we say, say what we mean, and always put your business first.',
  },
  {
    title: 'Personal Service',
    body: 'One person, fully invested. Not a ticket number — a real relationship.',
  },
  {
    title: 'Accessibility',
    body: 'Professional web presence should be within reach of every small business.',
  },
  {
    title: 'Partnership',
    body: 'We grow with you. Your success is our success — month after month.',
  },
]

const WHY = [
  {
    title: 'Your Website Is Your First Impression',
    body: 'Before a customer ever walks through your door — they Google you.',
  },
  {
    title: "Templates Don't Tell Your Story",
    body: 'Squarespace, Wix, GoDaddy — they all promise easy. But easy means generic.',
  },
  {
    title: 'You Deserve a Partner, Not a Vendor',
    body: 'Big agencies assign you a ticket number. At IWC, you get a real person.',
  },
  {
    title: 'Neglected Sites Cost You Money',
    body: "Slow load times, broken links, security warnings — all tell customers this business doesn't care.",
  },
  {
    title: 'Local Matters',
    body: 'When something goes wrong, you want someone a phone call away. Not a chatbot.',
  },
]

export default function AboutPage() {
  return (
    <SubpageShell
      label="About IWC"
      title="Built With Integrity"
      lede="One person. Full attention. No shortcuts. That's the promise behind every project."
      hero={{
        image: '/images/scenes/scene-4-desktop.webp', // concept 5 — the office
        imageMobile: '/images/scenes/scene-4-mobile.webp',
        position: 'center 38%',
        headline: ['Built With', 'Integrity'],
        goldText: 'Integrity',
      }}
    >
      <h2>One Person. Your Full Attention.</h2>
      <p className="lede">
        I&rsquo;m A. Smalls — founder of Integrity Web Creations, USC Computer
        Engineering graduate (Class of 2010), and a Beaufort, SC native. After
        graduation I came home to make professional web services accessible to
        local small businesses. Every conversation, every design decision, and
        every line of code — that&rsquo;s me, not an account manager or a
        rotating bench of developers. I keep the company intentionally small
        so I can serve fewer clients exceptionally well.
      </p>

      <h2>Core Values</h2>
      <ul className="sub-grid">
        {VALUES.map((v) => (
          <li className="sub-card" key={v.title}>
            <h3>{v.title}</h3>
            <p>{v.body}</p>
          </li>
        ))}
      </ul>

      <h2>The Road From 2010</h2>
      {/* timeline copy is DRAFT — drawn from live-site facts, needs Aaron's read */}
      <ol className="timeline">
        <li>
          <p className="timeline__year">2010</p>
          <h3>Came Home to Beaufort</h3>
          <p>
            Fresh out of USC with a Computer Engineering degree, A. Smalls
            returns to the Lowcountry with one goal: make professional web
            services accessible to local small businesses.
          </p>
        </li>
        <li>
          <p className="timeline__year">The Years Between</p>
          <h3>Real Businesses, Real Results</h3>
          <p>
            Churches, sports unions, medical practices, travel agencies,
            marinas — custom builds for real businesses from Beaufort to
            Savannah to Atlanta, every one designed from scratch.
          </p>
        </li>
        <li>
          <p className="timeline__year">Today</p>
          <h3>Fifteen Years. Zero Templates.</h3>
          <p>
            Still intentionally small, still one person with your full
            attention — serving fewer clients exceptionally well, month after
            month.
          </p>
        </li>
      </ol>

      <h2>Why We Matter</h2>
      <p className="lede">
        In a world of templates and chatbots — here&rsquo;s why a dedicated
        web partner changes everything.
      </p>
      <ol className="sub-grid" style={{ marginTop: '2rem' }}>
        {WHY.map((w, i) => (
          <li className="sub-card" key={w.title}>
            <p className="sub-meta">0{i + 1}</p>
            <h3>{w.title}</h3>
            <p>{w.body}</p>
          </li>
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
