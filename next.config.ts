import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Vercel Blob para uploads de áudio (Milestone 2)
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
}

export default nextConfig
