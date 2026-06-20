/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typedRoutes: true,
  images: {
    // Google profile photos come back from `lh{3..6}.googleusercontent.com`. The
    // app-shell uses a plain `<img>` for the small avatar to stay framework-agnostic,
    // but if a downstream page upgrades to `next/image` for richer media these
    // hosts need to be allow-listed or rendering throws "Invalid src prop".
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh6.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
