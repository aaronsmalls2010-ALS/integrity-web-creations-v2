import type { NextConfig } from 'next'

/**
 * The CRM (Astro + Supabase invoicing system, `crm-live` branch / `master`)
 * stays deployed on the integrity-web-creations-v2 Vercel project. This app
 * fronts the public domain and PROXIES the CRM paths to it, so every
 * existing URL keeps working: /admin bookmarks, /api/admin clients, the
 * Stripe webhook, and the /i/<token> invoice links already sent to clients
 * by email. Override the target with CRM_ORIGIN on the Vercel project.
 */
const CRM_ORIGIN = process.env.CRM_ORIGIN ?? 'https://crm.integritywebcreations.com'

const nextConfig: NextConfig = {
  images: {
    // Scene masters are 1536w (source-native) — cap generated variants there.
    deviceSizes: [768, 1080, 1536],
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/admin', destination: `${CRM_ORIGIN}/admin` },
        { source: '/admin/:path*', destination: `${CRM_ORIGIN}/admin/:path*` },
        { source: '/api/admin/:path*', destination: `${CRM_ORIGIN}/api/admin/:path*` },
        { source: '/api/webhooks/:path*', destination: `${CRM_ORIGIN}/api/webhooks/:path*` },
        { source: '/i/:path*', destination: `${CRM_ORIGIN}/i/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    }
  },
}

export default nextConfig
