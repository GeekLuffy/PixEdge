"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Code2,
    Terminal,
    Cpu,
    ArrowLeft,
    Copy,
    Check,
    Book,
    Zap,
    Shield,
    Globe,
    Layers,
    Server,
    Menu,
    X,
    Activity,
    AlertCircle,
    Box,
    MessageSquare,
    Sun,
    Moon,
    Key,
    Lock,
    Folder,
    Download,
    Share2,
} from "lucide-react";
import Link from "next/link";

type Language = "bash" | "python" | "javascript" | "sharex" | "go";

export default function Docs() {
    const [copied, setCopied] = useState<string | null>(null);
    const [baseUrl, setBaseUrl] = useState("");
    const [activeLang, setActiveLang] = useState<Language>("bash");
    const [activeSection, setActiveSection] = useState("getting-started");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    useEffect(() => {
        setBaseUrl(window.location.origin);
        const savedTheme = localStorage.getItem("pixedge_theme") as
            | "dark"
            | "light";
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

    const copyCode = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const originUrl = baseUrl || "https://pixedge.app";

    const snippets = {
        bash: `curl -X POST ${originUrl}/api/v1/upload \\
  -H "X-API-Key: pe_your_generated_key" \\
  -F "file=@/path/to/media.mp4" \\
  -F "customId=my-vanity-slug" \\
  -F "password=secret-pin" \\
  -F "expiresIn=86400"`,
        python: `import requests

url = "${originUrl}/api/v1/upload"
headers = {"X-API-Key": "pe_your_generated_key"}
files = {'file': open('video.mp4', 'rb')}
data = {
    'customId': 'my-vanity-slug',
    'password': 'secret-pin',  # Optional PIN lock
    'expiresIn': '86400',       # 24 hours expiry in seconds
    'folder': 'Work'
}

response = requests.post(url, headers=headers, files=files, data=data)
print(response.json())`,
        javascript: `const formData = new FormData();
formData.append('file', imageFile);
formData.append('customId', 'my-vanity-slug');
formData.append('password', 'secret-pin'); // Optional PIN
formData.append('expiresIn', '86400');     // Optional expiry

const res = await fetch('${originUrl}/api/v1/upload', {
  method: 'POST',
  headers: {
    'X-API-Key': 'pe_your_generated_key'
  },
  body: formData
});

const data = await res.json();
console.log(data);`,
        sharex: `{
  "Version": "15.0.0",
  "Name": "PixEdge Host",
  "DestinationType": "ImageUploader, TextUploader, FileUploader",
  "RequestMethod": "POST",
  "RequestURL": "${originUrl}/api/v1/upload",
  "Headers": {
    "X-API-Key": "pe_your_generated_key"
  },
  "Body": "MultipartFormData",
  "FileFormName": "file",
  "URL": "{json:data.url}"
}`,
        go: `package main

import (
    "bytes"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "os"
)

func main() {
    url := "${originUrl}/api/v1/upload"
    body := &bytes.Buffer{}
    writer := multipart.NewWriter(body)
    
    file, _ := os.Open("media.jpg")
    part, _ := writer.CreateFormFile("file", "media.jpg")
    io.Copy(part, file)
    
    writer.WriteField("customId", "my-vanity-slug")
    writer.WriteField("password", "secret-pin")
    writer.Close()

    req, _ := http.NewRequest("POST", url, body)
    req.Header.Set("Content-Type", writer.FormDataContentType())
    req.Header.Set("X-API-Key", "pe_your_generated_key")

    client := &http.Client{}
    resp, err := client.Do(req)
    fmt.Println(resp.StatusCode, err)
}`,
    };

    const responseExample = `{
  "success": true,
  "data": {
    "id": "my-vanity-slug",
    "url": "${originUrl}/i/my-vanity-slug",
    "direct_url": "${originUrl}/i/my-vanity-slug.mp4",
    "is_protected": true,
    "views": 0,
    "created_at": 1705500000000,
    "expires_at": 1705586400000,
    "metadata": {
      "size": 4829104,
      "type": "video/mp4",
      "version": "v2"
    }
  }
}`;

    const SidebarItem = ({
        id,
        label,
        icon: Icon,
    }: {
        id: string;
        label: string;
        icon: any;
    }) => (
        <button
            onClick={() => {
                setActiveSection(id);
                setIsMobileMenuOpen(false);
            }}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                padding: "10px 16px",
                borderRadius: "10px",
                background:
                    activeSection === id ? "rgba(139, 92, 246, 0.12)" : "transparent",
                border: "none",
                color: activeSection === id ? "#8b5cf6" : "var(--text-muted)",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: activeSection === id ? "600" : "400",
                transition: "all 0.2s",
                textAlign: "left",
            }}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <main
            style={{
                background: "var(--bg-color)",
                minHeight: "100vh",
                color: "var(--text-main)",
                display: "flex",
                fontFamily: "'Outfit', sans-serif",
            }}
        >
            {/* Mobile Header */}
            <header className="mobile-header">
                <Link
                    href="/"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        textDecoration: "none",
                        color: "var(--text-main)",
                    }}
                >
                    <Zap
                        size={18}
                        fill="var(--accent-primary)"
                        color="var(--accent-primary)"
                    />
                    <span style={{ fontWeight: "800", fontSize: "1rem" }}>PixEdge</span>
                </Link>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button
                        onClick={toggleTheme}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-main)",
                            cursor: "pointer",
                        }}
                    >
                        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="menu-toggle"
                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    >
                        <span
                            style={{
                                fontSize: "0.75rem",
                                fontWeight: "bold",
                                color: "var(--accent-primary)",
                                textTransform: "uppercase",
                                letterSpacing: "1px",
                            }}
                        >
                            Menu
                        </span>
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            {/* Sidebar */}
            <aside className={`sidebar ${isMobileMenuOpen ? "open" : ""}`}>
                <Link href="/" className="sidebar-logo">
                    <div
                        style={{
                            background: "#8b5cf6",
                            padding: "6px",
                            borderRadius: "8px",
                        }}
                    >
                        <Zap size={20} fill="white" />
                    </div>
                    <span
                        style={{
                            fontWeight: "800",
                            fontSize: "1.2rem",
                            letterSpacing: "-0.5px",
                        }}
                    >
                        PixEdge
                    </span>
                </Link>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <p
                        style={{
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            color: "var(--text-muted)",
                            opacity: 0.6,
                            marginLeft: "12px",
                            marginBottom: "8px",
                            textTransform: "uppercase",
                        }}
                    >
                        Introduction
                    </p>
                    <SidebarItem
                        id="getting-started"
                        label="Getting Started"
                        icon={Book}
                    />
                    <SidebarItem
                        id="authentication"
                        label="Authentication"
                        icon={Shield}
                    />

                    <p
                        style={{
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            color: "var(--text-muted)",
                            opacity: 0.6,
                            marginLeft: "12px",
                            marginBottom: "8px",
                            marginTop: "1.5rem",
                            textTransform: "uppercase",
                        }}
                    >
                        Features & Tools
                    </p>
                    <SidebarItem id="albums" label="Albums & ZIP Downloader" icon={Folder} />
                    <SidebarItem id="command-palette" label="Spotlight & Lightbox" icon={Zap} />

                    <p
                        style={{
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            color: "var(--text-muted)",
                            opacity: 0.6,
                            marginLeft: "12px",
                            marginBottom: "8px",
                            marginTop: "1.5rem",
                            textTransform: "uppercase",
                        }}
                    >
                        Endpoints
                    </p>
                    <SidebarItem id="upload" label="Upload Media (2 GB)" icon={Terminal} />
                    <SidebarItem id="password-protection" label="PIN & Protection" icon={Lock} />
                    <SidebarItem id="info" label="Metadata & Verification" icon={Cpu} />
                    <SidebarItem id="sharex" label="ShareX Desktop Config" icon={Share2} />

                    <p
                        style={{
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            color: "var(--text-muted)",
                            opacity: 0.6,
                            marginLeft: "12px",
                            marginBottom: "8px",
                            marginTop: "1.5rem",
                            textTransform: "uppercase",
                        }}
                    >
                        Integrations
                    </p>
                    <SidebarItem
                        id="telegram-bot"
                        label="Telegram Bot (@PixEdge_bot)"
                        icon={MessageSquare}
                    />
                    <SidebarItem
                        id="rate-limiting"
                        label="Rate Limiting"
                        icon={Activity}
                    />
                    <SidebarItem id="errors" label="Error Codes" icon={AlertCircle} />

                    <div
                        style={{
                            marginTop: "auto",
                            paddingTop: "2rem",
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        <button
                            onClick={toggleTheme}
                            style={{
                                background: "var(--panel-bg)",
                                border: "1px solid var(--border-color)",
                                borderRadius: "12px",
                                padding: "10px 20px",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                color: "var(--text-main)",
                                cursor: "pointer",
                                width: "100%",
                                justifyContent: "center",
                                fontWeight: "600",
                                transition: "all 0.3s",
                            }}
                        >
                            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                            {theme === "dark" ? "Light Mode" : "Dark Mode"}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="content-wrapper">
                <header style={{ marginBottom: "3rem" }}>
                    <Link
                        href="/"
                        style={{
                            color: "var(--text-muted)",
                            textDecoration: "none",
                            fontSize: "0.9rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "1rem",
                        }}
                    >
                        <ArrowLeft size={16} /> Home
                    </Link>
                    <h1
                        style={{
                            fontSize: "2.8rem",
                            fontWeight: "800",
                            color: "var(--text-main)",
                            marginBottom: "0.5rem",
                            letterSpacing: "-0.5px",
                        }}
                    >
                        Developer API Documentation
                    </h1>
                    <p
                        style={{
                            color: "var(--text-muted)",
                            fontSize: "1.05rem",
                            marginBottom: "1rem",
                        }}
                    >
                        PixEdge v2.0 API — Build custom uploaders, ShareX integrations, and bot workflows with 2 GB cloud streaming.
                    </p>
                </header>

                <div style={{ maxWidth: "840px" }}>
                    {activeSection === "getting-started" && (
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2
                                style={{
                                    fontSize: "1.8rem",
                                    color: "var(--text-main)",
                                    marginBottom: "1.5rem",
                                }}
                            >
                                Getting Started
                            </h2>
                            <p
                                style={{
                                    color: "var(--text-muted)",
                                    lineHeight: "1.7",
                                    marginBottom: "1.5rem",
                                }}
                            >
                                PixEdge provides a high-performance, edge-backed REST API for uploading and
                                hosting images, GIFs, and videos up to **2 GB**. Powered by MTProto Telegram cloud infrastructure and Upstash Redis, your media streams with zero storage limits.
                            </p>
                            <div
                                style={{
                                    background: "rgba(139, 92, 246, 0.08)",
                                    border: "1px solid rgba(139, 92, 246, 0.25)",
                                    borderRadius: "16px",
                                    padding: "1.5rem",
                                    display: "flex",
                                    gap: "1rem",
                                    alignItems: "flex-start",
                                }}
                            >
                                <Zap color="#8b5cf6" style={{ flexShrink: 0, marginTop: "2px" }} />
                                <div>
                                    <h4 style={{ color: "#8b5cf6", marginBottom: "4px" }}>
                                        Key Highlights
                                    </h4>
                                    <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.6" }}>
                                        <li><b>Up to 2 GB File Size Limit</b> per upload.</li>
                                        <li><b>Optional Secret PIN / Password Protection</b> on any link.</li>
                                        <li><b>1-Click Desktop Integration</b> with ShareX (`.sxcu`).</li>
                                        <li><b>Instant Telegram Bot Synchronization</b> (`@PixEdge_bot`).</li>
                                    </ul>
                                </div>
                            </div>
                        </motion.section>
                    )}

                    {activeSection === "authentication" && (
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2
                                style={{
                                    fontSize: "1.8rem",
                                    color: "var(--text-main)",
                                    marginBottom: "1.5rem",
                                }}
                            >
                                Authentication
                            </h2>
                            <p
                                style={{
                                    color: "var(--text-muted)",
                                    lineHeight: "1.7",
                                    marginBottom: "1.5rem",
                                }}
                            >
                                Authenticate your API calls using an **API Key** passed in the HTTP request headers or query params.
                            </p>

                            <div
                                style={{
                                    background: "var(--panel-bg)",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "16px",
                                    padding: "1.5rem",
                                    marginBottom: "2rem",
                                }}
                            >
                                <h4
                                    style={{
                                        color: "var(--text-main)",
                                        marginBottom: "12px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                    }}
                                >
                                    <Key size={18} color="var(--accent-primary)" />
                                    Generating your API Key
                                </h4>
                                <ol
                                    style={{
                                        color: "var(--text-muted)",
                                        paddingLeft: "20px",
                                        lineHeight: "1.6",
                                    }}
                                >
                                    <li>Sign in to your account at <Link href="/login" style={{ color: "var(--accent-primary)" }}>PixEdge</Link>.</li>
                                    <li>Navigate to your <b>Dashboard</b> ➔ <b>API Keys</b> tab.</li>
                                    <li>Click <b>Generate API Key</b> (keys start with <code style={{ color: "var(--accent-primary)" }}>pe_</code>).</li>
                                </ol>
                            </div>

                            <p
                                style={{
                                    color: "var(--text-muted)",
                                    lineHeight: "1.7",
                                    marginBottom: "1.5rem",
                                }}
                            >
                                Pass your key in the <code style={{ color: "var(--accent-primary)", fontWeight: "bold" }}>X-API-Key</code> or <code style={{ color: "var(--accent-primary)", fontWeight: "bold" }}>Authorization: Bearer pe_...</code> header.
                            </p>
                        </motion.section>
                    )}

                    {activeSection === "upload" && (
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    marginBottom: "1.5rem",
                                }}
                            >
                                <span
                                    style={{
                                        background: "#10b981",
                                        color: "white",
                                        fontSize: "0.75rem",
                                        fontWeight: "bold",
                                        padding: "4px 10px",
                                        borderRadius: "6px",
                                    }}
                                >
                                    POST
                                </span>
                                <h2
                                    style={{
                                        fontSize: "1.8rem",
                                        color: "var(--text-main)",
                                        margin: 0,
                                    }}
                                >
                                    /api/v1/upload
                                </h2>
                            </div>

                            <p
                                style={{
                                    color: "var(--text-muted)",
                                    lineHeight: "1.7",
                                    marginBottom: "2rem",
                                }}
                            >
                                Upload images, GIFs, and videos up to <b>2 GB (2000 MB)</b>. Supports custom vanity slugs, link expiration timers, secret PIN lock, and folder categorization.
                            </p>

                            <h4
                                style={{
                                    marginBottom: "1rem",
                                    color: "var(--text-muted)",
                                    fontSize: "0.8rem",
                                    textTransform: "uppercase",
                                }}
                            >
                                Request Parameters (multipart/form-data)
                            </h4>
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    marginBottom: "2rem",
                                }}
                            >
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <th style={{ textAlign: "left", padding: "12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>Field</th>
                                        <th style={{ textAlign: "left", padding: "12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>Type</th>
                                        <th style={{ textAlign: "left", padding: "12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <td style={{ padding: "12px", fontFamily: "monospace", color: "var(--accent-primary)", fontWeight: 600 }}>file</td>
                                        <td style={{ padding: "12px", color: "var(--text-muted)" }}>File</td>
                                        <td style={{ padding: "12px", color: "var(--text-muted)" }}><b>Required.</b> Media file (Image, GIF, Video, max 2 GB).</td>
                                    </tr>
                                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <td style={{ padding: "12px", fontFamily: "monospace", color: "var(--accent-primary)", fontWeight: 600 }}>customId</td>
                                        <td style={{ padding: "12px", color: "var(--text-muted)" }}>String</td>
                                        <td style={{ padding: "12px", color: "var(--text-muted)" }}>Optional vanity link slug (e.g. <code style={{ color: "#3b82f6" }}>my-custom-shot</code>).</td>
                                    </tr>
                                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <td style={{ padding: "12px", fontFamily: "monospace", color: "var(--accent-primary)", fontWeight: 600 }}>password</td>
                                        <td style={{ padding: "12px", color: "var(--text-muted)" }}>String</td>
                                        <td style={{ padding: "12px", color: "var(--text-muted)" }}>Optional secret PIN/password to lock the viewing page.</td>
                                    </tr>
                                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <td style={{ padding: "12px", fontFamily: "monospace", color: "var(--accent-primary)", fontWeight: 600 }}>expiresIn</td>
                                        <td style={{ padding: "12px", color: "var(--text-muted)" }}>Integer</td>
                                        <td style={{ padding: "12px", color: "var(--text-muted)" }}>Optional expiration in seconds (3600=1h, 86400=24h, 604800=7d, 2592000=30d).</td>
                                    </tr>
                                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <td style={{ padding: "12px", fontFamily: "monospace", color: "var(--accent-primary)", fontWeight: 600 }}>folder</td>
                                        <td style={{ padding: "12px", color: "var(--text-muted)" }}>String</td>
                                        <td style={{ padding: "12px", color: "var(--text-muted)" }}>Optional target folder name for dashboard organization.</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h4 style={{ marginBottom: "1rem", color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Code Examples</h4>
                            <div
                                style={{
                                    background: "var(--code-bg)",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "20px",
                                    overflow: "hidden",
                                    marginBottom: "2rem",
                                }}
                            >
                                <div
                                    style={{
                                        background: "var(--panel-header-bg)",
                                        padding: "12px 20px",
                                        display: "flex",
                                        gap: "16px",
                                        borderBottom: "1px solid var(--border-color)",
                                        overflowX: "auto",
                                    }}
                                >
                                    {(["bash", "python", "javascript", "sharex", "go"] as Language[]).map(
                                        (lang) => (
                                            <button
                                                key={lang}
                                                onClick={() => setActiveLang(lang)}
                                                style={{
                                                    background: "transparent",
                                                    border: "none",
                                                    color: activeLang === lang ? "#8b5cf6" : "var(--text-muted)",
                                                    fontSize: "0.8rem",
                                                    fontWeight: "bold",
                                                    cursor: "pointer",
                                                    padding: "4px 0",
                                                    borderBottom: activeLang === lang ? "2px solid #8b5cf6" : "2px solid transparent",
                                                    transition: "all 0.2s",
                                                }}
                                            >
                                                {lang.toUpperCase()}
                                            </button>
                                        ),
                                    )}
                                    <div style={{ marginLeft: "auto" }}>
                                        <button
                                            onClick={() => copyCode(snippets[activeLang as keyof typeof snippets] || "", "main")}
                                            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                                        >
                                            {copied === "main" ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <pre style={{ padding: "20px", fontSize: "0.85rem", margin: 0, overflowX: "auto" }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--code-text-color)", lineHeight: "1.6" }}>
                                        {snippets[activeLang as keyof typeof snippets]}
                                    </code>
                                </pre>
                            </div>

                            <h4 style={{ marginBottom: "1rem", color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Response Example</h4>
                            <div style={{ background: "var(--code-bg)", border: "1px solid var(--border-color)", borderRadius: "20px", padding: "20px" }}>
                                <pre style={{ margin: 0 }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--code-text-color)", fontSize: "0.85rem" }}>
                                        {responseExample}
                                    </code>
                                </pre>
                            </div>
                        </motion.section>
                    )}

                    {activeSection === "password-protection" && (
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2 style={{ fontSize: "1.8rem", color: "var(--text-main)", marginBottom: "1.5rem" }}>
                                Secret PIN & Password Protection
                            </h2>
                            <p style={{ color: "var(--text-muted)", lineHeight: "1.7", marginBottom: "1.5rem" }}>
                                You can lock any media upload with a secret PIN or password. Viewers accessing <code style={{ color: "#8b5cf6" }}>/i/[id]</code> will see a glassmorphic lock screen requiring the password to reveal and stream the content.
                            </p>

                            <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
                                <h4 style={{ color: "var(--text-main)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Lock size={18} color="var(--accent-primary)" />
                                    Unlocking Protected Links Programmatically
                                </h4>
                                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.6" }}>
                                    Send a <code style={{ color: "#10b981" }}>POST</code> request to <code style={{ color: "#3b82f6" }}>/api/v1/info/[id]</code> with <code style={{ color: "#8b5cf6" }}>{`{"password": "secret-pin"}`}</code> to verify the PIN and receive an unlock token cookie.
                                </p>
                            </div>
                        </motion.section>
                    )}

                    {activeSection === "info" && (
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1.5rem" }}>
                                <span style={{ background: "#3b82f6", color: "white", fontSize: "0.75rem", fontWeight: "bold", padding: "4px 10px", borderRadius: "6px" }}>
                                    GET
                                </span>
                                <h2 style={{ fontSize: "1.8rem", color: "var(--text-main)", margin: 0 }}>
                                    /api/v1/info/[id]
                                </h2>
                            </div>

                            <p style={{ color: "var(--text-muted)", lineHeight: "1.7", marginBottom: "2rem" }}>
                                Retrieve real-time view counts, protection status, creation timestamp, and file size metadata.
                            </p>
                        </motion.section>
                    )}

                    {activeSection === "sharex" && (
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2 style={{ fontSize: "1.8rem", color: "var(--text-main)", marginBottom: "1.5rem" }}>
                                ShareX 1-Click Desktop Setup
                            </h2>
                            <p style={{ color: "var(--text-muted)", lineHeight: "1.7", marginBottom: "1.5rem" }}>
                                PixEdge natively supports ShareX for Windows. Download your personalized <code style={{ color: "#8b5cf6" }}>.sxcu</code> configuration file directly from your dashboard under the **API Keys** tab to upload desktop screenshots instantly with print screen keybindings!
                            </p>
                        </motion.section>
                    )}

                    {activeSection === "telegram-bot" && (
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2 style={{ fontSize: "1.8rem", color: "var(--text-main)", marginBottom: "1.5rem" }}>
                                Telegram Bot Integration (@PixEdge_bot)
                            </h2>
                            <p style={{ color: "var(--text-muted)", lineHeight: "1.7", marginBottom: "1.5rem" }}>
                                Send photos, GIFs, or videos directly to <b style={{ color: "#3b82f6" }}>@PixEdge_bot</b> in Telegram to get instant edge links!
                            </p>

                            <div style={{ background: "var(--code-bg)", border: "1px solid var(--border-color)", borderRadius: "20px", padding: "20px" }}>
                                <h4 style={{ color: "var(--text-main)", marginBottom: "12px" }}>Available Bot Commands</h4>
                                <ul style={{ color: "var(--text-muted)", listStyle: "none", padding: 0, margin: 0 }}>
                                    <li style={{ marginBottom: "8px" }}><code style={{ color: "var(--accent-primary)" }}>/login</code> - Generate a 6-digit PIN to log into PixEdge without passwords or OTPs</li>
                                    <li style={{ marginBottom: "8px" }}><code style={{ color: "var(--accent-primary)" }}>/upload [custom-slug]</code> - Upload media with a custom vanity link</li>
                                    <li style={{ marginBottom: "8px" }}><code style={{ color: "var(--accent-primary)" }}>/help</code> - Show bot commands & usage instructions</li>
                                </ul>
                            </div>
                        </motion.section>
                    )}

                    {activeSection === "rate-limiting" && (
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2 style={{ fontSize: "1.8rem", color: "var(--text-main)", marginBottom: "1.5rem" }}>
                                Rate Limiting
                            </h2>
                            <p style={{ color: "var(--text-muted)", lineHeight: "1.7", marginBottom: "1.5rem" }}>
                                To ensure peak performance for all users, rate limits are automatically enforced via Upstash Redis.
                            </p>
                            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <th style={{ textAlign: "left", padding: "12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>Tier</th>
                                        <th style={{ textAlign: "left", padding: "12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>Limit</th>
                                        <th style={{ textAlign: "left", padding: "12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>Window</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <td style={{ padding: "12px", color: "var(--text-main)" }}>Authenticated API User</td>
                                        <td style={{ padding: "12px", color: "#10b981", fontWeight: 600 }}>100 requests</td>
                                        <td style={{ padding: "12px", color: "var(--text-muted)" }}>1 minute</td>
                                    </tr>
                                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <td style={{ padding: "12px", color: "var(--text-main)" }}>Anonymous Web Upload</td>
                                        <td style={{ padding: "12px", color: "var(--text-muted)" }}>20 requests</td>
                                        <td style={{ padding: "12px", color: "var(--text-muted)" }}>1 minute</td>
                                    </tr>
                                </tbody>
                            </table>
                        </motion.section>
                    )}

                    {activeSection === "albums" && (
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2 style={{ fontSize: "1.8rem", color: "var(--text-main)", marginBottom: "1.5rem" }}>
                                Shareable Media Albums & ZIP Downloader
                            </h2>
                            <p style={{ color: "var(--text-muted)", lineHeight: "1.7", marginBottom: "1.5rem" }}>
                                Batch uploads auto-generate a shareable album gallery link (e.g. <code style={{ color: "#8b5cf6" }}>/album/xyz</code>). Viewers can stream all media in a mobile 3x3 ratio grid, download all files individually, or generate a 1-Click <code style={{ color: "#8b5cf6" }}>.zip</code> archive directly in the browser.
                            </p>
                            <h3 style={{ fontSize: "1.2rem", color: "var(--text-main)", margin: "1.5rem 0 1rem" }}>
                                Album API (<code style={{ color: "#8b5cf6" }}>POST /api/album/create</code>)
                            </h3>
                            <div style={{ background: "var(--code-bg)", border: "1px solid var(--border-color)", borderRadius: "20px", padding: "20px", marginBottom: "1.5rem" }}>
                                <pre style={{ margin: 0 }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--code-text-color)", fontSize: "0.85rem" }}>{`// POST ${originUrl}/api/album/create
{
  "imageIds": ["img_1", "img_2", "img_3"],
  "title": "Summer Vacation Album",
  "password": "optional-album-pin"
}`}</code>
                                </pre>
                            </div>
                        </motion.section>
                    )}

                    {activeSection === "command-palette" && (
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2 style={{ fontSize: "1.8rem", color: "var(--text-main)", marginBottom: "1.5rem" }}>
                                Command Palette (<code style={{ color: "#8b5cf6" }}>Ctrl + K</code>) & Spacebar Lightbox
                            </h2>
                            <p style={{ color: "var(--text-muted)", lineHeight: "1.7", marginBottom: "1.5rem" }}>
                                PixEdge includes desktop-grade productivity shortcuts inside your Dashboard:
                            </p>
                            <ul style={{ color: "var(--text-muted)", lineHeight: "1.8", marginLeft: "1.5rem", marginBottom: "1.5rem" }}>
                                <li><b><code style={{ color: "#8b5cf6" }}>Ctrl + K</code> / <code style={{ color: "#8b5cf6" }}>Cmd + K</code> Spotlight</b>: Instant search across all files, folders, and tags with quick action shortcuts.</li>
                                <li><b><code style={{ color: "#8b5cf6" }}>Spacebar</code> Lightbox Preview</b>: Hover over any media item and hit Spacebar (or click) to launch full-screen preview.</li>
                                <li><b>Keyboard Arrows (<code style={{ color: "#8b5cf6" }}>←</code> / <code style={{ color: "#8b5cf6" }}>→</code>)</b>: Navigate through gallery items inside the Lightbox.</li>
                                <li><b><code style={{ color: "#8b5cf6" }}>ESC</code> Key</b>: Close any active modal instantly.</li>
                            </ul>
                        </motion.section>
                    )}

                    {activeSection === "errors" && (
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2 style={{ fontSize: "1.8rem", color: "var(--text-main)", marginBottom: "1.5rem" }}>
                                Error Codes & Responses
                            </h2>
                            <p style={{ color: "var(--text-muted)", lineHeight: "1.7", marginBottom: "2rem" }}>
                                All error responses return standard HTTP status codes and a structured JSON payload:
                            </p>
                            <div style={{ background: "var(--code-bg)", border: "1px solid var(--border-color)", borderRadius: "20px", padding: "20px", marginBottom: "2rem" }}>
                                <pre style={{ margin: 0 }}>
                                    <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--code-text-color)", fontSize: "0.85rem" }}>{`{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many uploads. Try again in a moment."
  }
}`}</code>
                                </pre>
                            </div>
                        </motion.section>
                    )}
                </div>
            </div>

            <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Outfit:wght@300;400;600;800&display=swap");

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
          overflow-y: auto;
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
