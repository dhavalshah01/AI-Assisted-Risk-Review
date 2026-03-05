import { useEffect, useState } from "react";

interface Provider {
    id: string;
    label: string;
    model?: string;
}

interface ModelSelectorProps {
    value: string;
    onChange: (providerId: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/providers")
            .then((r) => r.json())
            .then((data) => {
                setProviders(data.providers ?? []);
                setLoading(false);
            })
            .catch(() => {
                // Fallback to copilot only
                setProviders([{ id: "copilot", label: "GitHub Copilot (default)" }]);
                setLoading(false);
            });
    }, []);

    const selectedProvider = providers.find((p) => p.id === value);
    const isAzure = value === "azure-openai";

    return (
        <div style={styles.container}>
            <div style={styles.labelRow}>
                <span style={styles.label}>Model Provider</span>
                {isAzure && <span style={styles.azureBadge}>☁️ Azure</span>}
            </div>

            {loading ? (
                <div style={styles.loading}>Loading providers...</div>
            ) : providers.length <= 1 ? (
                <div style={styles.singleProvider}>
                    <span style={styles.providerIcon}>🤖</span>
                    <span>GitHub Copilot (default)</span>
                    <span style={styles.onlyOption}>only option</span>
                </div>
            ) : (
                <div style={styles.options}>
                    {providers.map((p) => {
                        const isSelected = p.id === value;
                        const icon = p.id === "azure-openai" ? "☁️" : "🤖";
                        return (
                            <button
                                key={p.id}
                                onClick={() => onChange(p.id)}
                                style={{
                                    ...styles.option,
                                    ...(isSelected ? styles.optionSelected : {}),
                                    ...(p.id === "azure-openai" ? (isSelected ? styles.optionAzureSelected : styles.optionAzure) : {}),
                                }}
                            >
                                <span style={styles.optionIcon}>{icon}</span>
                                <span style={styles.optionLabel}>{p.label}</span>
                                {isSelected && <span style={styles.checkmark}>✓</span>}
                            </button>
                        );
                    })}
                </div>
            )}

            {selectedProvider && (
                <div style={styles.info}>
                    {isAzure
                        ? "Using your Azure OpenAI deployment — requests stay within your Azure tenant."
                        : "Using GitHub Copilot's built-in model via the SDK."}
                </div>
            )}
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        padding: "14px 16px",
    },
    labelRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px",
    },
    label: {
        fontSize: "0.68rem",
        fontWeight: 600,
        color: "var(--gold)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontFamily: "var(--font-mono)",
    },
    azureBadge: {
        fontSize: "0.68rem",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: "10px",
        background: "rgba(59,130,246,0.1)",
        color: "#60a5fa",
        border: "1px solid rgba(59,130,246,0.25)",
        fontFamily: "var(--font-mono)",
    },
    loading: {
        fontSize: "0.8rem",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
    },
    singleProvider: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "0.82rem",
        color: "var(--text-secondary)",
    },
    providerIcon: {
        fontSize: "1rem",
    },
    onlyOption: {
        fontSize: "0.68rem",
        color: "var(--text-muted)",
        fontStyle: "italic",
        marginLeft: "auto",
        fontFamily: "var(--font-mono)",
    },
    options: {
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
    },
    option: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 14px",
        background: "var(--bg-primary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "6px",
        color: "var(--text-muted)",
        fontSize: "0.82rem",
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        transition: "all 0.2s",
        flex: "1 1 0",
        minWidth: "180px",
    },
    optionSelected: {
        borderColor: "var(--gold)",
        color: "var(--text-primary)",
        background: "var(--gold-glow)",
        boxShadow: "0 0 10px rgba(212,168,83,0.15)",
    },
    optionAzure: {
        borderColor: "var(--border-subtle)",
    },
    optionAzureSelected: {
        borderColor: "#3b82f6",
        background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(30,58,95,0.3) 100%)",
        boxShadow: "0 0 12px rgba(59,130,246,0.2)",
        color: "var(--text-primary)",
    },
    optionIcon: {
        fontSize: "1rem",
    },
    optionLabel: {
        flex: 1,
        textAlign: "left",
    },
    checkmark: {
        fontSize: "0.85rem",
        color: "var(--green)",
        fontWeight: 700,
    },
    info: {
        marginTop: "8px",
        fontSize: "0.7rem",
        color: "var(--text-muted)",
        lineHeight: 1.4,
        fontFamily: "var(--font-mono)",
    },
};
