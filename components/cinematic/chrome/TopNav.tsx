'use client'

import { useState } from 'react'

const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

/** Site navigation lives in fixed chrome — no below-fold content exists.
 *  Collapses to a hamburger when width OR height is tight; the overlay can
 *  be closed via the ✕ button, the toggle, or tapping the backdrop. */
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
        <span
          className={`top-nav__menu-icon${open ? ' is-open' : ''}`}
          aria-hidden="true"
        />
      </button>
      <div
        id="mobile-menu"
        className={open ? 'is-open' : ''}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false) // backdrop tap
        }}
      >
        <button
          type="button"
          className="mobile-menu__close"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
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
