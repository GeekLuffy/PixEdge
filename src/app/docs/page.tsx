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
                background: activeSection === id ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                border: 'none',
                color: activeSection === id ? '#8b5cf6' : 'var(--text-muted)',
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
            background: 'var(--bg-color)',
            minHeight: '100vh',
            color: 'var(--text-main)',
            display: 'flex',
            fontFamily: "'Outfit', sans-serif"
        }}>
            {/* Mobile Header */}
            <header className="mobile-header">
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--text-main)' }}>
                    <Zap size={18} fill="var(--accent-primary)" color="var(--accent-primary)" />
                    <span style={{ fontWeight: '800', fontSize: '1rem' }}>PixEdge</span>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="menu-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Menu</span>
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            {/* Sidebar */}
            <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <Link href="/" className="sidebar-logo">
                    <div style={{ background: '#8b5cf6', padding: '6px', borderRadius: '8px' }}>
                        <Zap size={20} fill="white" />
                    </div>
                    <span style={{ fontWeight: '800', fontSize: '1.2rem', letterSpacing: '-0.5px' }}>PixEdge</span>
                </Link>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', opacity: 0.6, marginLeft: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>Introduction</p>
                    <SidebarItem id="getting-started" label="Getting Started" icon={Book} />
                    <SidebarItem id="authentication" label="Authentication" icon={Shield} />

                    <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', opacity: 0.6, marginLeft: '12px', marginBottom: '8px', marginTop: '1.5rem', textTransform: 'uppercase' }}>Endpoints</p>
                    <SidebarItem id="upload" label="Upload Media" icon={Terminal} />
                    <SidebarItem id="info" label="Get Metadata" icon={Cpu} />

                    <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', opacity: 0.6, marginLeft: '12px', marginBottom: '8px', marginTop: '1.5rem', textTransform: 'uppercase' }}>Reference</p>
                    <SidebarItem id="rate-limiting" label="Rate Limiting" icon={Activity} />
                    <SidebarItem id="errors" label="Error Codes" icon={AlertCircle} />
                    <SidebarItem id="telegram-bot" label="Telegram Bot" icon={MessageSquare} />
                    <SidebarItem id="sdk" label="SDKs" icon={Box} />
                    <div style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={toggleTheme}
                            style={{
                                background: 'var(--panel-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                padding: '10px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                width: '100%',
                                justifyContent: 'center',
                                fontWeight: '600',
                                transition: 'all 0.3s'
                            }}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="content-wrapper">
                <header style={{ marginBottom: '4rem' }}>
                    <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <ArrowLeft size={16} /> Home
                    </Link>
                    <h1 style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1rem' }}>Documentation</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '1rem' }}>API v1.0.0 — The complete reference for PixEdge developers.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <ArrowLeft size={14} style={{ transform: 'rotate(90deg)' }} />
                        <span>Navigate using the sidebar to explore endpoints</span>
                    </div>
                </header>

                <div style={{ maxWidth: '800px' }}>
                    {activeSection === 'getting-started' && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Getting Started</h2>
                            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                                PixEdge provides a high-performance REST API for uploading and managing images, GIFs, and videos via our Telegram-backed edge storage.
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
                            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Authentication</h2>
                            
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.3rem', color: 'var(--text-main)', marginBottom: '1rem' }}>API v1 (Public Access)</h3>
                                <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '1rem' }}>
                                    The PixEdge Public API v1 is **open access**. No API keys are required to upload or retrieve image metadata.
                                    However, to prevent abuse, we implement global rate limiting based on IP addresses (20 requests/minute).
                                </p>
                            </div>

                            <div style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <Shield size={20} color="#8b5cf6" />
                                    <h4 style={{ margin: 0, color: '#8b5cf6' }}>API v2 (Beta) - API Keys Available</h4>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '12px',
                                        background: 'rgba(251, 191, 36, 0.2)',
                                        border: '1px solid rgba(251, 191, 36, 0.4)',
                                        color: '#fbbf24',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        marginLeft: 'auto'
                                    }}>BETA</span>
                                </div>
                                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '1rem' }}>
                                    API v2 introduces authentication with **API Keys** and **JWT tokens**. Create an account and generate API keys from the <Link href="/dashboard" style={{ color: '#8b5cf6', textDecoration: 'underline' }}>Dashboard</Link> for higher rate limits and advanced features.
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
                                        <li>Visit the <Link href="/dashboard" style={{ color: '#8b5cf6', textDecoration: 'underline' }}>Dashboard</Link> to create an account</li>
                                        <li>Generate an API key from the Dashboard</li>
                                        <li>Use the API key in the <code style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>X-API-Key</code> header</li>
                                    </ol>
                                </div>
                            </div>
                        </motion.section>
                    )}

                    {activeSection === 'info' && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                                <span style={{ background: '#3b82f6', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>GET</span>
                                <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', margin: 0 }}>/api/v1/info/[id]</h2>
                            </div>

                            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '2rem' }}>
                                Retrieve real-time statistics and deep metadata for any image hosted on PixEdge.
                            </p>

                            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '20px' }}>
                                <div style={{ marginBottom: '10px', color: 'var(--text-muted)', opacity: 0.6, fontSize: '0.8rem' }}>RESPONSE SCHEMA</div>
                                <pre style={{ margin: 0 }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--code-text-color)', fontSize: '0.85rem' }}>{`{
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
                                <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', margin: 0 }}>/api/v1/upload</h2>
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
                                        <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>file</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>File</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Multipart file (Image/GIF/Video, max 10MB)</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>customId</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>String</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Optional vanity slug for the link</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border-color)', borderRadius: '20px', overflow: 'hidden' }}>
                                <div style={{ background: 'var(--panel-header-bg)', padding: '12px 20px', display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-color)' }}>
                                    {(['bash', 'python', 'javascript'] as Language[]).map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => setActiveLang(lang)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: activeLang === lang ? '#8b5cf6' : 'var(--text-muted)',
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
                                        <button onClick={() => copyCode(snippets[activeLang as keyof typeof snippets] || '', 'main')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                            {copied === 'main' ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <pre style={{ padding: '24px', fontSize: '0.9rem', margin: 0, overflowX: 'auto', background: 'transparent' }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--code-text-color)', lineHeight: '1.6' }}>
                                        {snippets[activeLang as keyof typeof snippets]}
                                    </code>
                                </pre>
                            </div>

                            <h4 style={{ marginTop: '3rem', marginBottom: '1rem', color: 'var(--text-muted)', opacity: 0.6, fontSize: '0.8rem', textTransform: 'uppercase' }}>Response Example</h4>
                            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '20px' }}>
                                <pre style={{ margin: 0 }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--code-text-color)', fontSize: '0.85rem' }}>{responseExample}</code>
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
                            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '20px', marginBottom: '2rem' }}>
                                <pre style={{ margin: 0 }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--code-text-color)', fontSize: '0.85rem' }}>{`{
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
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Code</th>
                                        <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Meaning</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px', color: 'var(--text-main)', fontFamily: 'monospace' }}>400</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Bad Request (Missing parameters)</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px', color: 'var(--text-main)', fontFamily: 'monospace' }}>404</td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>Not Found (Invalid image ID)</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px', color: 'var(--text-main)', fontFamily: 'monospace' }}>500</td>
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

                            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '20px', marginBottom: '2rem' }}>
                                <h4 style={{ color: 'var(--text-main)', marginBottom: '12px' }}>Available Commands</h4>
                                <ul style={{ color: 'var(--text-muted)', listStyle: 'none', padding: 0 }}>
                                    <li style={{ marginBottom: '8px' }}><code style={{ color: 'var(--accent-primary)' }}>/start</code> - Initialize the bot</li>
                                    <li style={{ marginBottom: '8px' }}><code style={{ color: 'var(--accent-primary)' }}>/upload</code> - View upload instructions</li>
                                    <li style={{ marginBottom: '8px' }}><code style={{ color: 'var(--accent-primary)' }}>/tgm</code> - Rapid upload mode</li>
                                </ul>
                            </div>

                            <h4 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>Webhook Setup</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                To enable the bot, you must point your Telegram Bot token to the following webhook endpoint:
                            </p>
                            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent-primary)', marginBottom: '2rem' }}>
                                https://your-domain.com/api/webhook/telegram
                            </div>

                            <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px', padding: '1.5rem', display: 'flex', gap: '1rem' }}>
                                <Zap color="#3b82f6" />
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
                                        <div style={{ background: 'rgba(139, 92, 246, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#8b5cf6' }}>
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
                    border-right: 1px solid var(--border-color);
                    padding: 2rem 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    position: fixed;
                    height: 100vh;
                    background: var(--bg-color);
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
