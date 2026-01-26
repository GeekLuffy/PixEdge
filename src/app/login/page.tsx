'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Mail, Lock, User, ArrowRight, Loader2, AlertCircle, Sparkles, Shield } from 'lucide-react';
import Link from 'next/link';

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative' as const,
        overflow: 'hidden',
    },
    card: {
        width: '100%',
        maxWidth: '420px',
        background: 'var(--panel-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px var(--card-shadow)',
        position: 'relative' as const,
        zIndex: 10,
    },
    logoContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '1.5rem',
    },
    logo: {
        width: '56px',
        height: '56px',
        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
    },
    header: {
        textAlign: 'center' as const,
        marginBottom: '2rem',
    },
    title: {
        fontSize: '1.75rem',
        fontWeight: 700,
        color: 'var(--text-main)',
        marginBottom: '0.5rem',
    },
    subtitle: {
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
    },
    socialGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem',
        marginBottom: '1.5rem',
    },
    socialBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.875rem 1rem',
        background: 'var(--input-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        color: 'var(--text-main)',
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: 'inherit',
    },
    telegramContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '1.5rem',
        minHeight: '44px',
    },
    divider: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        margin: '1.5rem 0',
    },
    dividerLine: {
        flex: 1,
        height: '1px',
        background: 'var(--border-color)',
    },
    dividerText: {
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
    },
    inputGroup: {
        position: 'relative' as const,
        marginBottom: '1rem',
    },
    inputIcon: {
        position: 'absolute' as const,
        left: '1rem',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--text-muted)',
        pointerEvents: 'none' as const,
    },
    input: {
        width: '100%',
        padding: '0.875rem 1rem 0.875rem 3rem',
        background: 'var(--input-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        color: 'var(--text-main)',
        fontSize: '0.9rem',
        fontFamily: 'inherit',
        outline: 'none',
        transition: 'all 0.2s ease',
    },
    errorBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '12px',
        color: '#f87171',
        fontSize: '0.85rem',
        marginBottom: '1rem',
    },
    submitBtn: {
        width: '100%',
        padding: '0.875rem',
        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
        border: 'none',
        borderRadius: '12px',
        color: 'white',
        fontSize: '0.95rem',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s ease',
        fontFamily: 'inherit',
    },
    toggleText: {
        textAlign: 'center' as const,
        marginTop: '1.5rem',
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
    },
    toggleLink: {
        background: 'none',
        border: 'none',
        color: 'var(--accent-primary)',
        fontWeight: 500,
        cursor: 'pointer',
        fontSize: 'inherit',
        fontFamily: 'inherit',
    },
    backLink: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        marginTop: '2rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
        textDecoration: 'none',
        fontSize: '0.85rem',
        transition: 'color 0.2s',
    },
    securityBadge: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        marginTop: '1rem',
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
    },
};

// Google Icon with brand colors
const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const router = useRouter();
    const { data: session } = useSession();
    const telegramWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (session) router.push('/');
    }, [session, router]);

    useEffect(() => {
        if (telegramWrapperRef.current) {
            const script = document.createElement('script');
            script.src = "https://telegram.org/js/telegram-widget.js?22";
            script.setAttribute("data-telegram-login", "PixEdge_Bot");
            script.setAttribute("data-size", "large");
            script.setAttribute("data-radius", "8");
            script.setAttribute("data-request-access", "write");
            script.setAttribute("data-userpic", "false");
            script.setAttribute("data-onauth", "onTelegramAuth(user)");
            script.async = true;
            telegramWrapperRef.current.innerHTML = '';
            telegramWrapperRef.current.appendChild(script);
            // @ts-ignore
            window.onTelegramAuth = (user: any) => handleTelegramLogin(user);
        }
    }, [isLogin]);

    const handleTelegramLogin = async (user: any) => {
        setLoading(true);
        const result = await signIn('telegram-login', { redirect: false, ...user });
        if (result?.error) setError('Telegram login failed.');
        else router.push('/');
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (isLogin) {
            const result = await signIn('credentials', {
                redirect: false,
                email: formData.email,
                password: formData.password
            });
            if (result?.error) setError('Invalid email or password');
            else router.push('/');
        } else {
            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Registration failed');
                }
                await signIn('credentials', {
                    redirect: false,
                    email: formData.email,
                    password: formData.password
                });
                router.push('/');
            } catch (err: any) {
                setError(err.message);
            }
        }
        setLoading(false);
    };

    const handleSocialLogin = (provider: string) => {
        setSocialLoading(provider);
        signIn(provider, { callbackUrl: '/' });
    };

    return (
        <div style={styles.container}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={styles.card}
            >
                {/* Logo */}
                <div style={styles.logoContainer}>
                    <motion.div
                        style={{ ...styles.logo, padding: 0, overflow: 'hidden' }}
                        whileHover={{ scale: 1.05, rotate: 5 }}
                    >
                        <img src="/icon.png" alt="PixEdge" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </motion.div>
                </div>

                {/* Header */}
                <div style={styles.header}>
                    <h1 style={styles.title}>
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p style={styles.subtitle}>
                        {isLogin ? 'Sign in to access your dashboard' : 'Join PixEdge to start hosting'}
                    </p>
                </div>

                {/* Social Login */}
                <div style={styles.socialGrid}>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={styles.socialBtn}
                        onClick={() => handleSocialLogin('google')}
                        disabled={!!socialLoading}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.background = 'var(--input-bg)';
                        }}
                    >
                        {socialLoading === 'google' ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
                        Google
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={styles.socialBtn}
                        onClick={() => handleSocialLogin('github')}
                        disabled={!!socialLoading}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.background = 'var(--input-bg)';
                        }}
                    >
                        {socialLoading === 'github' ? <Loader2 size={18} className="animate-spin" /> : <Github size={18} />}
                        GitHub
                    </motion.button>
                </div>

                {/* Telegram Widget */}
                <div style={styles.telegramContainer} ref={telegramWrapperRef} />

                {/* Divider */}
                <div style={styles.divider}>
                    <div style={styles.dividerLine} />
                    <span style={styles.dividerText}>or continue with email</span>
                    <div style={styles.dividerLine} />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <AnimatePresence>
                        {!isLogin && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={styles.inputGroup}
                            >
                                <User size={18} style={styles.inputIcon} />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    required={!isLogin}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={styles.input}
                                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={styles.inputGroup}>
                        <Mail size={18} style={styles.inputIcon} />
                        <input
                            type="email"
                            placeholder="Email Address"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            style={styles.input}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <Lock size={18} style={styles.inputIcon} />
                        <input
                            type="password"
                            placeholder="Password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            style={styles.input}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                        />
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={styles.errorBox}
                        >
                            <AlertCircle size={16} />
                            {error}
                        </motion.div>
                    )}

                    <motion.button
                        type="submit"
                        disabled={loading}
                        style={styles.submitBtn}
                        whileHover={{ scale: 1.02, boxShadow: '0 10px 30px -10px var(--accent-primary)' }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <>
                                {isLogin ? 'Sign In' : 'Create Account'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </motion.button>
                </form>

                {/* Toggle */}
                <p style={styles.toggleText}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        style={styles.toggleLink}
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    >
                        {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </p>

                {/* Back to Home */}
                <Link href="/" style={styles.backLink}>
                    <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
                    Back to Home
                </Link>

                {/* Security Badge */}
                <div style={styles.securityBadge}>
                    <Shield size={14} />
                    Secured with end-to-end encryption
                </div>
            </motion.div>
        </div>
    );
}
