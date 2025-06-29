/** @type {import('next').NextConfig} */
// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/dashboard/modules/:path*',
        destination: '/dashboard/modules/[...moduleName]',
      },
    ];
  },
};