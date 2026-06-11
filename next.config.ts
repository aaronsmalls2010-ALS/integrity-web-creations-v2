import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Scene masters are 1536w (source-native) — cap generated variants there.
    deviceSizes: [768, 1080, 1536],
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
