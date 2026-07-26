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
    Plus,
    Maximize2,
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

                let ext = "jpg";
                if (item.type.includes("png")) ext = "png";
                else if (item.type.includes("gif")) ext = "gif";
                else if (item.type.includes("mp4")) ext = "mp4";
                else if (item.type.includes("webm")) ext = "webm";

                folder?.file(`media_${i + 1}_${item.id}.${ext}`, blob);
            }

            setZipProgress("Zipping...");
            const content = await zip.generateAsync({ type: "blob" });

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
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const totalBytes = album?.items.reduce((acc, item) => acc + (item.size || 0), 0) || 0;
    const formattedTotalSize = formatSize(totalBytes);
    const formattedDate = album ? new Date(album.created_at).toLocaleDateString() : "";

    return (
        <main
            style={{
                margin: 0,
                background: "#09090b",
                color: "#f4f4f5",
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                minHeight: "100vh",
                overflowX: "hidden",
                position: "relative",
                userSelect: "none",
            }}
        >
            {/* Ambient Background Glow Blurs */}
            <div
                style={{
                    position: "fixed",
                    top: "-250px",
                    left: "-200px",
                    width: "600px",
                    height: "600px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(139, 92, 246, 0.16) 0%, rgba(0, 0, 0, 0) 70%)",
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />
            <div
                style={{
                    position: "fixed",
                    bottom: "-250px",
                    right: "-200px",
                    width: "700px",
                    height: "700px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(6, 182, 212, 0.14) 0%, rgba(0, 0, 0, 0) 70%)",
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />

            {/* Matching CSS Styles of /i/id Toolbar & Info Bar */}
            <style>{`
                .album-toolbar {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(18, 18, 22, 0.75);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    padding: 6px 10px;
                    border-radius: 100px;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    z-index: 100;
                }
                .album-info-bar {
                    position: fixed;
                    bottom: 24px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(18, 18, 22, 0.75);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    padding: 10px 22px;
                    border-radius: 100px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    font-size: 13px;
                    color: #a1a1aa;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    z-index: 100;
                    white-space: nowrap;
                }
                .info-item { display: flex; align-items: center; gap: 6px; }
                .info-item b { color: #f4f4f5; font-weight: 600; }
                .badge-purple {
                    background: rgba(139, 92, 246, 0.2);
                    color: #c4b5fd;
                    border: 1px solid rgba(139, 92, 246, 0.3);
                    padding: 3px 10px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                }
                .btn-pill {
                    color: #f4f4f5;
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: 500;
                    padding: 7px 16px;
                    border-radius: 50px;
                    transition: all 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-family: inherit;
                    height: 32px;
                    white-space: nowrap;
                }
                .btn-pill:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #ffffff;
                }
                .btn-pill-primary {
                    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                    color: white;
                    box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
                    font-weight: 600;
                }
                .btn-pill-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
                    color: white;
                }
                .album-grid-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 1.25rem;
                    width: 100%;
                }
                .album-card-tile {
                    position: relative;
                    border-radius: 16px;
                    overflow: hidden;
                    background: #000;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
                    cursor: pointer;
                    aspect-ratio: 4 / 3;
                    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease;
                }
                .album-card-tile:hover {
                    transform: scale(1.025) translateY(-3px);
                    border-color: rgba(139, 92, 246, 0.5);
                    box-shadow: 0 20px 45px rgba(139, 92, 246, 0.2);
                }
                @media (max-width: 640px) {
                    .album-toolbar {
                        top: 12px !important;
                        padding: 4px 8px !important;
                        gap: 4px !important;
                        max-width: 96vw !important;
                    }
                    .album-info-bar {
                        bottom: 12px !important;
                        padding: 8px 14px !important;
                        gap: 12px !important;
                        font-size: 11px !important;
                        max-width: 96vw !important;
                        overflow-x: auto;
                    }
                    .album-grid-container {
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 4px !important;
                    }
                    .album-card-tile {
                        aspect-ratio: 1 / 1 !important;
                        border-radius: 6px !important;
                    }
                    .mobile-hide {
                        display: none !important;
                    }
                    .page-wrapper {
                        padding: 70px 10px 80px !important;
                    }
                }
            `}</style>

            {loading ? (
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
                    <div style={{ textAlign: "center" }}>
                        <Sparkles className="spin" size={38} color="#8b5cf6" style={{ marginBottom: "1rem" }} />
                        <p style={{ color: "#a1a1aa", fontWeight: 600, fontSize: "0.95rem" }}>Loading Album Gallery...</p>
                    </div>
                </div>
            ) : isLocked ? (
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", position: "relative", zIndex: 1 }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            background: "rgba(18, 18, 22, 0.85)",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
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
                            This album is protected. Enter the PIN or password to unlock and view media.
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
                                className="btn-pill btn-pill-primary"
                                style={{
                                    width: "100%",
                                    height: "44px",
                                    justifyContent: "center",
                                    fontSize: "0.95rem",
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
                        <Link href="/" className="btn-pill btn-pill-primary">
                            ← Back to PixEdge
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    {/* Top Floating Glassmorphic Pill Navbar (Matching /i/id Toolbar) */}
                    <div className="album-toolbar">
                        <Link href="/" className="btn-pill">
                            <Plus size={15} /> <span>Upload</span>
                        </Link>

                        <button onClick={handleCopyShareLink} className="btn-pill">
                            {isCopied ? <Check size={15} color="#10b981" /> : <Share2 size={15} />}
                            <span>{isCopied ? "Copied!" : "Copy Link"}</span>
                        </button>

                        <button
                            onClick={handleDownloadZip}
                            disabled={!!zipProgress}
                            className="btn-pill btn-pill-primary"
                        >
                            <FileArchive size={15} />
                            <span>{zipProgress || "Download ZIP"}</span>
                        </button>
                    </div>

                    {/* Main Page Canvas Wrapper */}
                    <div className="page-wrapper" style={{ width: "100%", maxWidth: "1150px", padding: "90px 20px 100px", position: "relative", zIndex: 1 }}>
                        
                        {/* Goated Canvas Frame Container */}
                        <div
                            style={{
                                background: "rgba(18, 18, 22, 0.6)",
                                backdropFilter: "blur(20px)",
                                WebkitBackdropFilter: "blur(20px)",
                                border: "1px solid rgba(255, 255, 255, 0.12)",
                                borderRadius: "24px",
                                padding: "28px",
                                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
                            }}
                        >
                            {/* Album Header Info */}
                            <div style={{ marginBottom: "1.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                                        <span className="badge-purple">ALBUM</span>
                                        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#ffffff", margin: 0, letterSpacing: "-0.5px" }}>
                                            {album.title}
                                        </h1>
                                    </div>
                                    <p style={{ color: "#a1a1aa", fontSize: "0.85rem", margin: 0 }}>
                                        Created {formattedDate} • {album.items.length} media items
                                    </p>
                                </div>
                            </div>

                            {/* Media Grid (3x3 on Phone View, Sleek Tiles on Desktop) */}
                            <div className="album-grid-container">
                                {album.items.map((item, idx) => {
                                    const isVideo = item.type.includes("video") || item.type.includes("mp4") || item.type.includes("webm");

                                    return (
                                        <motion.div
                                            key={item.id}
                                            className="album-card-tile"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.03 }}
                                            onClick={() => setLightboxIndex(idx)}
                                        >
                                            {isVideo ? (
                                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0c", position: "relative" }}>
                                                    <video src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    <div style={{ position: "absolute", width: "44px", height: "44px", borderRadius: "50%", background: "rgba(139, 92, 246, 0.9)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", boxShadow: "0 4px 15px rgba(139, 92, 246, 0.5)" }}>
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
                                                <span className="mobile-hide" style={{ fontSize: "0.7rem", color: "rgba(255, 255, 255, 0.9)", background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(6px)", padding: "2px 6px", borderRadius: "6px" }}>
                                                    {formatSize(item.size)}
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Floating Glassmorphic Footer Stats Bar (Matching /i/id Info Bar) */}
                    <div className="album-info-bar">
                        <div className="info-item">
                            <span className="badge-purple">{album.title}</span>
                        </div>
                        <div className="info-item">
                            <span>Items</span> <b>{album.items.length}</b>
                        </div>
                        <div className="info-item">
                            <span>Views</span> <b>{album.views || 1}</b>
                        </div>
                        <div className="info-item mobile-hide">
                            <span>Size</span> <b>{formattedTotalSize}</b>
                        </div>
                        <div className="info-item mobile-hide">
                            <span>Date</span> <b>{formattedDate}</b>
                        </div>
                    </div>
                </>
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
                                background: "rgba(18, 18, 22, 0.8)",
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
                                    className="btn-pill btn-pill-primary"
                                    style={{
                                        padding: "8px 20px",
                                        height: "38px",
                                        fontSize: "0.88rem",
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
