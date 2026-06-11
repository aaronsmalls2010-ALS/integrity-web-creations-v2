'use client'

import { useState } from 'react'
import { track } from '@/lib/analytics'

// service options from the live site's contact form (2026-06-11)
const SERVICES = [
  'New Website',
  'Website Redesign',
  'SEO',
  'E-Commerce',
  'Maintenance',
  'Brand Identity',
  'Something Else',
]

type Status = 'idle' | 'sending' | 'success' | 'error'

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    const data = Object.fromEntries(new FormData(e.currentTarget).entries())
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(String(res.status))
      setStatus('success')
      track('contact_submitted')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <p className="form-status is-success" role="status">
        Message received — you&rsquo;ll hear back from A. Smalls directly, not
        a chatbot or a sales team. Most messages are answered the same day.
      </p>
    )
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <div className="cf-field">
        <label htmlFor="cf-name">Name</label>
        <input id="cf-name" name="name" required autoComplete="name" />
      </div>
      <div className="cf-field">
        <label htmlFor="cf-business">Business Name</label>
        <input id="cf-business" name="business" autoComplete="organization" />
      </div>
      <div className="cf-field">
        <label htmlFor="cf-email">Email</label>
        <input
          id="cf-email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div className="cf-field">
        <label htmlFor="cf-phone">Phone</label>
        <input id="cf-phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div className="cf-field cf-field--full">
        <label htmlFor="cf-service">Service</label>
        <select id="cf-service" name="service" defaultValue={SERVICES[0]}>
          {SERVICES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="cf-field cf-field--full">
        <label htmlFor="cf-message">Message</label>
        <textarea id="cf-message" name="message" rows={4} required />
      </div>

      {/* honeypot */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="cf-website">Website</label>
        <input id="cf-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="cf-field cf-field--full">
        <button
          type="submit"
          className="cta cta--primary"
          disabled={status === 'sending'}
        >
          {status === 'sending' ? 'Sending…' : 'Send Message'}
        </button>
      </div>

      {status === 'error' && (
        <p className="form-status is-error cf-field--full" role="alert">
          Something went wrong sending your message. Email{' '}
          <a href="mailto:asmalls@integritywebcreations.com">
            asmalls@integritywebcreations.com
          </a>{' '}
          or call <a href="tel:+18432630072">(843) 263-0072</a> directly.
        </p>
      )}
    </form>
  )
}
