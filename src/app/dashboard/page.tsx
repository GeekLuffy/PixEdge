'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Key, Plus, Trash2, Copy, Check, LogOut, User,
    Settings, Webhook, Eye, EyeOff, X, AlertCircle, Github
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
    id: string;
    email: string;
    created_at: number;
    last_login?: number;
}

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    rate_limit: number;
    created_at: number;
    last_used?: number;
    is_active: boolean;
}

interface Webhook {
    id: string;
    url: string;
    events: string[];
    is_active: boolean;
    created_at: number;
}

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'keys' | 'webhooks' | 'settings'>('keys');
    const [showCreateKey, setShowCreateKey] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyRateLimit, setNewKeyRateLimit] = useState(100);
    const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [showCreateWebhook, setShowCreateWebhook] = useState(false);
    const [newWebhookUrl, setNewWebhookUrl] = useState('');
    const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['upload']);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/v2/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.data);
                loadData();
            } else {
                router.push('/dashboard?login=true');
            }
        } catch (error) {
            router.push('/dashboard?login=true');
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        try {
            const [keysRes, webhooksRes] = await Promise.all([
                fetch('/api/v2/keys'),
                fetch('/api/v2/webhooks')
            ]);

            if (keysRes.ok) {
                const keysData = await keysRes.json();
                setApiKeys(keysData.data || []);
            }

            if (webhooksRes.ok) {
                const webhooksData = await webhooksRes.json();
                setWebhooks(webhooksData.data || []);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/v2/auth/logout', { method: 'POST' });
        router.push('/');
    };

    const createApiKey = async () => {
        if (!newKeyName.trim()) return;

        try {
            const res = await fetch('/api/v2/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newKeyName,
                    rate_limit: newKeyRateLimit
                })
            });

            if (res.ok) {
                const data = await res.json();
                setNewKeyValue(data.data.key);
                setNewKeyName('');
                setNewKeyRateLimit(100);
                loadData();
            }
        } catch (error) {
            console.error('Failed to create API key:', error);
        }
    };

    const deleteApiKey = async (id: string) => {
        if (!confirm('Are you sure you want to delete this API key?')) return;

        try {
            const res = await fetch(`/api/v2/keys/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadData();
            }
        } catch (error) {
            console.error('Failed to delete API key:', error);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(id);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const createWebhook = async () => {
        if (!newWebhookUrl.trim()) return;

        try {
            const res = await fetch('/api/v2/webhooks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: newWebhookUrl,
                    events: newWebhookEvents
                })
            });

            if (res.ok) {
                setNewWebhookUrl('');
                setNewWebhookEvents(['upload']);
                setShowCreateWebhook(false);
                loadData();
            }
        } catch (error) {
            console.error('Failed to create webhook:', error);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                color: 'var(--text-main)'
            }}>
                Loading...
            </div>
        );
    }

    if (!user) {
        return <LoginForm onSuccess={checkAuth} />;
    }

    return (
        <div style={{
            minHeight: '100vh',
            padding: '2rem',
            maxWidth: '1200px',
            margin: '0 auto'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                paddingBottom: '1.5rem',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dashboard</h1>
                    <p style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Link href="/" style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border-color)',
                        textDecoration: 'none',
                        color: 'var(--text-main)'
                    }}>Home</Link>
                    <button onClick={handleLogout} style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </div>

            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '2rem',
                borderBottom: '1px solid var(--border-color)'
            }}>
                {(['keys', 'webhooks', 'settings'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            border: 'none',
                            background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            borderRadius: '8px 8px 0 0',
                            textTransform: 'capitalize',
                            fontWeight: activeTab === tab ? 600 : 400
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'keys' && (
                    <motion.div
                        key="keys"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>API Keys</h2>
                            <button
                                onClick={() => setShowCreateKey(true)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    background: 'var(--accent-primary)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Plus size={16} />
                                Create Key
                            </button>
                        </div>

                        {newKeyValue && (
                            <div style={{
                                padding: '1.5rem',
                                borderRadius: '12px',
                                background: 'var(--panel-bg)',
                                border: '1px solid var(--border-color)',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>New API Key Created</h3>
                                    <button onClick={() => setNewKeyValue(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                        <X size={20} />
                                    </button>
                                </div>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    Save this key now. You won't be able to see it again!
                                </p>
                                <div style={{
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    background: 'var(--input-bg)',
                                    fontFamily: 'monospace',
                                    fontSize: '0.9rem',
                                    wordBreak: 'break-all',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}>
                                    <span>{newKeyValue}</span>
                                    <button
                                        onClick={() => copyToClipboard(newKeyValue, 'new')}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-main)',
                                            cursor: 'pointer',
                                            padding: '0.5rem'
                                        }}
                                    >
                                        {copiedKey === 'new' ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {showCreateKey && (
                            <div style={{
                                padding: '1.5rem',
                                borderRadius: '12px',
                                background: 'var(--panel-bg)',
                                border: '1px solid var(--border-color)',
                                marginBottom: '1.5rem'
                            }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Create API Key</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <input
                                        type="text"
                                        placeholder="Key name (e.g., Production, Development)"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            background: 'var(--input-bg)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-main)',
                                            fontSize: '1rem'
                                        }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Rate limit (default: 100)"
                                        value={newKeyRateLimit}
                                        onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value) || 100)}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            background: 'var(--input-bg)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-main)',
                                            fontSize: '1rem'
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={createApiKey}
                                            style={{
                                                padding: '0.75rem 1.5rem',
                                                borderRadius: '8px',
                                                background: 'var(--accent-primary)',
                                                border: 'none',
                                                color: 'white',
                                                cursor: 'pointer',
                                                flex: 1
                                            }}
                                        >
                                            Create
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowCreateKey(false);
                                                setNewKeyName('');
                                                setNewKeyRateLimit(100);
                                            }}
                                            style={{
                                                padding: '0.75rem 1.5rem',
                                                borderRadius: '8px',
                                                background: 'var(--panel-bg)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-main)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {apiKeys.length === 0 ? (
                                <div style={{
                                    padding: '2rem',
                                    textAlign: 'center',
                                    color: 'var(--text-muted)'
                                }}>
                                    No API keys yet. Create one to get started!
                                </div>
                            ) : (
                                apiKeys.map(key => (
                                    <div
                                        key={key.id}
                                        style={{
                                            padding: '1.5rem',
                                            borderRadius: '12px',
                                            background: 'var(--panel-bg)',
                                            border: '1px solid var(--border-color)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <Key size={18} />
                                                <h3 style={{ fontWeight: 600 }}>{key.name}</h3>
                                                {!key.is_active && (
                                                    <span style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        background: 'rgba(239, 68, 68, 0.2)',
                                                        color: '#ef4444',
                                                        fontSize: '0.75rem'
                                                    }}>Revoked</span>
                                                )}
                                            </div>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                                {key.prefix}...
                                            </p>
                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                <span>Rate limit: {key.rate_limit}/min</span>
                                                {key.last_used && (
                                                    <span>Last used: {new Date(key.last_used).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteApiKey(key.id)}
                                            style={{
                                                padding: '0.5rem',
                                                borderRadius: '8px',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                color: '#ef4444',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'webhooks' && (
                    <motion.div
                        key="webhooks"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Webhooks</h2>
                            <button
                                onClick={() => setShowCreateWebhook(true)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    background: 'var(--accent-primary)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Plus size={16} />
                                Create Webhook
                            </button>
                        </div>

                        {showCreateWebhook && (
                            <div style={{
                                padding: '1.5rem',
                                borderRadius: '12px',
                                background: 'var(--panel-bg)',
                                border: '1px solid var(--border-color)',
                                marginBottom: '1.5rem'
                            }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Create Webhook</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <input
                                        type="url"
                                        placeholder="https://your-server.com/webhook"
                                        value={newWebhookUrl}
                                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            background: 'var(--input-bg)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-main)',
                                            fontSize: '1rem'
                                        }}
                                    />
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Events:</label>
                                        {['upload', 'delete'].map(event => (
                                            <label key={event} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={newWebhookEvents.includes(event)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setNewWebhookEvents([...newWebhookEvents, event]);
                                                        } else {
                                                            setNewWebhookEvents(newWebhookEvents.filter(e => e !== event));
                                                        }
                                                    }}
                                                />
                                                <span style={{ textTransform: 'capitalize' }}>{event}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={createWebhook}
                                            style={{
                                                padding: '0.75rem 1.5rem',
                                                borderRadius: '8px',
                                                background: 'var(--accent-primary)',
                                                border: 'none',
                                                color: 'white',
                                                cursor: 'pointer',
                                                flex: 1
                                            }}
                                        >
                                            Create
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowCreateWebhook(false);
                                                setNewWebhookUrl('');
                                                setNewWebhookEvents(['upload']);
                                            }}
                                            style={{
                                                padding: '0.75rem 1.5rem',
                                                borderRadius: '8px',
                                                background: 'var(--panel-bg)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-main)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {webhooks.length === 0 ? (
                                <div style={{
                                    padding: '2rem',
                                    textAlign: 'center',
                                    color: 'var(--text-muted)'
                                }}>
                                    No webhooks yet. Create one to receive event notifications!
                                </div>
                            ) : (
                                webhooks.map(webhook => (
                                    <div
                                        key={webhook.id}
                                        style={{
                                            padding: '1.5rem',
                                            borderRadius: '12px',
                                            background: 'var(--panel-bg)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <Webhook size={18} />
                                            <h3 style={{ fontWeight: 600 }}>{webhook.url}</h3>
                                        </div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                            Events: {webhook.events.join(', ')}
                                        </p>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            background: webhook.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                            color: webhook.is_active ? '#22c55e' : '#ef4444',
                                            fontSize: '0.75rem'
                                        }}>
                                            {webhook.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'settings' && (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>Settings</h2>
                        <div style={{
                            padding: '1.5rem',
                            borderRadius: '12px',
                            background: 'var(--panel-bg)',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
                                <input
                                    type="email"
                                    value={user.email}
                                    disabled
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: 'var(--input-bg)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-muted)',
                                        fontSize: '1rem',
                                        width: '100%'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Account Created</label>
                                <p style={{ color: 'var(--text-muted)' }}>
                                    {new Date(user.created_at).toLocaleString()}
                                </p>
                            </div>
                            {user.last_login && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Last Login</label>
                                    <p style={{ color: 'var(--text-muted)' }}>
                                        {new Date(user.last_login).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isLogin ? '/api/v2/auth/login' : '/api/v2/auth/register';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                onSuccess();
            } else {
                setError(data.error?.message || 'An error occurred');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider: string) => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    // Google Icon SVG Component
    const GoogleIcon = () => (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
            <path d="M9 18C11.43 18 13.467 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65454 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
            <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40681 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
            <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65454 3.57955 9 3.57955Z" fill="#EA4335"/>
        </svg>
    );

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '2rem',
            background: '#000000',
            position: 'relative',
            fontFamily: "'Inter', sans-serif"
        }}>
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

            {/* Toast Notification */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            position: 'fixed',
                            top: '2rem',
                            right: '2rem',
                            background: 'rgba(0, 240, 255, 0.1)',
                            border: '1px solid #00F0FF',
                            borderRadius: '12px',
                            padding: '1rem 1.5rem',
                            color: '#00F0FF',
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: '600',
                            zIndex: 1000,
                            boxShadow: '0 0 12px rgba(0, 240, 255, 0.3)',
                            backdropFilter: 'blur(20px)'
                        }}
                    >
                        Coming Soon!
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{
                width: '100%',
                maxWidth: '400px',
                padding: '2.5rem',
                borderRadius: '24px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.1)',
                position: 'relative',
                zIndex: 1
            }}>
                <h1 style={{ 
                    fontSize: '2rem', 
                    fontWeight: 900, 
                    marginBottom: '0.5rem', 
                    textAlign: 'center',
                    color: '#FFFFFF',
                    fontFamily: "'Inter', sans-serif"
                }}>
                    {isLogin ? 'Login' : 'Sign Up'}
                </h1>
                <p style={{ 
                    color: 'rgba(255, 255, 255, 0.6)', 
                    textAlign: 'center', 
                    marginBottom: '2rem',
                    fontFamily: "'Inter', sans-serif"
                }}>
                    {isLogin ? 'Welcome back!' : 'Create your account'}
                </p>

                {error && (
                    <div style={{
                        padding: '0.75rem',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        fontFamily: "'Inter', sans-serif"
                    }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                            padding: '0.875rem',
                            borderRadius: '12px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#FFFFFF',
                            fontSize: '1rem',
                            fontFamily: "'Inter', sans-serif",
                            transition: 'all 0.3s',
                            outline: 'none'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#00F0FF';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 240, 255, 0.2)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        style={{
                            padding: '0.875rem',
                            borderRadius: '12px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#FFFFFF',
                            fontSize: '1rem',
                            fontFamily: "'Inter', sans-serif",
                            transition: 'all 0.3s',
                            outline: 'none'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#00F0FF';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 240, 255, 0.2)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.875rem',
                            borderRadius: '12px',
                            background: '#00F0FF',
                            border: 'none',
                            color: '#000000',
                            fontSize: '1rem',
                            fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            fontFamily: "'Inter', sans-serif",
                            transition: 'all 0.3s',
                            boxShadow: '0 0 12px rgba(0, 240, 255, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.5)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 240, 255, 0.3)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
                    </button>
                </form>

                {/* Social Login Buttons */}
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                        type="button"
                        onClick={() => handleSocialLogin('github')}
                        style={{
                            padding: '0.875rem',
                            borderRadius: '12px',
                            background: '#000000',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#FFFFFF',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: "'Inter', sans-serif",
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            e.currentTarget.style.background = '#000000';
                        }}
                    >
                        <Github size={18} />
                        Continue with GitHub
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSocialLogin('google')}
                        style={{
                            padding: '0.875rem',
                            borderRadius: '12px',
                            background: '#000000',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#FFFFFF',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: "'Inter', sans-serif",
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            e.currentTarget.style.background = '#000000';
                        }}
                    >
                        <GoogleIcon />
                        Continue with Google
                    </button>
                </div>

                <p style={{ 
                    textAlign: 'center', 
                    marginTop: '1.5rem', 
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontFamily: "'Inter', sans-serif"
                }}>
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#00F0FF',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 600,
                            transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.textShadow = '0 0 8px rgba(0, 240, 255, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.textShadow = 'none';
                        }}
                    >
                        {isLogin ? 'Sign up' : 'Login'}
                    </button>
                </p>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <Link href="/" style={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#00F0FF';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                    }}
                    >
                        ← Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
