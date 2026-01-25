import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        success: true,
        version: 'v2.0.0',
        status: 'beta',
        documentation: '/docs',
        features: {
            authentication: 'JWT and API key support',
            rate_limiting: 'Higher limits for authenticated users',
            webhooks: 'Event notifications',
            api_keys: 'Programmatic access with custom rate limits'
        },
        endpoints: {
            auth: {
                register: '/api/v2/auth/register',
                login: '/api/v2/auth/login',
                logout: '/api/v2/auth/logout',
                me: '/api/v2/auth/me'
            },
            keys: {
                list: '/api/v2/keys',
                create: '/api/v2/keys',
                delete: '/api/v2/keys/[id]',
                revoke: '/api/v2/keys/[id] (PATCH)'
            },
            webhooks: {
                list: '/api/v2/webhooks',
                create: '/api/v2/webhooks'
            },
            upload: '/api/v2/upload',
            info: '/api/v1/info/[id]'
        },
        message: 'PixEdge API v2 is in BETA. Authentication is optional but recommended for higher rate limits.',
        beta_notice: 'This API version is currently in beta. Features may change before stable release.'
    });
}
