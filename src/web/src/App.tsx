import { useState } from "react";
import { StepWizard } from "./components/StepWizard.js";
import { PortfolioList } from "./components/PortfolioList.js";
import { ModelSelector } from "./components/ModelSelector.js";

type Page = "review" | "portfolios";

export function App() {
    const [page, setPage] = useState<Page>("review");
    const [modelProvider, setModelProvider] = useState("copilot");

    return (
        <div style={styles.app}>
            {/* Top bar with live-market feel */}
            <div style={styles.topBar}>
                <span style={styles.topBarItem}>◆ COPILOT SDK</span>
                <span style={styles.topBarDivider}>|</span>
                <span style={styles.topBarItem}>RISK ANALYTICS</span>
                <span style={styles.topBarDivider}>|</span>
                <span style={styles.topBarItem}>VIP PORTFOLIOS</span>
                <span style={styles.topBarSpacer} />
                <span style={styles.topBarLive}>● LIVE</span>
            </div>

            <header style={styles.header}>
                <div style={styles.headerInner}>
                    <div style={styles.brandBlock}>
                        <h1 style={styles.title}>
                            Portfolio Risk Review
                        </h1>
                        <p style={styles.subtitle}>
                            AI-Assisted · Powered by GitHub Copilot SDK
                        </p>
                    </div>

                    {/* Integration pipeline */}
                    <div style={styles.pipeline}>
                        <div style={styles.pipeNode}>
                            <div style={styles.pipeIcon}>📊</div>
                            <div style={styles.pipeLabel}>Portfolios</div>
                        </div>
                        <div style={styles.pipeArrow}>
                            <div style={styles.pipeArrowLine} />
                            <div style={styles.pipeArrowHead}>›</div>
                        </div>
                        <div style={styles.pipeNode}>
                            <div style={styles.pipeIcon}>🤖</div>
                            <div style={styles.pipeLabel}>Copilot SDK</div>
                        </div>
                        <div style={styles.pipeArrow}>
                            <div style={styles.pipeArrowLine} />
                            <div style={styles.pipeArrowHead}>›</div>
                        </div>
                        <div style={styles.pipeNode}>
                            <div style={styles.pipeIcon}>📰</div>
                            <div style={styles.pipeLabel}>News</div>
                        </div>
                        <div style={styles.pipeArrow}>
                            <div style={styles.pipeArrowLine} />
                            <div style={styles.pipeArrowHead}>›</div>
                        </div>
                        <div style={styles.pipeNode}>
                            <div style={styles.pipeIcon}>✉️</div>
                            <div style={styles.pipeLabel}>Outreach</div>
                        </div>
                    </div>
                </div>

                {/* Tab navigation */}
                <nav style={styles.nav}>
                    <button
                        onClick={() => setPage("review")}
                        style={{
                            ...styles.navBtn,
                            ...(page === "review" ? styles.navBtnActive : {}),
                        }}
                    >
                        <span style={styles.navBtnIcon}>◈</span>
                        Risk Review Wizard
                    </button>
                    <button
                        onClick={() => setPage("portfolios")}
                        style={{
                            ...styles.navBtn,
                            ...(page === "portfolios" ? styles.navBtnActive : {}),
                        }}
                    >
                        <span style={styles.navBtnIcon}>▤</span>
                        All Portfolios
                    </button>
                </nav>
            </header>

            <main style={styles.main}>
                {page === "review" ? (
                    <>
                        <ModelSelector value={modelProvider} onChange={setModelProvider} />
                        <div style={{ marginTop: "20px" }}>
                            <StepWizard modelProvider={modelProvider} />
                        </div>
                    </>
                ) : (
                    <PortfolioList />
                )}
            </main>

            {/* Footer */}
            <footer style={styles.footer}>
                <span>AI-Assisted Broker Portfolio Risk Review</span>
                <span style={styles.footerDot}>·</span>
                <span>Mock Data Only — Not Financial Advice</span>
                <span style={styles.footerDot}>·</span>
                <span>GitHub Copilot SDK Demo</span>
            </footer>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    app: {
        fontFamily: "var(--font-sans)",
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
    },
    /* Top ticker bar */
    topBar: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 24px",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "0.65rem",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
    },
    topBarItem: {
        color: "var(--text-secondary)",
    },
    topBarDivider: {
        color: "var(--border-default)",
    },
    topBarSpacer: {
        flex: 1,
    },
    topBarLive: {
        color: "var(--green)",
        fontWeight: 600,
        fontSize: "0.6rem",
    },
    /* Header */
    header: {
        borderBottom: "1px solid var(--border-subtle)",
        background: "linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)",
    },
    headerInner: {
        maxWidth: "1080px",
        margin: "0 auto",
        padding: "28px 24px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "20px",
    },
    brandBlock: {},
    title: {
        fontSize: "1.6rem",
        fontFamily: "var(--font-serif)",
        fontWeight: 400,
        margin: 0,
        color: "var(--gold)",
        letterSpacing: "-0.01em",
    },
    subtitle: {
        fontSize: "0.78rem",
        color: "var(--text-muted)",
        margin: "4px 0 0",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.02em",
    },
    /* Pipeline */
    pipeline: {
        display: "flex",
        alignItems: "center",
        gap: "0",
    },
    pipeNode: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        padding: "8px 14px",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        minWidth: "72px",
    },
    pipeIcon: {
        fontSize: "1.1rem",
    },
    pipeLabel: {
        fontSize: "0.6rem",
        fontFamily: "var(--font-mono)",
        color: "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        fontWeight: 500,
    },
    pipeArrow: {
        display: "flex",
        alignItems: "center",
        width: "28px",
        position: "relative",
    },
    pipeArrowLine: {
        height: "1px",
        flex: 1,
        background: "var(--gold-dim)",
    },
    pipeArrowHead: {
        color: "var(--gold)",
        fontSize: "1rem",
        fontWeight: 700,
        lineHeight: 1,
        marginLeft: "-2px",
    },
    /* Navigation */
    nav: {
        display: "flex",
        gap: "0",
        maxWidth: "1080px",
        margin: "0 auto",
        padding: "0 24px",
    },
    navBtn: {
        padding: "10px 24px",
        background: "transparent",
        border: "none",
        borderBottom: "2px solid transparent",
        color: "var(--text-muted)",
        fontSize: "0.8rem",
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },
    navBtnActive: {
        color: "var(--gold)",
        borderBottomColor: "var(--gold)",
        background: "var(--gold-glow)",
    },
    navBtnIcon: {
        fontSize: "0.75rem",
    },
    /* Main */
    main: {
        maxWidth: "1080px",
        width: "100%",
        margin: "0 auto",
        padding: "24px",
        flex: 1,
    },
    /* Footer */
    footer: {
        padding: "14px 24px",
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
        textAlign: "center",
        fontSize: "0.65rem",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.02em",
    },
    footerDot: {
        margin: "0 6px",
        color: "var(--border-default)",
    },
};
