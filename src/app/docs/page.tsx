'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Code2, Terminal, Cpu, ArrowLeft, Copy, Check,
    Book, Zap, Shield, Globe, Layers, Server
} from 'lucide-react';
import Link from 'next/link';

type Language = 'bash' | 'python' | 'javascript' | 'go';

export default function Docs() {
    const [copied, setCopied] = useState<string | null>(null);
    const [baseUrl, setBaseUrl] = useState('');
    const [activeLang, setActiveLang] = useState<Language>('bash');
    const [activeSection, setActiveSection] = useState('getting-started');

    useEffect(() => {
        setBaseUrl(window.location.origin);
    }, []);

    const copyCode = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const snippets = {
        bash: `curl -X POST ${baseUrl || 'http://localhost:3000'}/api/v1/upload \\
  -F "file=@/path/to/image.jpg" \\
  -F "customId=my-slug"`,
        python: `import requests

url = "${baseUrl || 'http://localhost:3000'}/api/v1/upload"
files = {'file': open('image.jpg', 'rb')}
data = {'customId': 'my-slug'}

response = requests.post(url, files=files, data=data)
print(response.json())`,
        javascript: `const formData = new FormData();
formData.append('file', imageFile);
formData.append('customId', 'my-slug');

const res = await fetch('${baseUrl || 'http://localhost:3000'}/api/v1/upload', {
  method: 'POST',
  body: formData
});

const data = await res.json();
console.log(data);`,
        go: `package main

import (
    "bytes"
    "io"
    "mime/multipart"
    "net/http"
    "os"
)

func main() {
    url := "${baseUrl || 'http://localhost:3000'}/api/v1/upload"
    // ... setup multipart/form-data request ...
    // Full example omitted for brevity
}`
    };

    const responseExample = `{
  "success": true,
  "data": {
    "id": "my-slug",
    "url": "${baseUrl || 'https://pixedge.link'}/i/my-slug",
    "direct_url": "${baseUrl || 'https://pixedge.link'}/i/my-slug.jpg",
    "timestamp": 1705500000000
  }
}`;

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveSection(id)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                background: activeSection === id ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                border: 'none',
                color: activeSection === id ? '#8b5cf6' : '#71717a',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: activeSection === id ? '600' : '400',
                transition: 'all 0.2s'
            }}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <main style={{
            background: '#050505',
            minHeight: '100vh',
            color: '#e4e4e7',
            display: 'flex',
            fontFamily: "'Outfit', sans-serif"
        }}>
            {/* Sidebar */}
            <aside style={{
                width: '280px',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                padding: '2rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                position: 'fixed',
                height: '100vh'
            }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'white' }}>
                    <div style={{ background: '#8b5cf6', padding: '6px', borderRadius: '8px' }}>
                        <Zap size={20} fill="white" />
                    </div>
                    <span style={{ fontWeight: '800', fontSize: '1.2rem', letterSpacing: '-0.5px' }}>PixEdge</span>
                </Link>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#3f3f46', marginLeft: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>Introduction</p>
                    <SidebarItem id="getting-started" label="Getting Started" icon={Book} />
                    <SidebarItem id="authentication" label="Authentication" icon={Shield} />

                    <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#3f3f46', marginLeft: '12px', marginBottom: '8px', marginTop: '1.5rem', textTransform: 'uppercase' }}>Endpoints</p>
                    <SidebarItem id="upload" label="Upload Image" icon={Terminal} />
                    <SidebarItem id="info" label="Get Metadata" icon={Cpu} />
                </div>
            </aside>

            {/* Main Content */}
            <div style={{ flex: 1, marginLeft: '280px', padding: '4rem 5rem' }}>
                <header style={{ marginBottom: '4rem' }}>
                    <Link href="/" style={{ color: '#71717a', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <ArrowLeft size={16} /> Home
                    </Link>
                    <h1 style={{ fontSize: '3rem', fontWeight: '800', color: 'white', marginBottom: '1rem' }}>Documentation</h1>
                    <p style={{ color: '#a1a1aa', fontSize: '1.1rem' }}>API v1.0.0 — The complete reference for PixEdge developers.</p>
                </header>

                <div style={{ maxWidth: '800px' }}>
                    {activeSection === 'getting-started' && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 style={{ fontSize: '1.8rem', color: 'white', marginBottom: '1.5rem' }}>Getting Started</h2>
                            <p style={{ color: '#a1a1aa', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                                PixEdge provides a high-performance REST API for uploading and managing images via our Telegram-backed edge storage.
                                Our storage is 100% free, decentralized, and infinitely scalable.
                            </p>
                            <div style={{
                                background: 'rgba(139, 92, 246, 0.05)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                display: 'flex',
                                gap: '1rem'
                            }}>
                                <Zap color="#8b5cf6" style={{ flexShrink: 0 }} />
                                <div>
                                    <h4 style={{ color: '#8b5cf6', marginBottom: '4px' }}>Pro Tip</h4>
                                    <p style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>
                                        All API responses are in JSON format. We recommend using versioned endpoints (e.g., /api/v1/...) for better stability.
                                    </p>
                                </div>
                            </div>
                        </motion.section>
                    )}
                    {activeSection === 'authentication' && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 style={{ fontSize: '1.8rem', color: 'white', marginBottom: '1.5rem' }}>Authentication</h2>
                            <p style={{ color: '#a1a1aa', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                                Currently, the SnapEdge Public API is **open access**. No API keys are required to upload or retrieve image metadata.
                                However, to prevent abuse, we implement global rate limiting based on IP addresses.
                            </p>
                            <div style={{
                                background: 'rgba(59, 130, 246, 0.05)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                color: '#3b82f6'
                            }}>
                                <Server size={20} style={{ marginBottom: '10px' }} />
                                <h4 style={{ marginBottom: '4px' }}>Upcoming: Private Keys</h4>
                                <p style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>
                                    We are working on a dashboard feature to allow developers to generate private API keys for higher rate limits and image management.
                                </p>
                            </div>
                        </motion.section>
                    )}

                    {activeSection === 'info' && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                                <span style={{ background: '#3b82f6', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>GET</span>
                                <h2 style={{ fontSize: '1.8rem', color: 'white', margin: 0 }}>/api/v1/info/[id]</h2>
                            </div>

                            <p style={{ color: '#a1a1aa', lineHeight: '1.7', marginBottom: '2rem' }}>
                                Retrieve real-time statistics and deep metadata for any image hosted on SnapEdge.
                            </p>

                            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '20px' }}>
                                <div style={{ marginBottom: '10px', color: '#71717a', fontSize: '0.8rem' }}>RESPONSE SCHEMA</div>
                                <pre style={{ margin: 0 }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: '#d1d1d6', fontSize: '0.85rem' }}>{`{
  "success": true,
  "data": {
    "id": "example-id",
    "url": "https://pixedge.link/i/example-id",
    "views": 42,
    "created_at": 1705500000000,
    "metadata": {
      "size": 102400,
      "type": "image/jpeg"
    }
  }
}`}</code>
                                </pre>
                            </div>
                        </motion.section>
                    )}

                    {activeSection === 'upload' && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                                <span style={{ background: '#10b981', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>POST</span>
                                <h2 style={{ fontSize: '1.8rem', color: 'white', margin: 0 }}>/api/v1/upload</h2>
                            </div>

                            <p style={{ color: '#a1a1aa', lineHeight: '1.7', marginBottom: '2rem' }}>
                                This endpoint allows you to upload an image file. It returns a clean URL that utilizes our edge redirection proxy.
                            </p>

                            <h4 style={{ marginBottom: '1rem', color: '#71717a', fontSize: '0.8rem', textTransform: 'uppercase' }}>Request Body</h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <th style={{ textAlign: 'left', padding: '12px', color: '#71717a', fontSize: '0.9rem' }}>Field</th>
                                        <th style={{ textAlign: 'left', padding: '12px', color: '#71717a', fontSize: '0.9rem' }}>Type</th>
                                        <th style={{ textAlign: 'left', padding: '12px', color: '#71717a', fontSize: '0.9rem' }}>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px', fontFamily: 'monospace', color: '#8b5cf6' }}>file</td>
                                        <td style={{ padding: '12px', color: '#a1a1aa' }}>File</td>
                                        <td style={{ padding: '12px', color: '#a1a1aa' }}>Multipart image file (max 20MB)</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px', fontFamily: 'monospace', color: '#8b5cf6' }}>customId</td>
                                        <td style={{ padding: '12px', color: '#a1a1aa' }}>String</td>
                                        <td style={{ padding: '12px', color: '#a1a1aa' }}>Optional vanity slug for the link</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', overflow: 'hidden' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 20px', display: 'flex', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    {(['bash', 'python', 'javascript'] as Language[]).map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => setActiveLang(lang)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: activeLang === lang ? '#8b5cf6' : '#71717a',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                padding: '4px 0',
                                                borderBottom: activeLang === lang ? '2px solid #8b5cf6' : '2px solid transparent',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {lang.toUpperCase()}
                                        </button>
                                    ))}
                                    <div style={{ marginLeft: 'auto' }}>
                                        <button onClick={() => copyCode(snippets[activeLang as keyof typeof snippets] || '', 'main')} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}>
                                            {copied === 'main' ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <pre style={{ padding: '24px', fontSize: '0.9rem', margin: 0, overflowX: 'auto', background: 'transparent' }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: '#d1d1d6', lineHeight: '1.6' }}>
                                        {snippets[activeLang as keyof typeof snippets]}
                                    </code>
                                </pre>
                            </div>

                            <h4 style={{ marginTop: '3rem', marginBottom: '1rem', color: '#71717a', fontSize: '0.8rem', textTransform: 'uppercase' }}>Response Example</h4>
                            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '20px' }}>
                                <pre style={{ margin: 0 }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: '#10b981', fontSize: '0.85rem' }}>{responseExample}</code>
                                </pre>
                            </div>
                        </motion.section>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Outfit:wght@300;400;600;800&display=swap');
                
                body {
                    margin: 0;
                    padding: 0;
                    background: #050505;
                }

                * {
                    box-sizing: border-box;
                }

                ::-webkit-scrollbar {
                    width: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.1);
                }
            `}</style>
        </main>
    );
}
