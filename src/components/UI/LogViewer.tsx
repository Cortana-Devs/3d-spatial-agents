import React, { useState, useEffect } from "react";

export function LogViewer({ onClose }: { onClose: () => void }) {
    const [logs, setLogs] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/logs/groq")
            .then(async (res) => {
                if (!res.ok) throw new Error("Failed to load logs");
                return res.text();
            })
            .then((text) => {
                setLogs(text);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const handleDownload = () => {
        const blob = new Blob([logs], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "groq_interactions.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 200,
                backdropFilter: "blur(5px)",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: "80%",
                    maxWidth: "800px",
                    height: "80%",
                    backgroundColor: "#1a1a2e",
                    color: "#e0e0e0",
                    borderRadius: "12px",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    boxShadow: "0 0 40px rgba(0, 0, 0, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        paddingBottom: "12px",
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>
                        Create AI Logs
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#aaa",
                            fontSize: "24px",
                            cursor: "pointer",
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div
                    style={{
                        flex: 1,
                        backgroundColor: "#0f0f1a",
                        borderRadius: "8px",
                        padding: "16px",
                        overflow: "auto",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        whiteSpace: "pre-wrap",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                >
                    {loading ? (
                        <div style={{ color: "#888" }}>Loading logs...</div>
                    ) : error ? (
                        <div style={{ color: "#ff4444" }}>Error: {error}</div>
                    ) : (
                        logs || "Log file is empty."
                    )}
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "12px",
                        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                        paddingTop: "12px",
                    }}
                >
                    <button
                        onClick={handleDownload}
                        disabled={loading || !!error || !logs}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "500",
                            opacity: loading || !!error || !logs ? 0.5 : 1,
                            transition: "background 0.2s",
                        }}
                    >
                        Download CSV
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            transition: "background 0.2s",
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
