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
    Grid,
    Sparkles,
    Play,
    ArrowLeft,
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
            setZipProgress("Initializing ZIP archive...");
            const zip = new JSZip();
            const folder = zip.folder(album.title.toLowerCase().replace(/[^a-z0-9]/g, "-") || "pixedge-album");

            for (let i = 0; i < album.items.length; i++) {
                const item = album.items[i];
                setZipProgress(`Fetching media ${i + 1} of ${album.items.length}...`);
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

            setZipProgress("Bundling ZIP file...");
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
            setZipProgress("Failed to generate ZIP");
            setTimeout(() => setZipProgress(null), 3000);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    if (loading) {
        return (
            <main style={{ minHeight: "100vh", background: "var(--bg-main)", color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <Sparkles className="spin" size={36} color="var(--accent-primary)" style={{ marginBottom: "1rem" }} />
                    <p style={{ color: "var(--card-subtext)", fontWeight: 600 }}>Loading Album Gallery...</p>
                </div>
            </main>
        );
    }

    if (isLocked) {
        return (
            <main style={{ minHeight: "100vh", background: "var(--bg-main)", color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        background: "var(--panel-bg)",
                        backdropFilter: "blur(24px)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "28px",
                        padding: "2.5rem",
                        maxWidth: "420px",
                        width: "100%",
                        textAlign: "center",
                        boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
                    }}
                >
                    <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem auto" }}>
                        <Lock size={32} />
                    </div>

                    <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Protected Album</h2>
                    <p style={{ color: "var(--card-subtext)", fontSize: "0.9rem", marginBottom: "1.75rem", lineHeight: 1.5 }}>
                        This album is protected with a secret PIN or password. Enter the password to unlock and view media.
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
                                    border: passError ? "1px solid #ef4444" : "1px solid var(--border-color)",
                                    color: "var(--text-main)",
                                    fontSize: "1rem",
                                    outline: "none",
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
                                    color: "var(--card-subtext)",
                                    cursor: "pointer",
                                }}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
                                background: "var(--accent-primary)",
                                color: "#ffffff",
                                fontWeight: 700,
                                border: "none",
                                cursor: "pointer",
                                fontSize: "1rem",
                                boxShadow: "0 10px 25px rgba(139, 92, 246, 0.3)",
                            }}
                        >
                            Unlock Album
                        </button>
                    </form>
                </motion.div>
            </main>
        );
    }

    if (error || !album) {
        return (
            <main style={{ minHeight: "100vh", background: "var(--bg-main)", color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
                <div style={{ textAlign: "center" }}>
                    <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.75rem" }}>Album Not Found</h2>
                    <p style={{ color: "var(--card-subtext)", marginBottom: "1.5rem" }}>{error || "The requested album does not exist or has expired."}</p>
                    <Link href="/" style={{ color: "var(--accent-primary)", fontWeight: 700, textDecoration: "none" }}>
                        ← Back to Homepage
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main style={{ minHeight: "100vh", background: "var(--bg-main)", color: "var(--text-main)", padding: "2rem 1.5rem" }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                {/* Header Navigation */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
                    <Link
                        href="/"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "var(--card-subtext)",
                            textDecoration: "none",
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            transition: "color 0.2s",
                        }}
                    >
                        <ArrowLeft size={18} /> Back to PixEdge
                    </Link>

                    <div style={{ display: "flex", gap: "10px" }}>
                        <button
                            onClick={handleCopyShareLink}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "0.6rem 1.25rem",
                                borderRadius: "14px",
                                background: "var(--panel-bg)",
                                border: "1px solid var(--border-color)",
                                color: "var(--text-main)",
                                fontWeight: 600,
                                fontSize: "0.88rem",
                                cursor: "pointer",
                            }}
                        >
                            {isCopied ? <Check size={16} color="#10b981" /> : <Share2 size={16} />}
                            {isCopied ? "Link Copied!" : "Share Album"}
                        </button>

                        <button
                            onClick={handleDownloadZip}
                            disabled={!!zipProgress}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "0.6rem 1.25rem",
                                borderRadius: "14px",
                                background: "var(--accent-primary)",
                                border: "none",
                                color: "#ffffff",
                                fontWeight: 700,
                                fontSize: "0.88rem",
                                cursor: zipProgress ? "not-allowed" : "pointer",
                                boxShadow: "0 10px 20px rgba(139, 92, 246, 0.3)",
                            }}
                        >
                            <FileArchive size={18} />
                            {zipProgress || "Download (.ZIP)"}
                        </button>
                    </div>
                </div>

                {/* Album Title Banner */}
                <div style={{ marginBottom: "2.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--accent-primary)", textTransform: "uppercase", letterSpacing: "1px" }}>
                            Album Gallery
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "var(--card-subtext)", background: "rgba(255, 255, 255, 0.06)", padding: "2px 10px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                            {album.items.length} Files
                        </span>
                    </div>
                    <h1 style={{ fontSize: "2.25rem", fontWeight: 900, color: "var(--text-main)", margin: 0 }}>
                        {album.title}
                    </h1>
                </div>

                {/* Masonry Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.25rem" }}>
                    {album.items.map((item, idx) => {
                        const isVideo = item.type.includes("video") || item.type.includes("mp4") || item.type.includes("webm");

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => setLightboxIndex(idx)}
                                style={{
                                    position: "relative",
                                    borderRadius: "20px",
                                    overflow: "hidden",
                                    background: "var(--panel-bg)",
                                    border: "1px solid var(--border-color)",
                                    cursor: "pointer",
                                    aspectRatio: isVideo ? "16/10" : "4/3",
                                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                                }}
                                whileHover={{ scale: 1.025, y: -4 }}
                            >
                                {isVideo ? (
                                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0c", position: "relative" }}>
                                        <video src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        <div style={{ position: "absolute", width: "52px", height: "52px", borderRadius: "50%", background: "rgba(139, 92, 246, 0.85)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                                            <Play size={24} style={{ marginLeft: "4px" }} />
                                        </div>
                                    </div>
                                ) : (
                                    <img
                                        src={item.url}
                                        alt={`Album item ${idx + 1}`}
                                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                    />
                                )}

                                {/* Hover Gradient & Info Pill */}
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
                                        opacity: 0.9,
                                        display: "flex",
                                        alignItems: "flex-end",
                                        padding: "1rem",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#ffffff" }}>
                                        #{idx + 1}
                                    </span>
                                    <span style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.8)", background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(8px)", padding: "3px 8px", borderRadius: "8px" }}>
                                        {formatSize(item.size)}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Lightbox Modal */}
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
                            background: "rgba(0, 0, 0, 0.92)",
                            backdropFilter: "blur(20px)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "2rem",
                        }}
                        onClick={() => setLightboxIndex(null)}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setLightboxIndex(null)}
                            style={{
                                position: "absolute",
                                top: "20px",
                                right: "20px",
                                background: "rgba(255, 255, 255, 0.1)",
                                border: "none",
                                color: "#ffffff",
                                width: "44px",
                                height: "44px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                zIndex: 10001,
                            }}
                        >
                            <X size={24} />
                        </button>

                        {/* Navigation Left */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : album.items.length - 1));
                            }}
                            style={{
                                position: "absolute",
                                left: "20px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: "rgba(255, 255, 255, 0.12)",
                                backdropFilter: "blur(10px)",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                color: "#ffffff",
                                width: "52px",
                                height: "52px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                zIndex: 10001,
                            }}
                        >
                            <ChevronLeft size={28} />
                        </button>

                        {/* Navigation Right */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setLightboxIndex((prev) => (prev !== null && prev < album.items.length - 1 ? prev + 1 : 0));
                            }}
                            style={{
                                position: "absolute",
                                right: "20px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: "rgba(255, 255, 255, 0.12)",
                                backdropFilter: "blur(10px)",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                color: "#ffffff",
                                width: "52px",
                                height: "52px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                zIndex: 10001,
                            }}
                        >
                            <ChevronRight size={28} />
                        </button>

                        {/* Media Container */}
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                maxWidth: "90vw",
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
                                    style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: "16px", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}
                                />
                            ) : (
                                <img
                                    src={album.items[lightboxIndex].url}
                                    alt="Album lightbox"
                                    style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: "16px", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}
                                />
                            )}

                            {/* Lightbox Footer */}
                            <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "16px", color: "rgba(255, 255, 255, 0.8)", fontSize: "0.9rem" }}>
                                <span>{lightboxIndex + 1} of {album.items.length}</span>
                                <span>•</span>
                                <span>{formatSize(album.items[lightboxIndex].size)}</span>
                                <span>•</span>
                                <a
                                    href={album.items[lightboxIndex].url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    style={{
                                        color: "#8b5cf6",
                                        fontWeight: 700,
                                        textDecoration: "none",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                    }}
                                >
                                    <Download size={16} /> Download File
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
