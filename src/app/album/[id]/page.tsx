"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
    Download,
    Share2,
    Lock,
    Eye,
    EyeOff,
    Check,
    ChevronLeft,
    ChevronRight,
    X,
    FileArchive,
    Sparkles,
    Play,
    ArrowLeft,
    Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import JSZip from "jszip";

interface AlbumItem {
    id: string;
    url: string;
    direct_url: string;
    type: string;
    size: number;
    created_at: number;
}

interface AlbumData {
    id: string;
    title: string;
    created_at: number;
    views: number;
    items: AlbumItem[];
}

export default function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [album, setAlbum] = useState<AlbumData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Password Lock State
    const [isLocked, setIsLocked] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [passError, setPassError] = useState<string | null>(null);

    // Lightbox & Actions
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [zipProgress, setZipProgress] = useState<string | null>(null);

    const fetchAlbum = async (pass?: string) => {
        try {
            setLoading(true);
            setError(null);
            setPassError(null);

            const headers: Record<string, string> = {};
            if (pass) {
                headers["x-album-password"] = pass;
            }

            const res = await fetch(`/api/album/${id}`, { headers });
            const data = await res.json();

            if (res.status === 401 && data.isLocked) {
                setIsLocked(true);
                if (pass) {
                    setPassError("Incorrect PIN or Password");
                }
                setLoading(false);
                return;
            }

            if (!res.ok) {
                throw new Error(data.error || "Failed to load album");
            }

            setIsLocked(false);
            setAlbum(data);
        } catch (err: any) {
            setError(err.message || "Album not found");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlbum();
    }, [id]);

    // Keyboard navigation for Lightbox
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (lightboxIndex === null || !album) return;
            if (e.key === "ArrowLeft") {
                setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : album.items.length - 1));
            } else if (e.key === "ArrowRight") {
                setLightboxIndex((prev) => (prev !== null && prev < album.items.length - 1 ? prev + 1 : 0));
            } else if (e.key === "Escape") {
                setLightboxIndex(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [lightboxIndex, album]);

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordInput.trim()) return;
        fetchAlbum(passwordInput.trim());
    };

    const handleCopyShareLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
    };

    // Client-side 1-Click ZIP Downloader
    const handleDownloadZip = async () => {
        if (!album || album.items.length === 0) return;
        try {
            setZipProgress("Preparing...");
            const zip = new JSZip();
            const folder = zip.folder(album.title.toLowerCase().replace(/[^a-z0-9]/g, "-") || "pixedge-album");

            for (let i = 0; i < album.items.length; i++) {
                const item = album.items[i];
                setZipProgress(`${i + 1}/${album.items.length}...`);
                const response = await fetch(item.url);
                const blob = await response.blob();

                // Determine file extension
                let ext = "jpg";
                if (item.type.includes("png")) ext = "png";
                else if (item.type.includes("gif")) ext = "gif";
                else if (item.type.includes("mp4")) ext = "mp4";
                else if (item.type.includes("webm")) ext = "webm";

                folder?.file(`media_${i + 1}_${item.id}.${ext}`, blob);
            }

            setZipProgress("Zipping...");
            const content = await zip.generateAsync({ type: "blob" });

            // Trigger file save
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `${album.title.toLowerCase().replace(/[^a-z0-9]/g, "-") || "album"}-pixedge.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setZipProgress(null);
        } catch (err) {
            console.error("ZIP download failed", err);
            setZipProgress("Failed");
            setTimeout(() => setZipProgress(null), 3000);
        }
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return "0 MB";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <main
            style={{
                minHeight: "100vh",
                background: "#09090b",
                color: "#f4f4f5",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                position: "relative",
                overflowX: "hidden",
            }}
        >
            {/* Ambient Spotlight Glow Background */}
            <div
                style={{
                    position: "fixed",
                    top: "-200px",
                    left: "-150px",
                    width: "500px",
                    height: "500px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, rgba(0, 0, 0, 0) 70%)",
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />
            <div
                style={{
                    position: "fixed",
                    bottom: "-200px",
                    right: "-150px",
                    width: "600px",
                    height: "600px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(6, 182, 212, 0.14) 0%, rgba(0, 0, 0, 0) 70%)",
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />

            {/* Custom Responsive Styles for Mobile 3x3 Grid */}
            <style>{`
                .album-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 1.25rem;
                }
                .album-card {
                    aspect-ratio: 4 / 3;
                    border-radius: 18px;
                }
                .album-header-bar {
                    flex-direction: row;
                }
                @media (max-width: 640px) {
                    .album-grid {
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 3px !important;
                    }
                    .album-card {
                        aspect-ratio: 1 / 1 !important;
                        border-radius: 6px !important;
                    }
                    .album-card-overlay {
                        padding: 4px !important;
                    }
                    .album-card-overlay-size {
                        display: none !important;
                    }
                    .album-toolbar {
                        padding: 6px 12px !important;
                        gap: 6px !important;
                        width: 94vw !important;
                    }
                    .album-title-text {
                        font-size: 1.4rem !important;
                    }
                    .mobile-hide {
                        display: none !important;
                    }
                }
            `}</style>

            {loading ? (
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
                    <div style={{ textAlign: "center" }}>
                        <Sparkles className="spin" size={38} color="#8b5cf6" style={{ marginBottom: "1rem" }} />
                        <p style={{ color: "#a1a1aa", fontWeight: 600, fontSize: "0.95rem" }}>Loading Media Gallery...</p>
                    </div>
                </div>
            ) : isLocked ? (
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", position: "relative", zIndex: 1 }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            background: "rgba(18, 18, 24, 0.85)",
                            backdropFilter: "blur(24px)",
                            WebkitBackdropFilter: "blur(24px)",
                            border: "1px solid rgba(139, 92, 246, 0.3)",
                            borderRadius: "28px",
                            padding: "2.5rem 2rem",
                            maxWidth: "420px",
                            width: "100%",
                            textAlign: "center",
                            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(139, 92, 246, 0.15)",
                        }}
                    >
                        <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.3)", color: "#c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem auto" }}>
                            <Lock size={30} />
                        </div>

                        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem", letterSpacing: "-0.5px" }}>Protected Album</h2>
                        <p style={{ color: "#a1a1aa", fontSize: "0.88rem", marginBottom: "1.75rem", lineHeight: 1.55 }}>
                            This album is password protected. Enter the PIN or password to unlock and view files.
                        </p>

                        <form onSubmit={handleUnlock}>
                            <div style={{ position: "relative", marginBottom: "1rem" }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter PIN or Password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "0.85rem 3rem 0.85rem 1.25rem",
                                        borderRadius: "14px",
                                        background: "rgba(255, 255, 255, 0.05)",
                                        border: passError ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.15)",
                                        color: "#ffffff",
                                        fontSize: "1rem",
                                        outline: "none",
                                        boxSizing: "border-box",
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: "absolute",
                                        right: "12px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "transparent",
                                        border: "none",
                                        color: "#a1a1aa",
                                        cursor: "pointer",
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {passError && (
                                <p style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "1rem", fontWeight: 600 }}>{passError}</p>
                            )}

                            <button
                                type="submit"
                                style={{
                                    width: "100%",
                                    padding: "0.85rem",
                                    borderRadius: "14px",
                                    background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                                    color: "#ffffff",
                                    fontWeight: 700,
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "1rem",
                                    boxShadow: "0 10px 25px rgba(139, 92, 246, 0.4)",
                                }}
                            >
                                Unlock Gallery
                            </button>
                        </form>
                    </motion.div>
                </div>
            ) : error || !album ? (
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", position: "relative", zIndex: 1 }}>
                    <div style={{ textAlign: "center" }}>
                        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.75rem" }}>Album Not Found</h2>
                        <p style={{ color: "#a1a1aa", marginBottom: "1.5rem" }}>{error || "The requested album does not exist or has expired."}</p>
                        <Link href="/" style={{ color: "#8b5cf6", fontWeight: 700, textDecoration: "none" }}>
                            ← Back to PixEdge
                        </Link>
                    </div>
                </div>
            ) : (
                <div style={{ position: "relative", zIndex: 1, padding: "80px 1.25rem 3rem" }}>
                    {/* Sleek Floating Top Glassmorphic Navbar */}
                    <div
                        className="album-toolbar"
                        style={{
                            position: "fixed",
                            top: "16px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            background: "rgba(18, 18, 22, 0.8)",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            padding: "8px 14px",
                            borderRadius: "100px",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            boxShadow: "0 10px 35px rgba(0, 0, 0, 0.6), 0 0 20px rgba(139, 92, 246, 0.15)",
                            zIndex: 100,
                            maxWidth: "960px",
                            width: "90vw",
                        }}
                    >
                        {/* Brand Logo Pill */}
                        <Link
                            href="/"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                textDecoration: "none",
                                color: "#ffffff",
                                fontWeight: 800,
                                fontSize: "0.92rem",
                                letterSpacing: "-0.3px",
                            }}
                        >
                            <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Layers size={14} color="#fff" />
                            </span>
                            <span className="mobile-hide">PixEdge</span>
                        </Link>

                        {/* Album Badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#c4b5fd", background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.3)", padding: "4px 12px", borderRadius: "50px", whiteSpace: "nowrap" }}>
                                📷 {album.items.length} Items
                            </span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                                onClick={handleCopyShareLink}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "6px 12px",
                                    borderRadius: "50px",
                                    background: "rgba(255, 255, 255, 0.08)",
                                    border: "1px solid rgba(255, 255, 255, 0.15)",
                                    color: "#ffffff",
                                    fontWeight: 600,
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                    transition: "all 0.2s",
                                }}
                            >
                                {isCopied ? <Check size={14} color="#10b981" /> : <Share2 size={14} />}
                                <span>{isCopied ? "Copied!" : "Share"}</span>
                            </button>

                            <button
                                onClick={handleDownloadZip}
                                disabled={!!zipProgress}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "6px 14px",
                                    borderRadius: "50px",
                                    background: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
                                    border: "none",
                                    color: "#ffffff",
                                    fontWeight: 700,
                                    fontSize: "0.8rem",
                                    cursor: zipProgress ? "not-allowed" : "pointer",
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 4px 15px rgba(139, 92, 246, 0.4)",
                                }}
                            >
                                <FileArchive size={14} />
                                <span>{zipProgress || "Download ZIP"}</span>
                            </button>
                        </div>
                    </div>

                    {/* Main Container */}
                    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                        {/* Title Section */}
                        <div style={{ marginBottom: "2rem", marginTop: "1rem" }}>
                            <h1 className="album-title-text" style={{ fontSize: "2rem", fontWeight: 900, color: "#ffffff", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
                                {album.title}
                            </h1>
                            <p style={{ color: "#a1a1aa", fontSize: "0.88rem", margin: 0 }}>
                                Created {new Date(album.created_at).toLocaleDateString()} • {album.items.length} media items
                            </p>
                        </div>

                        {/* Media Grid (3x3 on Phone View, Masonry on Desktop) */}
                        <div className="album-grid">
                            {album.items.map((item, idx) => {
                                const isVideo = item.type.includes("video") || item.type.includes("mp4") || item.type.includes("webm");

                                return (
                                    <motion.div
                                        key={item.id}
                                        className="album-card"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.03 }}
                                        onClick={() => setLightboxIndex(idx)}
                                        style={{
                                            position: "relative",
                                            overflow: "hidden",
                                            background: "rgba(22, 22, 28, 0.7)",
                                            border: "1px solid rgba(255, 255, 255, 0.1)",
                                            cursor: "pointer",
                                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
                                        }}
                                        whileHover={{ scale: 1.03, y: -4 }}
                                    >
                                        {isVideo ? (
                                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0c", position: "relative" }}>
                                                <video src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                <div style={{ position: "absolute", width: "42px", height: "42px", borderRadius: "50%", background: "rgba(139, 92, 246, 0.9)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", boxShadow: "0 4px 15px rgba(139, 92, 246, 0.5)" }}>
                                                    <Play size={20} style={{ marginLeft: "3px" }} />
                                                </div>
                                            </div>
                                        ) : (
                                            <img
                                                src={item.url}
                                                alt={`Media ${idx + 1}`}
                                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                                loading="lazy"
                                            />
                                        )}

                                        {/* Hover Overlay */}
                                        <div
                                            className="album-card-overlay"
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)",
                                                display: "flex",
                                                alignItems: "flex-end",
                                                padding: "10px",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#ffffff" }}>
                                                #{idx + 1}
                                            </span>
                                            <span className="album-card-overlay-size" style={{ fontSize: "0.7rem", color: "rgba(255, 255, 255, 0.9)", background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(6px)", padding: "2px 6px", borderRadius: "6px" }}>
                                                {formatSize(item.size)}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Goated Fullscreen Lightbox Modal */}
            <AnimatePresence>
                {lightboxIndex !== null && album && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: "fixed",
                            inset: 0,
                            zIndex: 9999,
                            background: "rgba(6, 6, 9, 0.95)",
                            backdropFilter: "blur(24px)",
                            WebkitBackdropFilter: "blur(24px)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "1.5rem",
                        }}
                        onClick={() => setLightboxIndex(null)}
                    >
                        {/* Top Counter Bar */}
                        <div
                            style={{
                                position: "absolute",
                                top: "20px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                background: "rgba(255, 255, 255, 0.1)",
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                                padding: "6px 16px",
                                borderRadius: "50px",
                                color: "#ffffff",
                                fontSize: "0.85rem",
                                fontWeight: 700,
                                zIndex: 10001,
                            }}
                        >
                            {lightboxIndex + 1} / {album.items.length}
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => setLightboxIndex(null)}
                            style={{
                                position: "absolute",
                                top: "20px",
                                right: "20px",
                                background: "rgba(255, 255, 255, 0.12)",
                                border: "1px solid rgba(255, 255, 255, 0.18)",
                                color: "#ffffff",
                                width: "42px",
                                height: "42px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                zIndex: 10001,
                            }}
                        >
                            <X size={22} />
                        </button>

                        {/* Left Arrow */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : album.items.length - 1));
                            }}
                            style={{
                                position: "absolute",
                                left: "16px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: "rgba(255, 255, 255, 0.12)",
                                backdropFilter: "blur(12px)",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                color: "#ffffff",
                                width: "48px",
                                height: "48px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                zIndex: 10001,
                            }}
                        >
                            <ChevronLeft size={26} />
                        </button>

                        {/* Right Arrow */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setLightboxIndex((prev) => (prev !== null && prev < album.items.length - 1 ? prev + 1 : 0));
                            }}
                            style={{
                                position: "absolute",
                                right: "16px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: "rgba(255, 255, 255, 0.12)",
                                backdropFilter: "blur(12px)",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                color: "#ffffff",
                                width: "48px",
                                height: "48px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                zIndex: 10001,
                            }}
                        >
                            <ChevronRight size={26} />
                        </button>

                        {/* Content Container */}
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                maxWidth: "92vw",
                                maxHeight: "85vh",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                            }}
                        >
                            {album.items[lightboxIndex].type.includes("video") ||
                            album.items[lightboxIndex].type.includes("mp4") ||
                            album.items[lightboxIndex].type.includes("webm") ? (
                                <video
                                    src={album.items[lightboxIndex].url}
                                    controls
                                    autoPlay
                                    style={{ maxWidth: "100%", maxHeight: "78vh", borderRadius: "16px", boxShadow: "0 25px 60px rgba(0,0,0,0.8)" }}
                                />
                            ) : (
                                <img
                                    src={album.items[lightboxIndex].url}
                                    alt="Album lightbox"
                                    style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain", borderRadius: "16px", boxShadow: "0 25px 60px rgba(0,0,0,0.8)" }}
                                />
                            )}

                            {/* Download Action */}
                            <div style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "14px" }}>
                                <a
                                    href={album.items[lightboxIndex].url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    style={{
                                        background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                                        color: "#ffffff",
                                        padding: "8px 18px",
                                        borderRadius: "50px",
                                        fontWeight: 700,
                                        fontSize: "0.85rem",
                                        textDecoration: "none",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        boxShadow: "0 4px 20px rgba(139, 92, 246, 0.4)",
                                    }}
                                >
                                    <Download size={15} /> Download Original File ({formatSize(album.items[lightboxIndex].size)})
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
