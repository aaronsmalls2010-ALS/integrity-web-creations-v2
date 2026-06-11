'use client'

import { useState } from 'react'

const LINKS = [
  { label: 'Services', href: '/services' }, // Phase 2 route
  { label: 'Portfolio', href: '/portfolio' }, // Phase 2 route
  { label: 'About', href: '/about' }, // Phase 2 route
  { label: 'Contact', href: '/contact' },
]

/** Site navigation lives in fixed chrome — no below-fold content exists. */
export default function TopNav() {
  const [open, setOpen] = useState(false)
  return (
    <nav id="top-nav" aria-label="Site">
      <ul className="top-nav__links">
        {LINKS.map((l) => (
          <li key={l.label}>
            <a href={l.href}>{l.label}</a>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="top-nav__menu-btn"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(!open)}
      >
        <span className="visually-hidden">Menu</span>
        <span className="top-nav__menu-icon" aria-hidden="true" />
      </button>
      <div id="mobile-menu" className={open ? 'is-open' : ''}>
        <ul>
          {LINKS.map((l) => (
            <li key={l.label}>
              <a href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
