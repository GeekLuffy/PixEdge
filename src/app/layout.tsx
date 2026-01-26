import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'PixEdge | Premium Edge Image Hosting',
    description: 'Scalable, edge-based image hosting system that minimizes server bandwidth by redirecting directly to distributed storage infrastructure.',
};

import { Providers } from './providers';
import { Analytics } from "@vercel/analytics/react"

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <Providers>
                    {children}
                    <Analytics />
                </Providers>
            </body>
        </html>
    );
}
