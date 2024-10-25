/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['www.cbm.sc.gov.br'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.cbm.sc.gov.br',
        pathname: '/images/**',
      },
    ],
  },
}

module.exports = nextConfig