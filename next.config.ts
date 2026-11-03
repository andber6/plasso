import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Listing photos (max 4 MB) are uploaded through a server action. Vercel
    // Functions cap request bodies at 4.5 MB, so don't raise this further.
    serverActions: { bodySizeLimit: '4.5mb' },
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
};

export default nextConfig;
