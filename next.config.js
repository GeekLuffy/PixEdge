/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            // Server Actions body limit (not related to API route uploads)
            bodySizeLimit: '50mb',
        },
    },
    // Allow long-running upload requests in production
    // Self-hosted / Railway / VPS: no platform timeout enforced
    // Vercel Pro: respects maxDuration set per-route
    serverExternalPackages: ['telegram'],
};

module.exports = nextConfig;
