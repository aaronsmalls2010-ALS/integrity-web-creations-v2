import type { Metadata } from 'next'
import SubpageShell from '@/components/site/SubpageShell'

export const metadata: Metadata = {
  title: 'Privacy — Integrity Web Creations',
  description: 'Privacy policy for integritywebcreations.com.',
}

// Stub — final copy is an OPEN QUESTION for Aaron (brief). Factual minimum.
export default function PrivacyPage() {
  return (
    <SubpageShell
      label="Legal"
      title="Privacy"
      lede="We keep it simple: this site collects only what you choose to send us."
    >
      <p style={{ maxWidth: '62ch' }}>
        When you submit the contact form, the details you provide (name,
        business, email, phone, and your message) are emailed directly to
        Integrity Web Creations and used solely to respond to your inquiry.
        We don&rsquo;t sell or share your information. The site uses
        privacy-friendly, cookieless analytics (Vercel Analytics) to
        understand aggregate visits. Questions? Email{' '}
        <a href="mailto:asmalls@integritywebcreations.com">
          asmalls@integritywebcreations.com
        </a>
        .
      </p>
    </SubpageShell>
  )
}
