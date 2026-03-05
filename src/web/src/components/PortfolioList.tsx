import { useEffect, useState } from "react";

interface Holding {
    ticker: string;
    name: string;
    sector: string;
    weight: number;
    performance30d: number;
}

interface Portfolio {
    portfolioId: string;
    clientName: string;
    clientEmail: string;
    totalValue: number;
    riskScore: number;
    recentChange: number;
    flagReason: string;
    allocation: Record<string, number>;
    holdings: Holding[];
}

export function PortfolioList() {
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetch("/api/portfolios")
            .then((r) => r.json())
            .then((data) => {
                setPortfolios(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load portfolios:", err);
                setLoading(false);
            });
    }, []);

    const filtered = portfolios.filter(
        (p) =>
            p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.portfolioId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.flagReason.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

    const getRiskColor = (score: number) => {
        if (score >= 75) return "#ef4444";
        if (score >= 50) return "#f59e0b";
        return "#22c55e";
    };

    const getChangeColor = (change: number) => (change >= 0 ? "#22c55e" : "#ef4444");

    if (loading) {
        return (
            <div style={styles.loading}>
                <div style={styles.spinner} />
                <span>Loading portfolios...</span>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Summary strip */}
            <div style={styles.summaryStrip}>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>{portfolios.length}</div>
                    <div style={styles.summaryLabel}>Total Portfolios</div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>
                        {formatCurrency(portfolios.reduce((s, p) => s + p.totalValue, 0))}
                    </div>
                    <div style={styles.summaryLabel}>Total AUM</div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={{ ...styles.summaryValue, color: "var(--red)" }}>
                        {portfolios.filter((p) => p.riskScore >= 70).length}
                    </div>
                    <div style={styles.summaryLabel}>High Risk</div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={{ ...styles.summaryValue, color: "var(--amber)" }}>
                        {portfolios.filter((p) => p.recentChange <= -5).length}
                    </div>
                    <div style={styles.summaryLabel}>Drawdown &gt; 5%</div>
                </div>
            </div>

            {/* Search */}
            <div style={styles.searchBox}>
                <input
                    type="text"
                    placeholder="Search by client name, portfolio ID, or flag reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <span style={styles.searchCount}>
                    {filtered.length} of {portfolios.length}
                </span>
            </div>

            {/* Portfolio cards */}
            <div style={styles.grid}>
                {filtered.map((p) => {
                    const isExpanded = expandedId === p.portfolioId;
                    return (
                        <div
                            key={p.portfolioId}
                            style={{
                                ...styles.card,
                                ...(isExpanded ? styles.cardExpanded : {}),
                            }}
                        >
                            {/* Card header */}
                            <div
                                style={styles.cardHeader}
                                onClick={() => setExpandedId(isExpanded ? null : p.portfolioId)}
                            >
                                <div style={styles.cardHeaderLeft}>
                                    <div style={styles.clientName}>{p.clientName}</div>
                                    <div style={styles.portfolioId}>{p.portfolioId}</div>
                                </div>
                                <div style={styles.cardHeaderRight}>
                                    <div style={styles.totalValue}>{formatCurrency(p.totalValue)}</div>
                                    <div style={styles.metricsRow}>
                                        <span
                                            style={{
                                                ...styles.badge,
                                                background: `${getRiskColor(p.riskScore)}22`,
                                                color: getRiskColor(p.riskScore),
                                                borderColor: getRiskColor(p.riskScore),
                                            }}
                                        >
                                            Risk: {p.riskScore}
                                        </span>
                                        <span
                                            style={{
                                                ...styles.badge,
                                                background: `${getChangeColor(p.recentChange)}22`,
                                                color: getChangeColor(p.recentChange),
                                                borderColor: getChangeColor(p.recentChange),
                                            }}
                                        >
                                            {p.recentChange > 0 ? "+" : ""}
                                            {p.recentChange}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Flag reason */}
                            <div style={styles.flagReason}>⚠️ {p.flagReason}</div>

                            {/* Allocation bar */}
                            <div style={styles.allocationBar}>
                                {Object.entries(p.allocation).map(([sector, pct]) => (
                                    <div
                                        key={sector}
                                        style={{
                                            ...styles.allocationSegment,
                                            width: `${pct}%`,
                                            background: sectorColor(sector),
                                        }}
                                        title={`${sector}: ${pct}%`}
                                    />
                                ))}
                            </div>
                            <div style={styles.allocationLegend}>
                                {Object.entries(p.allocation).map(([sector, pct]) => (
                                    <span key={sector} style={styles.legendItem}>
                                        <span
                                            style={{
                                                ...styles.legendDot,
                                                background: sectorColor(sector),
                                            }}
                                        />
                                        {sector} {pct}%
                                    </span>
                                ))}
                            </div>

                            {/* Expanded: holdings table */}
                            {isExpanded && (
                                <div style={styles.holdingsSection}>
                                    <div style={styles.holdingsTitle}>Holdings</div>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={styles.th}>Ticker</th>
                                                <th style={styles.th}>Name</th>
                                                <th style={styles.th}>Sector</th>
                                                <th style={{ ...styles.th, textAlign: "right" }}>Weight</th>
                                                <th style={{ ...styles.th, textAlign: "right" }}>30d Perf</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {p.holdings.map((h) => (
                                                <tr key={h.ticker}>
                                                    <td style={styles.tdTicker}>{h.ticker}</td>
                                                    <td style={styles.td}>{h.name}</td>
                                                    <td style={styles.td}>{h.sector}</td>
                                                    <td style={{ ...styles.td, textAlign: "right" }}>
                                                        {h.weight}%
                                                    </td>
                                                    <td
                                                        style={{
                                                            ...styles.td,
                                                            textAlign: "right",
                                                            color: getChangeColor(h.performance30d),
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {h.performance30d > 0 ? "+" : ""}
                                                        {h.performance30d}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div style={styles.email}>📧 {p.clientEmail}</div>
                                </div>
                            )}

                            {/* Expand toggle */}
                            <button
                                onClick={() => setExpandedId(isExpanded ? null : p.portfolioId)}
                                style={styles.expandBtn}
                            >
                                {isExpanded ? "▲ Collapse" : "▼ View Holdings"}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ---- Sector color palette ----
const SECTOR_COLORS: Record<string, string> = {
    Technology: "#3b82f6",
    Healthcare: "#10b981",
    "Financial Services": "#f59e0b",
    Energy: "#ef4444",
    "Consumer Discretionary": "#a78bfa",
    "Consumer Staples": "#6366f1",
    Industrials: "#f97316",
    Utilities: "#14b8a6",
    "Real Estate": "#ec4899",
    "Fixed Income": "#64748b",
    Cash: "#475569",
    International: "#8b5cf6",
    "Emerging Markets": "#d946ef",
    Commodities: "#ca8a04",
    Infrastructure: "#0ea5e9",
    Materials: "#84cc16",
    "Communication Services": "#06b6d4",
    Government: "#6b7280",
};

function sectorColor(sector: string): string {
    return SECTOR_COLORS[sector] ?? "#64748b";
}

// ---- Styles ----
const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    loading: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        color: "var(--gold)",
        padding: "60px 0",
        fontSize: "0.9rem",
        fontFamily: "var(--font-mono)",
    },
    spinner: {
        width: "18px",
        height: "18px",
        border: "2px solid var(--border-subtle)",
        borderTopColor: "var(--gold)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
    },
    /* Summary cards */
    summaryStrip: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "10px",
    },
    summaryCard: {
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        padding: "14px 16px",
        textAlign: "center",
        borderTop: "2px solid var(--gold-dim)",
    },
    summaryValue: {
        fontSize: "1.3rem",
        fontWeight: 400,
        fontFamily: "var(--font-serif)",
        color: "var(--gold)",
    },
    summaryLabel: {
        fontSize: "0.68rem",
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginTop: "4px",
        fontFamily: "var(--font-mono)",
    },
    /* Search */
    searchBox: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "6px",
        padding: "8px 14px",
    },
    searchInput: {
        flex: 1,
        background: "transparent",
        border: "none",
        outline: "none",
        color: "var(--text-primary)",
        fontSize: "0.85rem",
        fontFamily: "var(--font-sans)",
    },
    searchCount: {
        fontSize: "0.72rem",
        color: "var(--text-muted)",
        whiteSpace: "nowrap",
        fontFamily: "var(--font-mono)",
    },
    /* Card grid */
    grid: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    card: {
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        padding: "16px",
        transition: "all 0.2s",
        borderLeft: "3px solid var(--border-subtle)",
    },
    cardExpanded: {
        borderLeftColor: "var(--gold)",
        boxShadow: "0 0 16px rgba(212,168,83,0.1)",
    },
    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        cursor: "pointer",
        gap: "12px",
    },
    cardHeaderLeft: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
    },
    cardHeaderRight: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "6px",
    },
    clientName: {
        fontSize: "1rem",
        fontWeight: 400,
        fontFamily: "var(--font-serif)",
        color: "var(--text-primary)",
    },
    portfolioId: {
        fontSize: "0.72rem",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
    },
    totalValue: {
        fontSize: "1.05rem",
        fontWeight: 600,
        fontFamily: "var(--font-mono)",
        color: "var(--text-primary)",
    },
    metricsRow: {
        display: "flex",
        gap: "6px",
    },
    badge: {
        fontSize: "0.68rem",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: "4px",
        border: "1px solid",
        fontFamily: "var(--font-mono)",
    },
    flagReason: {
        fontSize: "0.78rem",
        color: "var(--gold)",
        marginTop: "10px",
        lineHeight: 1.4,
    },
    /* Allocation bar */
    allocationBar: {
        display: "flex",
        height: "4px",
        borderRadius: "2px",
        overflow: "hidden",
        marginTop: "10px",
    },
    allocationSegment: {
        height: "100%",
    },
    allocationLegend: {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        marginTop: "6px",
    },
    legendItem: {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "0.65rem",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
    },
    legendDot: {
        width: "7px",
        height: "7px",
        borderRadius: "2px",
        flexShrink: 0,
    },
    /* Holdings table */
    holdingsSection: {
        marginTop: "14px",
        paddingTop: "14px",
        borderTop: "1px solid var(--border-subtle)",
    },
    holdingsTitle: {
        fontSize: "0.72rem",
        fontWeight: 600,
        color: "var(--gold)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "8px",
        fontFamily: "var(--font-mono)",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "0.8rem",
    },
    th: {
        textAlign: "left",
        padding: "6px 8px",
        borderBottom: "2px solid var(--gold-dim)",
        color: "var(--gold)",
        fontWeight: 600,
        fontSize: "0.68rem",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontFamily: "var(--font-mono)",
    },
    td: {
        padding: "5px 8px",
        borderBottom: "1px solid var(--border-subtle)",
        color: "var(--text-secondary)",
    },
    tdTicker: {
        padding: "5px 8px",
        borderBottom: "1px solid var(--border-subtle)",
        color: "var(--gold)",
        fontWeight: 600,
        fontFamily: "var(--font-mono)",
    },
    email: {
        marginTop: "10px",
        fontSize: "0.75rem",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
    },
    expandBtn: {
        marginTop: "10px",
        width: "100%",
        padding: "6px",
        background: "transparent",
        border: "1px solid var(--border-subtle)",
        borderRadius: "4px",
        color: "var(--text-muted)",
        fontSize: "0.72rem",
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
        transition: "all 0.2s",
        letterSpacing: "0.02em",
    },
};
