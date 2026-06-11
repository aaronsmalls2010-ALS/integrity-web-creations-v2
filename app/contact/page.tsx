import type { Metadata } from 'next'
import SubpageShell from '@/components/site/SubpageShell'
import ContactForm from '@/components/site/ContactForm'

export const metadata: Metadata = {
  title: 'Contact — Integrity Web Creations',
  description:
    "Let's talk. You'll hear back from A. Smalls directly — not a chatbot, not a sales team. Most messages answered same day. Serving Beaufort, Savannah, Atlanta & beyond.",
}

export default function ContactPage() {
  return (
    <SubpageShell
      label="Get in Touch"
      title="Let's Talk"
      lede="You'll hear back from A. Smalls directly — not a chatbot, not a sales team. Most messages answered same day."
    >
      <div className="contact-grid">
        <div>
          <h2 style={{ marginTop: 0 }}>Reach Us</h2>
          <p>
            <a href="tel:+18432630072">(843) 263-0072</a>
            <br />
            <a href="mailto:asmalls@integritywebcreations.com">
              asmalls@integritywebcreations.com
            </a>
            <br />
            Beaufort, South Carolina
          </p>
          <p style={{ marginTop: '1.2rem' }}>
            Serving Beaufort, Savannah, Atlanta &amp; beyond.
          </p>
        </div>
        <ContactForm />
      </div>
    </SubpageShell>
  )
}
