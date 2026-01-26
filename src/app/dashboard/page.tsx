"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Mail,
    LogOut,
    ArrowLeft,
    Save,
    Loader2,
    Shield,
    Upload,
    Image as ImageIcon,
    CheckCircle,
    Settings,
    History,
    BarChart3,
    Key,
    Copy,
    Eye,
    EyeOff,
    RefreshCw,
    Link2,
    ExternalLink,
    Globe,
    Sun,
    Moon,
    Sparkles,
} from "lucide-react";
import Link from "next/link";

// STYLES
const styles = {
    // Layout
    page: {
        minHeight: "100vh",
        padding: "1.5rem",
    },
    container: {
        maxWidth: "1100px",
        margin: "0 auto",
    },

    // Header
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "2rem",
        flexWrap: "wrap" as const,
        gap: "1rem",
    },
    backLink: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        color: "var(--text-muted)",
        textDecoration: "none",
        fontSize: "0.875rem",
        fontWeight: 500,
        transition: "color 0.2s",
    },
    headerActions: {
        display: "flex",
        alignItems: "center",
        gap: "0.625rem",
    },
    iconButton: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "40px",
        height: "40px",
        background: "var(--panel-bg)",
        backdropFilter: "blur(16px)",
        border: "1px solid var(--border-color)",
        borderRadius: "12px",
        color: "var(--text-muted)",
        cursor: "pointer",
        transition: "all 0.2s",
    },
    logoutButton: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.625rem 1rem",
        background: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.15)",
        borderRadius: "12px",
        color: "#f87171",
        fontSize: "0.875rem",
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.2s",
    },

    // Profile Hero
    heroCard: {
        background: "var(--panel-bg)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid var(--border-color)",
        borderRadius: "24px",
        padding: "1.75rem",
        marginBottom: "1.75rem",
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
        flexWrap: "wrap" as const,
    },
    avatarWrapper: {
        position: "relative" as const,
    },
    avatar: {
        width: "72px",
        height: "72px",
        borderRadius: "50%",
        border: "3px solid var(--accent-primary)",
        objectFit: "cover" as const,
    },
    statusBadge: {
        position: "absolute" as const,
        bottom: "0",
        right: "0",
        width: "22px",
        height: "22px",
        background: "#10b981",
        borderRadius: "50%",
        border: "3px solid var(--bg-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    heroInfo: {
        flex: 1,
        minWidth: "200px",
    },
    heroName: {
        fontSize: "1.5rem",
        fontWeight: 700,
        color: "var(--text-main)",
        marginBottom: "0.25rem",
    },
    heroEmail: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        color: "var(--text-muted)",
        fontSize: "0.875rem",
    },
    uploadButton: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.75rem 1.5rem",
        background: "rgba(139, 92, 246, 0.15)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(139, 92, 246, 0.3)",
        borderRadius: "14px",
        color: "var(--accent-primary)",
        fontWeight: 600,
        fontSize: "0.9rem",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.25s ease",
    },

    // Tabs
    tabsContainer: {
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1.75rem",
        overflowX: "auto" as const,
        paddingBottom: "0.25rem",
    },
    tab: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.75rem 1.25rem",
        background: "var(--panel-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "100px",
        color: "var(--text-muted)",
        fontSize: "0.85rem",
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap" as const,
        transition: "all 0.2s",
    },
    tabActive: {
        background: "rgba(139, 92, 246, 0.12)",
        borderColor: "rgba(139, 92, 246, 0.25)",
        color: "var(--accent-primary)",
    },

    // Stats Grid
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1rem",
        marginBottom: "2rem",
    },
    statCard: {
        background: "var(--panel-bg)",
        backdropFilter: "blur(16px)",
        border: "1px solid var(--border-color)",
        borderRadius: "20px",
        padding: "1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        transition: "all 0.2s",
    },
    statIcon: {
        width: "52px",
        height: "52px",
        borderRadius: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    statValue: {
        fontSize: "1.625rem",
        fontWeight: 700,
        color: "var(--text-main)",
        marginBottom: "0.125rem",
    },
    statLabel: {
        fontSize: "0.8rem",
        color: "var(--text-muted)",
    },

    // Section Header
    sectionHeader: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        marginBottom: "1.25rem",
    },
    sectionIcon: {
        width: "40px",
        height: "40px",
        background: "rgba(139, 92, 246, 0.1)",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--accent-primary)",
    },
    sectionTitle: {
        fontSize: "1.1rem",
        fontWeight: 600,
        color: "var(--text-main)",
    },

    // Upload Grid
    uploadsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "1rem",
    },
    uploadCard: {
        background: "var(--panel-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "18px",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.25s ease",
    },
    uploadPreview: {
        width: "100%",
        aspectRatio: "16/10",
        overflow: "hidden",
        background: "rgba(0,0,0,0.15)",
    },
    uploadImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover" as const,
        transition: "transform 0.3s ease",
    },
    uploadInfo: {
        padding: "1rem",
    },
    uploadTitle: {
        fontSize: "0.85rem",
        fontWeight: 600,
        color: "var(--text-main)",
        marginBottom: "0.4rem",
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
    },
    uploadMeta: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    uploadDate: {
        fontSize: "0.7rem",
        color: "var(--text-muted)",
    },
    uploadViews: {
        fontSize: "0.7rem",
        color: "var(--accent-primary)",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
    },

    // Empty State
    emptyState: {
        textAlign: "center" as const,
        padding: "4rem 2rem",
        background: "var(--panel-bg)",
        border: "1px dashed var(--border-color)",
        borderRadius: "24px",
    },
    emptyIcon: {
        width: "80px",
        height: "80px",
        background: "rgba(139, 92, 246, 0.08)",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 1.5rem",
        color: "var(--accent-primary)",
    },
    emptyTitle: {
        fontSize: "1.125rem",
        fontWeight: 600,
        color: "var(--text-main)",
        marginBottom: "0.5rem",
    },
    emptyText: {
        color: "var(--text-muted)",
        marginBottom: "1.5rem",
    },

    // Cards
    card: {
        background: "var(--panel-bg)",
        backdropFilter: "blur(24px)",
        border: "1px solid var(--border-color)",
        borderRadius: "24px",
        padding: "1.75rem",
        marginBottom: "1.5rem",
    },
    cardTitle: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        marginBottom: "1.25rem",
    },
    cardIcon: {
        width: "44px",
        height: "44px",
        background: "rgba(139, 92, 246, 0.1)",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--accent-primary)",
    },
    cardTitleText: {
        fontSize: "1.1rem",
        fontWeight: 600,
        color: "var(--text-main)",
    },
    cardDescription: {
        color: "var(--text-muted)",
        lineHeight: 1.65,
        fontSize: "0.9rem",
        marginBottom: "1.5rem",
    },

    // API Key Box
    apiKeyBox: {
        display: "flex",
        alignItems: "center",
        gap: "0.625rem",
        padding: "0.875rem 1rem",
        background: "var(--input-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "14px",
    },
    apiKeyText: {
        flex: 1,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "0.85rem",
        color: "var(--text-main)",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    apiKeyButton: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "36px",
        height: "36px",
        background: "rgba(139, 92, 246, 0.1)",
        border: "none",
        borderRadius: "10px",
        color: "var(--text-muted)",
        cursor: "pointer",
        transition: "all 0.2s",
    },

    // Form Elements
    inputGroup: {
        marginBottom: "1rem",
    },
    inputLabel: {
        display: "block",
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "var(--text-muted)",
        marginBottom: "0.5rem",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
    },
    inputWrapper: {
        position: "relative" as const,
    },
    inputIcon: {
        position: "absolute" as const,
        left: "1rem",
        top: "50%",
        transform: "translateY(-50%)",
        color: "var(--text-muted)",
        pointerEvents: "none" as const,
    },
    input: {
        width: "100%",
        padding: "0.875rem 1rem 0.875rem 3rem",
        background: "var(--input-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "14px",
        color: "var(--text-main)",
        fontSize: "0.9rem",
        fontFamily: "inherit",
        outline: "none",
        transition: "border-color 0.2s",
    },

    // Buttons
    primaryButton: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        padding: "0.875rem",
        background: "rgba(139, 92, 246, 0.12)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(139, 92, 246, 0.25)",
        borderRadius: "14px",
        color: "var(--accent-primary)",
        fontWeight: 600,
        fontSize: "0.9rem",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.25s ease",
    },

    // Alerts
    successAlert: {
        display: "flex",
        alignItems: "center",
        gap: "0.625rem",
        padding: "0.875rem 1rem",
        background: "rgba(16, 185, 129, 0.1)",
        border: "1px solid rgba(16, 185, 129, 0.2)",
        borderRadius: "14px",
        color: "#10b981",
        fontSize: "0.875rem",
        fontWeight: 500,
        marginBottom: "1rem",
    },

    // Danger Zone
    dangerZone: {
        padding: "1.5rem",
        background: "rgba(239, 68, 68, 0.05)",
        border: "1px solid rgba(239, 68, 68, 0.12)",
        borderRadius: "18px",
        marginTop: "1.5rem",
    },
    dangerTitle: {
        fontSize: "0.9rem",
        fontWeight: 600,
        color: "#f87171",
        marginBottom: "0.5rem",
    },
    dangerText: {
        fontSize: "0.85rem",
        color: "var(--text-muted)",
        marginBottom: "1rem",
        lineHeight: 1.55,
    },
    dangerButton: {
        padding: "0.75rem 1.25rem",
        background: "transparent",
        border: "1px solid rgba(239, 68, 68, 0.25)",
        borderRadius: "12px",
        color: "#f87171",
        fontSize: "0.875rem",
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.2s",
    },

    // Loading
    loadingContainer: {
        display: "flex",
        justifyContent: "center",
        padding: "3rem",
    },
};

// COMPONENT
export default function DashboardPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState("overview");
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [generatingKey, setGeneratingKey] = useState(false);
    const [uploads, setUploads] = useState<any[]>([]);
    const [loadingUploads, setLoadingUploads] = useState(true);
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    // Load theme
    useEffect(() => {
        const savedTheme = localStorage.getItem("pixedge_theme") as "dark" | "light";
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute("data-theme", savedTheme);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("pixedge_theme", newTheme);
    };

    // Fetch API Key
    const fetchApiKey = async () => {
        try {
            const res = await fetch("/api/user/apikey");
            const data = await res.json();
            setApiKey(data.key);
        } catch (e) {
            console.error("Failed to fetch API key");
        }
    };

    // Fetch Uploads
    const fetchUploads = async () => {
        setLoadingUploads(true);
        try {
            const res = await fetch("/api/user/uploads");
            const data = await res.json();
            setUploads(data.uploads || []);
        } catch (e) {
            console.error("Failed to fetch uploads");
        }
        setLoadingUploads(false);
    };

    // Generate API Key
    const generateApiKey = async () => {
        setGeneratingKey(true);
        try {
            const res = await fetch("/api/user/apikey", { method: "POST" });
            const data = await res.json();
            setApiKey(data.key);
            setSuccess("API Key generated!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (e) {
            console.error("Failed to generate API key");
        }
        setGeneratingKey(false);
    };

    // Copy to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setSuccess("Copied to clipboard!");
        setTimeout(() => setSuccess(""), 3000);
    };

    // Auth check
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
        if (session?.user?.name) {
            setName(session.user.name);
            fetchApiKey();
            fetchUploads();
        }
    }, [session, status, router]);

    // Save profile
    const handleSaveProfile = async () => {
        setSaving(true);
        setSuccess("");
        try {
            await update({ name });
            setSuccess("Profile updated successfully!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error(err);
        }
        setSaving(false);
    };

    // Loading state
    if (status === "loading") {
        return (
            <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={40} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
            </div>
        );
    }

    if (!session) return null;

    const user = session.user;
    const avatarUrl =
        user?.image ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "User")}&background=8b5cf6&color=fff&size=200`;

    const tabs = [
        { id: "overview", label: "Overview", icon: BarChart3 },
        { id: "uploads", label: "My Uploads", icon: ImageIcon },
        { id: "api", label: "API Keys", icon: Key },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    const stats = [
        { icon: ImageIcon, value: uploads.length, label: "Total Uploads", color: "#8b5cf6" },
        { icon: Eye, value: uploads.reduce((acc, u) => acc + (u.views || 0), 0), label: "Total Views", color: "#06b6d4" },
        { icon: Key, value: apiKey ? "Active" : "None", label: "API Key", color: "#10b981" },
        { icon: Globe, value: "Edge", label: "CDN Network", color: "#f59e0b" },
    ];

    // RENDER
    return (
        <div className="dashboard-page" style={styles.page}>
            <div className="dashboard-container" style={styles.container}>
                {/* Header */}
                <header className="dashboard-header" style={styles.header}>
                    <Link href="/" style={styles.backLink}>
                        <ArrowLeft size={18} />
                        Back to Home
                    </Link>

                    <div style={styles.headerActions}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleTheme}
                            style={styles.iconButton}
                        >
                            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                        </motion.button>

                        <motion.button
                            className="dashboard-logout-btn"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => signOut({ callbackUrl: "/" })}
                            style={styles.logoutButton}
                        >
                            <LogOut size={16} />
                            <span className="dashboard-logout-text">Sign Out</span>
                        </motion.button>
                    </div>
                </header>

                {/* Profile Hero */}
                <motion.div
                    className="dashboard-hero"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={styles.heroCard}
                >
                    <div style={styles.avatarWrapper}>
                        <img className="dashboard-hero-avatar" src={avatarUrl} alt={user?.name || "User"} style={styles.avatar} />
                        <div style={styles.statusBadge}>
                            <CheckCircle size={10} color="white" />
                        </div>
                    </div>

                    <div className="dashboard-hero-info" style={styles.heroInfo}>
                        <h1 className="dashboard-hero-name" style={styles.heroName}>{user?.name || "User"}</h1>
                        <p className="dashboard-hero-email" style={styles.heroEmail}>
                            <Mail size={14} />
                            {user?.email}
                        </p>
                    </div>

                    <Link href="/">
                        <motion.button className="dashboard-hero-btn" whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} style={styles.uploadButton}>
                            <Upload size={18} />
                            New Upload
                        </motion.button>
                    </Link>
                </motion.div>

                {/* Tabs */}
                <div className="dashboard-tabs" style={styles.tabsContainer}>
                    {tabs.map((tab) => (
                        <motion.button
                            key={tab.id}
                            className="dashboard-tab"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                ...styles.tab,
                                ...(activeTab === tab.id ? styles.tabActive : {}),
                            }}
                        >
                            <tab.icon size={16} />
                            <span className="dashboard-tab-label">{tab.label}</span>
                        </motion.button>
                    ))}
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {/* OVERVIEW TAB */}
                    {activeTab === "overview" && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            {/* Stats */}
                            <div className="dashboard-stats" style={styles.statsGrid}>
                                {stats.map((stat, idx) => (
                                    <motion.div
                                        key={stat.label}
                                        className="dashboard-stat-card"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.08 }}
                                        whileHover={{ y: -3, borderColor: "rgba(139, 92, 246, 0.3)" }}
                                        style={styles.statCard}
                                    >
                                        <div className="dashboard-stat-icon" style={{ ...styles.statIcon, background: `${stat.color}15`, color: stat.color }}>
                                            <stat.icon size={24} />
                                        </div>
                                        <div>
                                            <div className="dashboard-stat-value" style={styles.statValue}>{stat.value}</div>
                                            <div className="dashboard-stat-label" style={styles.statLabel}>{stat.label}</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Recent Activity */}
                            <div className="dashboard-section-header" style={styles.sectionHeader}>
                                <div className="dashboard-section-icon" style={styles.sectionIcon}>
                                    <History size={18} />
                                </div>
                                <h2 className="dashboard-section-title" style={styles.sectionTitle}>Recent Activity</h2>
                            </div>

                            {loadingUploads ? (
                                <div style={styles.loadingContainer}>
                                    <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
                                </div>
                            ) : uploads.length > 0 ? (
                                <div className="dashboard-uploads" style={styles.uploadsGrid}>
                                    {uploads.slice(0, 4).map((upload, idx) => (
                                        <motion.div
                                            key={upload.id}
                                            className="dashboard-upload-card"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            whileHover={{ y: -4, borderColor: "rgba(139, 92, 246, 0.35)" }}
                                            onClick={() => window.open(`/i/${upload.id}`, "_blank")}
                                            style={styles.uploadCard}
                                        >
                                            <div style={styles.uploadPreview}>
                                                <img
                                                    src={`/i/${upload.id}.jpg`}
                                                    alt={upload.id}
                                                    style={styles.uploadImage}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src =
                                                            "https://placehold.co/400x250/1a1a1a/444?text=Preview";
                                                    }}
                                                />
                                            </div>
                                            <div className="dashboard-upload-info" style={styles.uploadInfo}>
                                                <div className="dashboard-upload-title" style={styles.uploadTitle}>
                                                    <Link2 size={12} style={{ color: "var(--accent-primary)" }} />
                                                    /{upload.id}
                                                </div>
                                                <div style={styles.uploadMeta}>
                                                    <span style={styles.uploadDate}>{new Date(upload.created_at).toLocaleDateString()}</span>
                                                    <span style={styles.uploadViews}>
                                                        <Eye size={10} />
                                                        {upload.views}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="dashboard-empty" style={styles.emptyState}>
                                    <div className="dashboard-empty-icon" style={styles.emptyIcon}>
                                        <ImageIcon size={36} />
                                    </div>
                                    <h3 className="dashboard-empty-title" style={styles.emptyTitle}>No uploads yet</h3>
                                    <p style={styles.emptyText}>Your uploaded media will appear here</p>
                                    <Link href="/">
                                        <motion.button className="dashboard-btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={styles.uploadButton}>
                                            <Upload size={18} />
                                            Start Uploading
                                        </motion.button>
                                    </Link>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* UPLOADS TAB */}
                    {activeTab === "uploads" && (
                        <motion.div
                            key="uploads"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div className="dashboard-section-header" style={styles.sectionHeader}>
                                <div className="dashboard-section-icon" style={styles.sectionIcon}>
                                    <ImageIcon size={18} />
                                </div>
                                <h2 className="dashboard-section-title" style={styles.sectionTitle}>My Uploads ({uploads.length})</h2>
                            </div>

                            {loadingUploads ? (
                                <div style={styles.loadingContainer}>
                                    <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
                                </div>
                            ) : uploads.length > 0 ? (
                                <div className="dashboard-uploads" style={styles.uploadsGrid}>
                                    {uploads.map((upload, idx) => (
                                        <motion.div
                                            key={upload.id}
                                            className="dashboard-upload-card"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.03 }}
                                            whileHover={{ y: -4, borderColor: "rgba(139, 92, 246, 0.35)" }}
                                            onClick={() => window.open(`/i/${upload.id}`, "_blank")}
                                            style={styles.uploadCard}
                                        >
                                            <div style={styles.uploadPreview}>
                                                <img
                                                    src={`/i/${upload.id}.jpg`}
                                                    alt={upload.id}
                                                    style={styles.uploadImage}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src =
                                                            "https://placehold.co/400x250/1a1a1a/444?text=Preview";
                                                    }}
                                                />
                                            </div>
                                            <div className="dashboard-upload-info" style={styles.uploadInfo}>
                                                <div style={styles.uploadTitle}>
                                                    <Link2 size={12} style={{ color: "var(--accent-primary)" }} />
                                                    /{upload.id}
                                                </div>
                                                <div style={styles.uploadMeta}>
                                                    <span style={styles.uploadDate}>{new Date(upload.created_at).toLocaleDateString()}</span>
                                                    <span style={styles.uploadViews}>
                                                        <Eye size={10} />
                                                        {upload.views}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div style={styles.emptyState}>
                                    <div style={styles.emptyIcon}>
                                        <ImageIcon size={36} />
                                    </div>
                                    <h3 style={styles.emptyTitle}>No uploads yet</h3>
                                    <p style={styles.emptyText}>Upload your first file to get started</p>
                                    <Link href="/">
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={styles.uploadButton}>
                                            <Upload size={18} />
                                            Upload Now
                                        </motion.button>
                                    </Link>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* API KEYS TAB */}
                    {activeTab === "api" && (
                        <motion.div
                            key="api"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div className="dashboard-card" style={styles.card}>
                                <div style={styles.cardTitle}>
                                    <div className="dashboard-card-icon" style={styles.cardIcon}>
                                        <Key size={22} />
                                    </div>
                                    <h2 className="dashboard-card-title" style={styles.cardTitleText}>API Key Management</h2>
                                </div>

                                <p className="dashboard-card-desc" style={styles.cardDescription}>
                                    Use your API key to authenticate requests to the PixEdge REST API. Keep it secret and never share it
                                    publicly.
                                </p>

                                {success && (
                                    <div style={styles.successAlert}>
                                        <CheckCircle size={18} />
                                        {success}
                                    </div>
                                )}

                                {apiKey ? (
                                    <div className="dashboard-api-box" style={styles.apiKeyBox}>
                                        <span className="dashboard-api-text" style={styles.apiKeyText}>{showKey ? apiKey : "••••••••••••••••••••••••••••••••"}</span>

                                        <button className="dashboard-api-btn" style={styles.apiKeyButton} onClick={() => setShowKey(!showKey)} title={showKey ? "Hide" : "Show"}>
                                            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>

                                        <button className="dashboard-api-btn" style={styles.apiKeyButton} onClick={() => copyToClipboard(apiKey)} title="Copy">
                                            <Copy size={16} />
                                        </button>

                                        <button
                                            className="dashboard-api-btn"
                                            style={{ ...styles.apiKeyButton, background: "rgba(239, 68, 68, 0.1)", color: "#f87171" }}
                                            onClick={generateApiKey}
                                            disabled={generatingKey}
                                            title="Rotate"
                                        >
                                            {generatingKey ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                        </button>
                                    </div>
                                ) : (
                                    <motion.button
                                        className="dashboard-btn-primary"
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={generateApiKey}
                                        disabled={generatingKey}
                                        style={styles.primaryButton}
                                    >
                                        {generatingKey ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
                                        Generate API Key
                                    </motion.button>
                                )}
                            </div>

                            <div style={styles.card}>
                                <div style={styles.cardTitle}>
                                    <div style={styles.cardIcon}>
                                        <ExternalLink size={22} />
                                    </div>
                                    <h2 style={styles.cardTitleText}>Quick Links</h2>
                                </div>
                                <Link href="/docs">
                                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} style={styles.primaryButton}>
                                        <Sparkles size={18} />
                                        View API Documentation
                                    </motion.button>
                                </Link>
                            </div>
                        </motion.div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === "settings" && (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div className="dashboard-card" style={styles.card}>
                                <div style={styles.cardTitle}>
                                    <div className="dashboard-card-icon" style={styles.cardIcon}>
                                        <User size={22} />
                                    </div>
                                    <h2 className="dashboard-card-title" style={styles.cardTitleText}>Profile Settings</h2>
                                </div>

                                {success && (
                                    <div style={styles.successAlert}>
                                        <CheckCircle size={18} />
                                        {success}
                                    </div>
                                )}

                                <div style={styles.inputGroup}>
                                    <label style={styles.inputLabel}>Display Name</label>
                                    <div style={styles.inputWrapper}>
                                        <User size={18} style={styles.inputIcon} />
                                        <input
                                            className="dashboard-input"
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your display name"
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                <div style={{ ...styles.inputGroup, marginBottom: "1.5rem" }}>
                                    <label style={styles.inputLabel}>Email Address</label>
                                    <div style={styles.inputWrapper}>
                                        <Mail size={18} style={styles.inputIcon} />
                                        <input className="dashboard-input" type="email" value={user?.email || ""} disabled style={{ ...styles.input, opacity: 0.6 }} />
                                    </div>
                                </div>

                                <motion.button
                                    className="dashboard-btn-primary"
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={handleSaveProfile}
                                    disabled={saving}
                                    style={styles.primaryButton}
                                >
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Save Changes
                                </motion.button>
                            </div>

                            <div className="dashboard-card" style={styles.card}>
                                <div style={styles.cardTitle}>
                                    <div className="dashboard-card-icon" style={styles.cardIcon}>
                                        <Shield size={22} />
                                    </div>
                                    <h2 className="dashboard-card-title" style={styles.cardTitleText}>Security</h2>
                                </div>

                                <p className="dashboard-card-desc" style={styles.cardDescription}>
                                    Your account is secured with {user?.email?.includes("@telegram") ? "Telegram" : "OAuth"}{" "}
                                    authentication. All uploads are encrypted and served via our global edge network.
                                </p>

                                <div className="dashboard-danger-zone" style={styles.dangerZone}>
                                    <div style={styles.dangerTitle}>Danger Zone</div>
                                    <p style={styles.dangerText}>
                                        Once you delete your account, there is no going back. Please be certain.
                                    </p>
                                    <motion.button
                                        whileHover={{ background: "rgba(239, 68, 68, 0.1)" }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => alert("Account deletion is not implemented yet.")}
                                        style={styles.dangerButton}
                                    >
                                        Delete Account
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
