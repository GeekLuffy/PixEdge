'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Zap,
    Upload,
    Users,
    Image as ImageIcon,
    Video,
    Globe,
    MessageSquare,
    Activity,
    ArrowLeft,
} from 'lucide-react';

interface Stats {
    totalUploads: number;
    totalUsers: number;
    webUploads: number;
    botUploads: number;
    totalImages: number;
    totalVideos: number;
    ping: number;
}

function StatCard({
    icon,
    label,
    value,
    color,
    delay,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
    delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            style={{
                background: 'var(--panel-bg)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
            }}
        >
            <div
                style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'white',
                }}
            >
                {icon}
            </div>
            <div>
                <div
                    style={{
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        lineHeight: 1,
                        marginBottom: '0.3rem',
                    }}
                >
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</div>
            </div>
        </motion.div>
    );
}

export default function StatsPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/stats');
            const json = await res.json();
            if (json.success) {
                setStats(json.data);
                setLastUpdated(new Date());
            } else {
                setError('Failed to load stats.');
            }
        } catch {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchStats, 30_000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                minHeight: '100vh',
                padding: '2rem 1.5rem',
                maxWidth: '900px',
                margin: '0 auto',
            }}
        >
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '2.5rem',
                    flexWrap: 'wrap',
                    gap: '1rem',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link
                        href="/"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--text-muted)',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                        }}
                    >
                        <ArrowLeft size={16} />
                        Back
                    </Link>
                    <div
                        style={{
                            width: '1px',
                            height: '20px',
                            background: 'var(--border-color)',
                        }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={20} fill="var(--accent-primary)" color="var(--accent-primary)" />
                        <span
                            style={{
                                fontWeight: 800,
                                fontSize: '1.25rem',
                                color: 'var(--text-main)',
                                letterSpacing: '-0.5px',
                            }}
                        >
                            PixEdge
                        </span>
                    </div>
                </div>

                {lastUpdated && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                        }}
                    >
                        <Activity size={12} style={{ color: '#10b981' }} />
                        Live · updated {lastUpdated.toLocaleTimeString()}
                    </div>
                )}
            </motion.div>

            {/* Title */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{ marginBottom: '2rem' }}
            >
                <h1
                    style={{
                        fontSize: '2rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        margin: 0,
                        letterSpacing: '-1px',
                    }}
                >
                    Platform Stats
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                    Real-time usage metrics for the PixEdge platform.
                </p>
            </motion.div>

            {/* Content */}
            {loading && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '1rem',
                    }}
                >
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                height: '96px',
                                borderRadius: '20px',
                                background: 'var(--panel-bg)',
                                border: '1px solid var(--border-color)',
                                animation: 'pulse 1.5s ease-in-out infinite',
                            }}
                        />
                    ))}
                </div>
            )}

            {error && (
                <div
                    style={{
                        padding: '1.5rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '16px',
                        color: '#f87171',
                        textAlign: 'center',
                    }}
                >
                    {error}
                </div>
            )}

            {stats && !loading && (
                <>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                            gap: '1rem',
                            marginBottom: '1.5rem',
                        }}
                    >
                        <StatCard
                            icon={<Upload size={22} />}
                            label="Total Uploads"
                            value={stats.totalUploads}
                            color="rgba(139, 92, 246, 0.8)"
                            delay={0.15}
                        />
                        <StatCard
                            icon={<Users size={22} />}
                            label="Registered Users"
                            value={stats.totalUsers}
                            color="rgba(59, 130, 246, 0.8)"
                            delay={0.2}
                        />
                        <StatCard
                            icon={<ImageIcon size={22} />}
                            label="Images Hosted"
                            value={stats.totalImages}
                            color="rgba(16, 185, 129, 0.8)"
                            delay={0.25}
                        />
                        <StatCard
                            icon={<Video size={22} />}
                            label="Videos & GIFs"
                            value={stats.totalVideos}
                            color="rgba(245, 158, 11, 0.8)"
                            delay={0.3}
                        />
                        <StatCard
                            icon={<Globe size={22} />}
                            label="Web Uploads"
                            value={stats.webUploads}
                            color="rgba(99, 102, 241, 0.8)"
                            delay={0.35}
                        />
                        <StatCard
                            icon={<MessageSquare size={22} />}
                            label="Bot Uploads"
                            value={stats.botUploads}
                            color="rgba(14, 165, 233, 0.8)"
                            delay={0.4}
                        />
                    </div>

                    {/* Redis ping card */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--panel-bg)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '16px',
                            padding: '1rem 1.5rem',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            <Activity size={16} style={{ color: '#10b981' }} />
                            Redis Latency
                        </div>
                        <span
                            style={{
                                fontWeight: 700,
                                color: stats.ping < 50 ? '#10b981' : stats.ping < 150 ? '#f59e0b' : '#ef4444',
                                fontSize: '0.95rem',
                            }}
                        >
                            {stats.ping} ms
                        </span>
                    </motion.div>
                </>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}
