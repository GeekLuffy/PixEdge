'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Code2, Terminal, Cpu, ArrowLeft, Copy, Check,
    Book, Zap, Shield, Globe, Layers, Server,
    Menu, X, Activity, AlertCircle, Box, MessageSquare,
    Sun, Moon
} from 'lucide-react';
import Link from 'next/link';

type Language = 'bash' | 'python' | 'javascript' | 'go';

export default function Docs() {
    const [copied, setCopied] = useState<string | null>(null);
    const [baseUrl, setBaseUrl] = useState('');
    const [activeLang, setActiveLang] = useState<Language>('bash');
    const [activeSection, setActiveSection] = useState('getting-started');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        setBaseUrl(window.location.origin);
        const savedTheme = localStorage.getItem('pixedge_theme') as 'dark' | 'light';
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('pixedge_theme', newTheme);
    };

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
            onClick={() => {
                setActiveSection(id);
                setIsMobileMenuOpen(false);
            }}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                background: activeSection === id ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                border: 'none',
                borderLeft: activeSection === id ? '2px solid #00F0FF' : '2px solid transparent',
                color: activeSection === id ? '#00F0FF' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: activeSection === id ? '600' : '400',
                transition: 'all 0.3s',
                position: 'relative'
            }}
            onMouseEnter={(e) => {
                if (activeSection !== id) {
                    e.currentTarget.style.color = '#00F0FF';
                    e.currentTarget.style.textShadow = '0 0 8px rgba(0, 240, 255, 0.5)';
                }
            }}
            onMouseLeave={(e) => {
                if (activeSection !== id) {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.textShadow = 'none';
                }
            }}
        >
            <Icon size={18} color={activeSection === id ? '#00F0FF' : 'var(--text-muted)'} />
            {label}
        </button>
    );

    return (
        <main style={{
            background: '#000000',
            minHeight: '100vh',
            color: 'var(--text-main)',
            display: 'flex',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Mobile Header */}
            <header className="mobile-header">
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--text-main)' }}>
                    <Zap size={18} fill="#00F0FF" color="#00F0FF" />
                    <span style={{ fontWeight: '900', fontSize: '1rem', fontFamily: "'Inter', sans-serif" }}>Pix<span style={{ color: '#00F0FF' }}>Edge</span></span>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={toggleTheme} style={{ 
                        background: 'transparent', 
                        border: '1px solid rgba(0, 240, 255, 0.2)', 
                        borderRadius: '8px',
                        padding: '6px',
                        color: '#00F0FF', 
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        boxShadow: '0 0 8px rgba(0, 240, 255, 0.15)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#00F0FF';
                        e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 240, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.2)';
                        e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 240, 255, 0.15)';
                    }}
                    >
                        {theme === 'dark' ? <Sun size={20} color="#00F0FF" /> : <Moon size={20} color="#00F0FF" />}
                    </button>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="menu-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#00F0FF', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'JetBrains Mono', monospace" }}>Menu</span>
                        {isMobileMenuOpen ? <X size={24} color="#00F0FF" /> : <Menu size={24} color="#00F0FF" />}
                    </button>
                </div>
            </header>

            {/* Sidebar */}
            <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <Link href="/" className="sidebar-logo">
                    <div style={{ background: '#00F0FF', padding: '6px', borderRadius: '8px', boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)' }}>
                        <Zap size={20} fill="#000000" color="#000000" />
                    </div>
                    <span style={{ fontWeight: '900', fontSize: '1.2rem', letterSpacing: '-0.5px', fontFamily: "'Inter', sans-serif" }}>Pix<span style={{ color: '#00F0FF' }}>Edge</span></span>
                </Link>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#00F0FF', opacity: 0.8, marginLeft: '12px', marginBottom: '8px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>INTRODUCTION</p>
                    <SidebarItem id="getting-started" label="Getting Started" icon={Book} />
                    <SidebarItem id="authentication" label="Authentication" icon={Shield} />

                    <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#00F0FF', opacity: 0.8, marginLeft: '12px', marginBottom: '8px', marginTop: '1.5rem', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>ENDPOINTS</p>
                    <SidebarItem id="upload" label="Upload Media" icon={Terminal} />
                    <SidebarItem id="info" label="Get Metadata" icon={Cpu} />

                    <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#00F0FF', opacity: 0.8, marginLeft: '12px', marginBottom: '8px', marginTop: '1.5rem', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>REFERENCE</p>
                    <SidebarItem id="rate-limiting" label="Rate Limiting" icon={Activity} />
                    <SidebarItem id="errors" label="Error Codes" icon={AlertCircle} />
                    <SidebarItem id="telegram-bot" label="Telegram Bot" icon={MessageSquare} />
                    <SidebarItem id="sdk" label="SDKs" icon={Box} />
                    <div style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={toggleTheme}
                            style={{
                                background: '#000000',
                                border: '1px solid rgba(0, 240, 255, 0.2)',
                                borderRadius: '8px',
                                padding: '10px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: '#00F0FF',
                                cursor: 'pointer',
                                width: '100%',
                                justifyContent: 'center',
                                fontWeight: '600',
                                transition: 'all 0.3s',
                                boxShadow: '0 0 8px rgba(0, 240, 255, 0.15)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#00F0FF';
                                e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 240, 255, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.2)';
                                e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 240, 255, 0.15)';
                            }}
                        >
                            {theme === 'dark' ? <Sun size={18} color="#00F0FF" /> : <Moon size={18} color="#00F0FF" />}
                            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="content-wrapper" style={{ position: 'relative' }}>
                {/* Decorative Technical Elements */}
                <div style={{
                    position: 'absolute',
                    top: '2rem',
                    left: '2rem',
                    color: 'rgba(0, 240, 255, 0.1)',
                    fontSize: '24px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    zIndex: 0,
                    pointerEvents: 'none'
                }}>+</div>
                <div style={{
                    position: 'absolute',
                    top: '2rem',
                    right: '2rem',
                    color: 'rgba(0, 240, 255, 0.1)',
                    fontSize: '24px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    zIndex: 0,
                    pointerEvents: 'none'
                }}>×</div>
                <div style={{
                    position: 'absolute',
                    bottom: '2rem',
                    left: '2rem',
                    color: 'rgba(0, 240, 255, 0.1)',
                    fontSize: '24px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    zIndex: 0,
                    pointerEvents: 'none'
                }}>+</div>
                <div style={{
                    position: 'absolute',
                    bottom: '2rem',
                    right: '2rem',
                    color: 'rgba(0, 240, 255, 0.1)',
                    fontSize: '24px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    zIndex: 0,
                    pointerEvents: 'none'
                }}>×</div>

                <header style={{ marginBottom: '4rem', position: 'relative', zIndex: 1 }}>
                    <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', transition: 'all 0.3s' }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#00F0FF';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                    >
                        <ArrowLeft size={16} /> Home
                    </Link>
                    <h1 style={{ fontSize: '3rem', fontWeight: '900', color: '#FFFFFF', marginBottom: '1rem', fontFamily: "'Inter', sans-serif" }}>Documentation</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ 
                            background: 'rgba(0, 240, 255, 0.1)', 
                            border: '1px solid #00F0FF',
                            color: '#00F0FF', 
                            fontSize: '0.85rem', 
                            fontWeight: '600',
                            padding: '6px 12px', 
                            borderRadius: '100px',
                            fontFamily: "'JetBrains Mono', monospace",
                            boxShadow: '0 0 8px rgba(0, 240, 255, 0.2)'
                        }}>API v1.0.0</span>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0 }}>The complete reference for PixEdge developers.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: "'JetBrains Mono', monospace" }}>
                        <ArrowLeft size={14} style={{ transform: 'rotate(90deg)' }} />
                        <span>Navigate using the sidebar to explore endpoints</span>
                    </div>
                </header>

                <div style={{ maxWidth: '800px', position: 'relative', zIndex: 1 }}>
                    {activeSection === 'getting-started' && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Getting Started</h2>
                            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                                PixEdge provides a high-performance REST API for uploading and managing images, GIFs, and videos via our Telegram-backed edge storage.
                                Our storage is 100% free, decentralized, and infinitely scalable.
                            </p>
                            <div style={{
                                background: 'rgba(0, 240, 255, 0.05)',
                                border: '1px solid #00F0FF',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                display: 'flex',
                                gap: '1rem',
                                backdropFilter: 'blur(20px)',
                                boxShadow: '0 0 12px rgba(0, 240, 255, 0.15)'
                            }}>
                                <Zap color="#00F0FF" style={{ flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.5))' }} />
                                <div>
                                    <h4 style={{ color: '#00F0FF', marginBottom: '4px', fontWeight: '700', fontFamily: "'Inter', sans-serif" }}>Pro Tip</h4>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                                        All API responses are in JSON format. We recommend using versioned endpoints (e.g., /api/v1/...) for better stability.
                                    </p>
                                </div>
                            </div>
                        </motion.section>
                    )}
                    {activeSection === 'authentication' && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Authentication</h2>
                            
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.3rem', color: 'var(--text-main)', marginBottom: '1rem' }}>API v1 (Public Access)</h3>
                                <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '1rem' }}>
                                    The PixEdge Public API v1 is **open access**. No API keys are required to upload or retrieve image metadata.
                                    However, to prevent abuse, we implement global rate limiting based on IP addresses (20 requests/minute).
                                </p>
                            </div>

                            <div style={{
                                background: 'rgba(0, 240, 255, 0.1)',
                                border: '1px solid #00F0FF',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                marginBottom: '1.5rem',
                                backdropFilter: 'blur(20px)',
                                boxShadow: '0 0 12px rgba(0, 240, 255, 0.15)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <Shield size={20} color="#00F0FF" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.5))' }} />
                                    <h4 style={{ margin: 0, color: '#00F0FF', fontFamily: "'Inter', sans-serif", fontWeight: '700' }}>API v2 (Beta) - API Keys Available</h4>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '12px',
                                        background: '#00F0FF',
                                        border: '1px solid #00F0FF',
                                        color: '#000000',
                                        fontSize: '0.75rem',
                                        fontWeight: '800',
                                        marginLeft: 'auto',
                                        fontFamily: "'JetBrains Mono', monospace",
                                        textTransform: 'uppercase',
                                        boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
                                    }}>BETA</span>
                                </div>
                                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '1rem' }}>
                                    API v2 introduces authentication with **API Keys** and **JWT tokens**. Create an account and generate API keys from the <Link href="/dashboard" style={{ color: '#00F0FF', textDecoration: 'underline', textShadow: '0 0 8px rgba(0, 240, 255, 0.5)' }}>Dashboard</Link> for higher rate limits and advanced features.
                                </p>
                                <div style={{ marginTop: '1rem' }}>
                                    <h5 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Rate Limits:</h5>
                                    <ul style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                                        <li>Anonymous: 20 requests/minute</li>
                                        <li>Authenticated (JWT): 50 requests/minute</li>
                                        <li>API Key: Custom (default: 100 requests/minute)</li>
                                    </ul>
                                </div>
                                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px' }}>
                                    <h5 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Quick Start:</h5>
                                    <ol style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                                        <li>Visit the <Link href="/dashboard" style={{ color: '#00F0FF', textDecoration: 'underline', textShadow: '0 0 8px rgba(0, 240, 255, 0.5)' }}>Dashboard</Link> to create an account</li>
                                        <li>Generate an API key from the Dashboard</li>
                                        <li>Use the API key in the <code style={{ background: 'rgba(0, 0, 0, 0.5)', color: '#00F0FF', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace", border: '1px solid rgba(0, 240, 255, 0.2)' }}>X-API-Key</code> header</li>
                                    </ol>
                                </div>
                            </div>
                        </motion.section>
                    )}

                    {activeSection === 'info' && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                                <span style={{ background: '#00F0FF', color: '#000000', fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace" }}>GET</span>
                                <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', margin: 0, fontFamily: "'Inter', sans-serif" }}>/api/v1/info/<span style={{ color: '#00F0FF' }}>[id]</span></h2>
                            </div>

                            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '2rem' }}>
                                Retrieve real-time statistics and deep metadata for any image hosted on PixEdge.
                            </p>

                            <div style={{ background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '20px', padding: '20px' }}>
                                <div style={{ marginBottom: '10px', color: '#00F0FF', opacity: 0.8, fontSize: '0.8rem', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>RESPONSE SCHEMA</div>
                                <pre style={{ margin: 0 }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00F0FF', fontSize: '0.85rem' }}>{`{
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
                                <span style={{ background: '#00F0FF', color: '#000000', fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace" }}>POST</span>
                                <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', margin: 0, fontFamily: "'Inter', sans-serif" }}><span style={{ color: '#00F0FF', fontFamily: "'JetBrains Mono', monospace" }}>/api/v1/upload</span></h2>
                            </div>

                            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '2rem' }}>
                                This endpoint allows you to upload media files (Images, GIFs, Videos). It returns a clean URL that utilizes our edge redirection proxy.
                            </p>

                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Request Body</h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Field</th>
                                        <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Type</th>
                                        <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px', fontFamily: "'JetBrains Mono', monospace", color: '#00F0FF' }}>file</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>File</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Multipart file (Image/GIF/Video, max 2GB)</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px', fontFamily: "'JetBrains Mono', monospace", color: '#00F0FF' }}>customId</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>String</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Optional vanity slug for the link</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '20px', overflow: 'hidden' }}>
                                <div style={{ background: 'var(--panel-header-bg)', padding: '12px 20px', display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-color)' }}>
                                    {(['bash', 'python', 'javascript'] as Language[]).map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => setActiveLang(lang)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: activeLang === lang ? '#00F0FF' : 'var(--text-muted)',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                padding: '4px 0',
                                                borderBottom: activeLang === lang ? '2px solid #00F0FF' : '2px solid transparent',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {lang.toUpperCase()}
                                        </button>
                                    ))}
                                    <div style={{ marginLeft: 'auto' }}>
                                        <button onClick={() => copyCode(snippets[activeLang as keyof typeof snippets] || '', 'main')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                            {copied === 'main' ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <pre style={{ padding: '24px', fontSize: '0.9rem', margin: 0, overflowX: 'auto', background: 'transparent' }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00F0FF', lineHeight: '1.6' }}>
                                        {snippets[activeLang as keyof typeof snippets]}
                                    </code>
                                </pre>
                            </div>

                            <h4 style={{ marginTop: '3rem', marginBottom: '1rem', color: 'var(--text-muted)', opacity: 0.6, fontSize: '0.8rem', textTransform: 'uppercase' }}>Response Example</h4>
                            <div style={{ background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '20px', padding: '20px' }}>
                                <pre style={{ margin: 0 }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00F0FF', fontSize: '0.85rem' }}>{responseExample}</code>
                                </pre>
                            </div>
                        </motion.section>
                    )}

                    {activeSection === 'rate-limiting' && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Rate Limiting</h2>
                            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                                To ensure peak performance for all PixEdge users, we implement a fair-use rate limiting policy. Limits are applied per IP address.
                            </p>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tier</th>
                                        <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Limit</th>
                                        <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Window</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px', color: 'var(--text-main)' }}>Public (Upload)</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>20 requests</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>1 minute</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px', color: 'var(--text-main)' }}>Public (Info)</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>60 requests</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>1 minute</td>
                                    </tr>
                                </tbody>
                            </table>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Exceeding these limits will result in a <code style={{ color: '#ef4444' }}>429 Too Many Requests</code> response.
                            </p>
                        </motion.section>
                    )}

                    {activeSection === 'errors' && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Error Codes</h2>
                            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '2rem' }}>
                                PixEdge uses standard HTTP response codes to indicate the success or failure of an API request. All error responses follow this JSON structure:
                            </p>
                            <div style={{ background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '20px', padding: '20px', marginBottom: '2rem' }}>
                                <pre style={{ margin: 0 }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00F0FF', fontSize: '0.85rem' }}>{`{
   "success": false,
   "error": {
     "code": "UPLOAD_FAILED",
     "message": "The file provided is too large or not a valid image."
   }
 }`}</code>
                                </pre>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.2)' }}>
                                        <th style={{ textAlign: 'left', padding: '12px', color: '#00F0FF', fontSize: '0.9rem', fontFamily: "'JetBrains Mono', monospace" }}>CODE</th>
                                        <th style={{ textAlign: 'left', padding: '12px', color: '#00F0FF', fontSize: '0.9rem', fontFamily: "'JetBrains Mono', monospace" }}>MEANING</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.2)' }}>
                                        <td style={{ padding: '12px', color: '#00F0FF', fontFamily: "'JetBrains Mono', monospace" }}>400</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Bad Request (Missing parameters)</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.2)' }}>
                                        <td style={{ padding: '12px', color: '#00F0FF', fontFamily: "'JetBrains Mono', monospace" }}>404</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Not Found (Invalid image ID)</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.2)' }}>
                                        <td style={{ padding: '12px', color: '#00F0FF', fontFamily: "'JetBrains Mono', monospace" }}>500</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Internal Server Error</td>
                                    </tr>
                                </tbody>
                            </table>
                        </motion.section>
                    )}

                    {activeSection === 'telegram-bot' && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Telegram Bot Integration</h2>
                            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                                PixEdge comes with a built-in Telegram Bot that allows you to upload images directly from your chat. No API calls or dashboard visits required.
                            </p>

                            <div style={{ background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '20px', padding: '20px', marginBottom: '2rem' }}>
                                <h4 style={{ color: 'var(--text-main)', marginBottom: '12px' }}>Available Commands</h4>
                                <ul style={{ color: 'var(--text-muted)', listStyle: 'none', padding: 0 }}>
                                    <li style={{ marginBottom: '8px' }}><code style={{ color: '#00F0FF', background: 'rgba(0, 0, 0, 0.5)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", border: '1px solid rgba(0, 240, 255, 0.2)' }}>/start</code> - Initialize the bot</li>
                                    <li style={{ marginBottom: '8px' }}><code style={{ color: '#00F0FF', background: 'rgba(0, 0, 0, 0.5)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", border: '1px solid rgba(0, 240, 255, 0.2)' }}>/upload</code> - View upload instructions</li>
                                    <li style={{ marginBottom: '8px' }}><code style={{ color: '#00F0FF', background: 'rgba(0, 0, 0, 0.5)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", border: '1px solid rgba(0, 240, 255, 0.2)' }}>/tgm</code> - Rapid upload mode</li>
                                </ul>
                            </div>

                            <h4 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>Webhook Setup</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                To enable the bot, you must point your Telegram Bot token to the following webhook endpoint:
                            </p>
                            <div style={{ background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '12px', padding: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', color: '#00F0FF', marginBottom: '2rem' }}>
                                <code>/api/webhook/telegram</code>
                            </div>
                            <div style={{ background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '12px', padding: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', color: '#00F0FF', marginBottom: '2rem' }}>
                                https://your-domain.com/api/webhook/telegram
                            </div>

                            <div style={{ background: 'rgba(0, 240, 255, 0.05)', border: '1px solid #00F0FF', borderRadius: '16px', padding: '1.5rem', display: 'flex', gap: '1rem', backdropFilter: 'blur(20px)', boxShadow: '0 0 12px rgba(0, 240, 255, 0.15)' }}>
                                <Zap color="#00F0FF" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.5))' }} />
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    <b>Note:</b> The bot handles both high-resolution Photos and Documents (when sent as images).
                                </p>
                            </div>
                        </motion.section>
                    )}
                    {activeSection === 'sdk' && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Official SDKs</h2>
                            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '2rem' }}>
                                We are developing official libraries to help you integrate PixEdge into your projects even faster. Coming soon to all major package managers.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                {['Node.js', 'Python', 'Go', 'PHP'].map(sdk => (
                                    <div key={sdk} style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center' }}>
                                        <div style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.2)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#00F0FF', boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)' }}>
                                            <Box size={24} />
                                        </div>
                                        <h4 style={{ color: 'var(--text-main)', marginBottom: '4px' }}>{sdk}</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Coming Soon</p>
                                    </div>
                                ))}
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
                    background: var(--bg-color);
                    color: var(--text-main);
                    overflow-x: hidden;
                    transition: background 0.3s ease, color 0.3s ease;
                }

                .mobile-header {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 60px;
                    background: var(--panel-bg);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid var(--border-color);
                    padding: 0 1.5rem;
                    align-items: center;
                    justify-content: space-between;
                    z-index: 1000;
                }

                .menu-toggle {
                    background: transparent;
                    border: none;
                    color: var(--text-main);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                }

                .sidebar {
                    width: 280px;
                    border-right: 1px solid #00F0FF;
                    padding: 2rem 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    position: fixed;
                    height: 100vh;
                    background: #050505;
                    transition: transform 0.3s ease;
                    z-index: 999;
                }

                .sidebar-logo {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    text-decoration: none;
                    color: var(--text-main);
                }

                .content-wrapper {
                    flex: 1;
                    margin-left: 280px;
                    padding: 4rem 5rem;
                    min-width: 0;
                }

                table {
                    display: block;
                    overflow-x: auto;
                    white-space: nowrap;
                }

                pre {
                    max-width: 100%;
                    overflow-x: auto;
                }

                @media (max-width: 1024px) {
                    .content-wrapper {
                        padding: 4rem 2rem;
                    }
                }

                @media (max-width: 768px) {
                    .mobile-header {
                        display: flex;
                    }

                    .sidebar {
                        transform: translateX(-100%);
                        padding-top: 5rem;
                        width: 100%;
                        border-right: none;
                    }

                    .sidebar.open {
                        transform: translateX(0);
                    }

                    .sidebar-logo {
                        display: none;
                    }

                    .content-wrapper {
                        margin-left: 0;
                        padding: 6rem 1.5rem 4rem;
                    }

                    h1 {
                        font-size: 2rem !important;
                    }

                    header {
                        margin-bottom: 2rem !important;
                    }
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
                    background: var(--border-color);
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: var(--text-muted);
                    opacity: 0.3;
                }
            `}</style>
        </main>
    );
}
