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
      hero={{
        image: '/images/scenes/scene-6-desktop.webp', // concept 7 — the window
        imageMobile: '/images/scenes/scene-6-mobile.webp',
        position: 'center 45%',
        headline: ["Let's Talk"],
        goldText: 'Talk',
      }}
    >
      <div className="contact-grid">
        <div className="contact-info">
          <h2 style={{ marginTop: 0 }}>Reach Us</h2>
          <div className="contact-rows">
            <div>
              <p className="page-label">Call</p>
              <p className="contact-val">
                <a href="tel:+18432630072">(843) 263-0072</a>
              </p>
            </div>
            <div>
              <p className="page-label">Email</p>
              <p className="contact-val">
                <a href="mailto:asmalls@integritywebcreations.com">
                  asmalls@integritywebcreations.com
                </a>
              </p>
            </div>
            <div>
              <p className="page-label">Based In</p>
              <p className="contact-val">Beaufort, South Carolina</p>
            </div>
            <div>
              <p className="page-label">Serving</p>
              <p className="contact-val">
                Beaufort, Savannah, Atlanta &amp; beyond
              </p>
            </div>
          </div>
        </div>
        <div className="form-card">
          <p className="form-panel__title">Send a Message</p>
          <ContactForm />
        </div>
      </div>
    </SubpageShell>
  )
}
