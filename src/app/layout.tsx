import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'PixEdge | Premium Edge Image Hosting',
    description: 'Scalable, edge-based image hosting system that minimizes server bandwidth by redirecting directly to distributed storage infrastructure.',
};

import { Analytics } from "@vercel/analytics/react"

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                {/* Decorative Technical Elements */}
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: -9,
                    pointerEvents: 'none',
                    overflow: 'hidden'
                }}>
                    {/* Top-left corner + icon */}
                    <div style={{
                        position: 'absolute',
                        top: '5%',
                        left: '5%',
                        color: 'rgba(0, 240, 255, 0.15)',
                        fontSize: '24px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                    }}>+</div>
                    
                    {/* Top-right corner x icon */}
                    <div style={{
                        position: 'absolute',
                        top: '5%',
                        right: '5%',
                        color: 'rgba(0, 240, 255, 0.15)',
                        fontSize: '24px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                    }}>×</div>
                    
                    {/* Bottom-left corner + icon */}
                    <div style={{
                        position: 'absolute',
                        bottom: '5%',
                        left: '5%',
                        color: 'rgba(0, 240, 255, 0.15)',
                        fontSize: '24px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                    }}>+</div>
                    
                    {/* Bottom-right corner x icon */}
                    <div style={{
                        position: 'absolute',
                        bottom: '5%',
                        right: '5%',
                        color: 'rgba(0, 240, 255, 0.15)',
                        fontSize: '24px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                    }}>×</div>
                </div>
                
                {children}
                <Analytics />
            </body>
        </html>
    );
}
