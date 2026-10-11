/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            // Server Actions body limit
            bodySizeLimit: '2gb',
        },
    },
    // Allow long-running upload requests in production
    // Self-hosted / Railway / VPS: no platform timeout enforced
    // Vercel Pro: respects maxDuration set per-route
    serverExternalPackages: ['telegram'],
};

module.exports = nextConfig;
