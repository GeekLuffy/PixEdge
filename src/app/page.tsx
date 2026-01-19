'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
    Upload, Copy, Check, Shield, Zap,
    Globe, History, QrCode, Settings,
    Code2, ArrowRight, ExternalLink, Image as ImageIcon,
    Sun, Moon, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

interface HistoryItem {
    id: string;
    url: string;
    timestamp: number;
}

export default function Home() {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{ id: string; url: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [customId, setCustomId] = useState('');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [showQr, setShowQr] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    // Load history and theme from localStorage
    useEffect(() => {
        const savedHistory = localStorage.getItem('pixedge_history');
        if (savedHistory) {
            try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error('Failed to load history', e); }
        }

        const savedTheme = localStorage.getItem('pixedge_theme') as 'dark' | 'light';
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            // Default to dark if no theme is saved
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('pixedge_theme', newTheme);
    };

    const saveToHistory = (item: HistoryItem) => {
        const newHistory = [item, ...history].slice(0, 5); // Keep last 5
        setHistory(newHistory);
        localStorage.setItem('pixedge_history', JSON.stringify(newHistory));
    };

    const copyToClipboard = (text: string) => {
        const performCopy = () => {
            setCopied(true);
            setShowToast(true);
            setTimeout(() => {
                setCopied(false);
                setShowToast(false);
            }, 2000);
        };

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(performCopy);
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            performCopy();
            document.body.removeChild(textArea);
        }
    };

    const uploadFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        setUploading(true);
        setResult(null);
        setShowQr(false);

        const formData = new FormData();
        formData.append('file', file);
        if (customId) formData.append('customId', customId);

        try {
            const response = await fetch('/api/v1/upload', {
                method: 'POST',
                body: formData,
            });

            const json = await response.json();
            if (!json.success) throw new Error(json.error.message);

            const data = json.data;
            setResult(data);
            saveToHistory({
                id: data.id,
                url: data.url,
                timestamp: Date.now()
            });
            setCustomId('');
        } catch (err: any) {
            alert(err.message || 'Upload failed');
        } finally {
            setUploading(false);
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    };

    return (
        <>
            {/* Top Navigation Chip - Part of Page (Scrolls away) */}
            <motion.nav
                initial={{ y: -100, x: "-50%", opacity: 0 }}
                animate={{ y: 0, x: "-50%", opacity: 1 }}
                style={{
                    position: 'absolute',
                    top: '2rem',
                    left: '50%',
                    background: 'var(--panel-bg)',
                    backdropFilter: 'blur(30px)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '100px',
                    padding: '12px 32px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '40px',
                    zIndex: 9999,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                    whiteSpace: 'nowrap'
                }}
            >
                <Link href="/" style={{
                    color: 'var(--text-main)',
                    textDecoration: 'none',
                    fontWeight: '800',
                    fontSize: '1.6rem',
                    letterSpacing: '-1.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <Zap size={24} fill="var(--accent-primary)" color="var(--accent-primary)" />
                    PixEdge
                </Link>
                <Link href="/docs" style={{
                    color: 'var(--text-muted)',
                    textDecoration: 'none',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'color 0.2s'
                }}>
                    <Code2 size={18} /> API Docs
                </Link>

                <button
                    onClick={toggleTheme}
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '50px',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-main)',
                        transition: 'all 0.3s'
                    }}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </motion.nav>

            <main className="main-container">

                <header className="hero">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div style={{
                            background: 'rgba(139, 92, 246, 0.1)',
                            padding: '8px 16px',
                            borderRadius: '100px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '2rem',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            color: '#8b5cf6',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                        }}>
                            <Zap size={14} fill="#8b5cf6" />
                            <span>Now powered by Upstash & Telegram</span>
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                    >
                        Images hosted,<br />at the edge.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 1 }}
                    >
                        Zero storage. Lightning speed. Infinity scale.
                    </motion.p>
                </header>

                <motion.div
                    className="upload-card"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                        <div style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Settings size={14} />
                        </div>
                        <input
                            type="text"
                            placeholder="Custom File Name (Optional)"
                            value={customId}
                            onChange={(e) => setCustomId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            style={{
                                width: '100%',
                                background: 'var(--input-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '16px',
                                padding: '12px 12px 12px 40px',
                                color: 'var(--text-main)',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        />
                    </div>

                    <div
                        className={`drop-zone ${isDragging ? 'active' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-upload')?.click()}
                    >
                        <input
                            type="file"
                            id="file-upload"
                            className="file-input"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                        />

                        <div className="upload-icon-container">
                            <Upload size={24} />
                        </div>

                        <div className="upload-text">
                            <h3>{uploading ? 'Blasting at the edge...' : 'Drop your image here'}</h3>
                            <p style={{ color: 'var(--text-muted)', opacity: 0.6, fontSize: '0.8rem' }}>or click to browse your files</p>
                        </div>

                        {uploading && (
                            <div className="progress-container">
                                <div className="progress-bar">
                                    <motion.div
                                        className="progress-fill"
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <AnimatePresence>
                        {result && (
                            <motion.div
                                className="result-area"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <div className="link-box">
                                    <span className="link-text">{result.url}</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className="copy-btn"
                                            style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}
                                            onClick={() => setShowQr(!showQr)}
                                        >
                                            <QrCode size={18} />
                                        </button>
                                        <button className="copy-btn" onClick={() => copyToClipboard(result.url)}>
                                            {copied ? <Check size={18} /> : <Copy size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {showQr && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        style={{
                                            marginTop: '1.5rem',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            background: 'white',
                                            padding: '1.5rem',
                                            borderRadius: '24px',
                                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        <QRCodeSVG value={result.url} size={180} />
                                    </motion.div>
                                )}

                                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                                    <a href={result.url} target="_blank" style={{ color: '#8b5cf6', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        View Live Link <ExternalLink size={12} />
                                    </a>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Telegram Bot CTA */}
                <motion.a
                    href="https://t.me/YourBotUser"
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    style={{
                        marginTop: '2rem',
                        marginBottom: '1rem',
                        textDecoration: 'none',
                        width: '100%',
                        maxWidth: '500px'
                    }}
                >
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.05)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        padding: '16px 20px',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '15px',
                        transition: 'all 0.2s'
                    }}
                        onMouseOver={(e: any) => {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={(e: any) => {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: '#3b82f6',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}>
                                <MessageSquare size={20} fill="white" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '1rem' }}>Prefer Telegram?</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Use our bot for instant uploads</span>
                            </div>
                        </div>
                        <ArrowRight size={18} color="var(--text-muted)" />
                    </div>
                </motion.a>

                {/* Recently Uploaded (Improved) */}
                {history.length > 0 && (
                    <div style={{ marginTop: '3rem', width: '100%', maxWidth: '500px' }}>
                        <button
                            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                padding: '12px',
                                borderRadius: '100px',
                                color: 'var(--text-muted)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <History size={14} />
                            {isHistoryOpen ? 'Hide Recently Uploaded' : 'Show Recently Uploaded'}
                        </button>

                        <AnimatePresence>
                            {isHistoryOpen && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={{ overflow: 'hidden', padding: '1rem 0' }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {history.map((item) => (
                                            <div key={item.id} style={{
                                                background: 'var(--history-item-bg)',
                                                padding: '8px 12px',
                                                borderRadius: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: '44px',
                                                        height: '44px',
                                                        borderRadius: '12px',
                                                        overflow: 'hidden',
                                                        background: 'rgba(139, 92, 246, 0.05)',
                                                        flexShrink: 0
                                                    }}>
                                                        <img
                                                            src={`/i/${item.id}.jpg`}
                                                            alt="preview"
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                        <a href={`/i/${item.id}`} target="_blank" style={{ color: 'var(--text-main)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            /i/{item.id}
                                                        </a>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => copyToClipboard(item.url)}
                                                    style={{ background: 'rgba(139, 92, 246, 0.1)', border: 'none', color: '#8b5cf6', padding: '8px', borderRadius: '12px', cursor: 'pointer' }}
                                                >
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                <div className="features-grid">
                    <motion.div className="feature-card" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
                        <Zap size={28} color="#8b5cf6" style={{ marginBottom: '1.5rem' }} />
                        <h3 style={{ marginBottom: '0.8rem' }}>Edge Delivery</h3>
                        <p style={{ color: 'var(--card-subtext)', fontSize: '0.9rem', lineHeight: '1.5' }}>Direct-to-CDN redirection ensures your images load instantly for users globally.</p>
                    </motion.div>
                    <motion.div className="feature-card" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                        <Shield size={28} color="#06b6d4" style={{ marginBottom: '1.5rem' }} />
                        <h3 style={{ marginBottom: '0.8rem' }}>Privacy Shield</h3>
                        <p style={{ color: 'var(--card-subtext)', fontSize: '0.9rem', lineHeight: '1.5' }}>Advanced privacy protection that keeps your data sources secure, ensuring clean and anonymous sharing links.</p>
                    </motion.div>
                    <motion.div className="feature-card" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                        <Code2 size={28} color="#eab308" style={{ marginBottom: '1.5rem' }} />
                        <h3 style={{ marginBottom: '0.8rem' }}>Rich API</h3>
                        <p style={{ color: 'var(--card-subtext)', fontSize: '0.9rem', lineHeight: '1.5' }}>Fully document REST API for programmatic uploads and metadata retrieval.</p>
                    </motion.div>
                </div>

                <footer className="footer">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '1rem' }}>
                        <Link href="/docs" style={{ color: 'var(--text-muted)' }}>API</Link>
                        <a href="https://github.com/GeekLuffy" style={{ color: 'var(--text-muted)' }}>GitHub</a>
                        <a href="https://t.me/EdgeBots" style={{ color: 'var(--text-muted)' }}>Channel</a>
                        <a href="https://t.me/EdgeBotSupport" style={{ color: 'var(--text-muted)' }}>Support</a>
                    </div>


                </footer>

                {/* Toast System */}
                <AnimatePresence>
                    {showToast && (
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.8 }}
                            style={{
                                position: 'fixed',
                                bottom: '3rem',
                                background: 'var(--toast-bg)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid var(--border-color)',
                                padding: '12px 24px',
                                borderRadius: '100px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                                zIndex: 1000,
                                color: 'var(--text-main)'
                            }}
                        >
                            <div style={{ background: '#10b981', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                                <Check size={14} color="white" strokeWidth={3} />
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Copied to clipboard</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main >
        </>
    );
}
