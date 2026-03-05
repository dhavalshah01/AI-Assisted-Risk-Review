import { useState } from "react";
import { useChat } from "../hooks/useChat.js";
import { ChatPanel } from "./ChatPanel.js";

interface Step {
    id: number;
    title: string;
    icon: string;
    description: string;
    prompt: string;
}

const STEPS: Step[] = [
    {
        id: 1,
        title: "Market Overview & Sentiment",
        icon: "📈",
        description: "Get the latest S&P 500 market overview with sentiment analysis and key drivers.",
        prompt: "Give me the S&P 500 market overview and a sentiment analysis.",
    },
    {
        id: 2,
        title: "VIP Portfolios Needing Attention",
        icon: "🎯",
        description: "Identify which VIP portfolios require immediate attention based on risk exposure.",
        prompt: "Bring back my top 4 client portfolios that need immediate attention, highlighting significant changes in asset value or risk exposure due to market shifts.",
    },
    {
        id: 3,
        title: "News Impact Analysis",
        icon: "📰",
        description: "Find and analyze recent news affecting the flagged portfolio's sectors and holdings.",
        prompt: "Find and analyze recent news affecting sectors in Portfolio PF-001 and summarize what could impact its key holdings.",
    },
    {
        id: 4,
        title: "Investment Opportunities",
        icon: "💡",
        description: "Identify investment opportunities with rationale for the portfolio at risk.",
        prompt: "Based on current market conditions and what we found, identify investment opportunities and explain why they're relevant for Portfolio PF-001.",
    },
    {
        id: 5,
        title: "Draft Client Email",
        icon: "✉️",
        description: "Draft a personalized email recommending a portfolio review and meeting.",
        prompt: "Draft an email to the client for Portfolio PF-001 outlining why we should rebalance due to market shifts, summarize the key drivers, and suggest a meeting.",
    },
    {
        id: 6,
        title: "Compliance Pre-Check",
        icon: "✅",
        description: "Scan proposed changes against SEC guidelines and company policies.",
        prompt: "Review the proposed portfolio changes for Portfolio PF-001 for compliance with SEC guidelines and our company standards. The proposed changes are: Reduce tech allocation from 48% to 30%, Add BND position at 10%, Add XLP position at 5%, Add GLD position at 3%. Flag anything that needs attention.",
    },
];

export function StepWizard({ modelProvider = "copilot" }: { modelProvider?: string }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [stepResults, setStepResults] = useState<Record<number, string>>({});
    const { messages, streamingContent, isLoading, sendMessage, resetSession } = useChat("default", modelProvider);

    const step = STEPS[currentStep];

    const handleSend = async () => {
        await sendMessage(step.prompt);
        // The latest message will appear in messages array after streaming completes
    };

    // Track which step each message belongs to
    const currentMessageIndex = Object.keys(stepResults).length;

    // When a new message arrives, record it for the current step
    if (messages.length > currentMessageIndex && !stepResults[currentStep]) {
        const latestMsg = messages[messages.length - 1];
        setStepResults((prev) => ({ ...prev, [currentStep]: latestMsg }));
    }

    const handleReset = async () => {
        await resetSession();
        setCurrentStep(0);
        setStepResults({});
    };

    const canGoNext = currentStep < STEPS.length - 1;
    const canGoPrev = currentStep > 0;
    const hasResult = stepResults[currentStep] !== undefined;

    return (
        <div style={styles.container}>
            {/* Step progress bar */}
            <div style={styles.progressBar}>
                {STEPS.map((s, idx) => (
                    <button
                        key={s.id}
                        onClick={() => setCurrentStep(idx)}
                        style={{
                            ...styles.progressStep,
                            ...(idx === currentStep ? styles.progressStepActive : {}),
                            ...(stepResults[idx] !== undefined ? styles.progressStepDone : {}),
                        }}
                    >
                        <span style={styles.progressIcon}>{s.icon}</span>
                        <span style={styles.progressLabel}>{s.id}</span>
                    </button>
                ))}
            </div>

            {/* Current step card */}
            <div style={styles.stepCard}>
                <div style={styles.stepHeader}>
                    <span style={styles.stepIcon}>{step.icon}</span>
                    <div>
                        <h2 style={styles.stepTitle}>
                            Step {step.id}: {step.title}
                        </h2>
                        <p style={styles.stepDesc}>{step.description}</p>
                    </div>
                </div>

                {/* Prompt preview */}
                <div style={styles.promptBox}>
                    <div style={styles.promptLabel}>Prompt</div>
                    <div style={styles.promptText}>{step.prompt}</div>
                </div>

                {/* Action buttons */}
                <div style={styles.actions}>
                    <button
                        onClick={handleSend}
                        disabled={isLoading || hasResult}
                        style={{
                            ...styles.sendBtn,
                            ...(isLoading || hasResult ? styles.btnDisabled : {}),
                        }}
                    >
                        {isLoading
                            ? "⏳ Processing..."
                            : hasResult
                              ? "✓ Completed"
                              : "🚀 Send to Copilot"}
                    </button>
                    <button onClick={handleReset} style={styles.resetBtn}>
                        🔄 Reset Session
                    </button>
                </div>
            </div>

            {/* Response panel */}
            <ChatPanel
                content={stepResults[currentStep] ?? ""}
                streamingContent={streamingContent}
                isLoading={isLoading}
            />

            {/* Navigation */}
            <div style={styles.nav}>
                <button
                    onClick={() => setCurrentStep((s) => s - 1)}
                    disabled={!canGoPrev}
                    style={{
                        ...styles.navBtn,
                        ...(!canGoPrev ? styles.btnDisabled : {}),
                    }}
                >
                    ← Previous
                </button>
                <span style={styles.navLabel}>
                    Step {step.id} of {STEPS.length}
                </span>
                <button
                    onClick={() => setCurrentStep((s) => s + 1)}
                    disabled={!canGoNext}
                    style={{
                        ...styles.navBtn,
                        ...(!canGoNext ? styles.btnDisabled : {}),
                    }}
                >
                    Next →
                </button>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    /* Progress pills */
    progressBar: {
        display: "flex",
        justifyContent: "center",
        gap: "6px",
        flexWrap: "wrap",
    },
    progressStep: {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "6px 14px",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "20px",
        color: "var(--text-muted)",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: 500,
        fontFamily: "var(--font-mono)",
        transition: "all 0.2s",
    },
    progressStepActive: {
        background: "var(--gold-glow)",
        borderColor: "var(--gold)",
        color: "var(--gold)",
        boxShadow: "0 0 12px rgba(212,168,83,0.2)",
    },
    progressStepDone: {
        background: "rgba(34,197,94,0.08)",
        borderColor: "var(--green)",
        color: "var(--green)",
    },
    progressIcon: {
        fontSize: "0.9rem",
    },
    progressLabel: {
        fontWeight: 600,
    },
    /* Step card */
    stepCard: {
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "10px",
        padding: "20px",
        borderLeft: "3px solid var(--gold-dim)",
    },
    stepHeader: {
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        marginBottom: "16px",
    },
    stepIcon: {
        fontSize: "2rem",
    },
    stepTitle: {
        margin: 0,
        fontSize: "1.1rem",
        fontWeight: 400,
        fontFamily: "var(--font-serif)",
        color: "var(--text-primary)",
    },
    stepDesc: {
        margin: "4px 0 0",
        fontSize: "0.82rem",
        color: "var(--text-muted)",
    },
    /* Prompt area */
    promptBox: {
        background: "var(--bg-primary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "6px",
        padding: "12px",
        marginBottom: "16px",
    },
    promptLabel: {
        fontSize: "0.65rem",
        fontWeight: 600,
        color: "var(--gold)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "6px",
        fontFamily: "var(--font-mono)",
    },
    promptText: {
        fontSize: "0.82rem",
        color: "var(--text-secondary)",
        lineHeight: 1.5,
        fontStyle: "italic",
    },
    /* Action buttons */
    actions: {
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
    },
    sendBtn: {
        padding: "10px 24px",
        background: "linear-gradient(135deg, var(--gold) 0%, #b8923f 100%)",
        border: "none",
        borderRadius: "6px",
        color: "var(--bg-primary)",
        fontWeight: 700,
        fontSize: "0.85rem",
        cursor: "pointer",
        transition: "all 0.2s",
        fontFamily: "var(--font-sans)",
        letterSpacing: "0.01em",
    },
    resetBtn: {
        padding: "10px 20px",
        background: "transparent",
        border: "1px solid var(--border-default)",
        borderRadius: "6px",
        color: "var(--text-muted)",
        fontWeight: 500,
        fontSize: "0.82rem",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
    },
    btnDisabled: {
        opacity: 0.4,
        cursor: "not-allowed",
    },
    /* Navigation */
    nav: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    navBtn: {
        padding: "8px 20px",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "6px",
        color: "var(--text-secondary)",
        fontWeight: 500,
        fontSize: "0.82rem",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        transition: "all 0.2s",
    },
    navLabel: {
        fontSize: "0.75rem",
        fontFamily: "var(--font-mono)",
        color: "var(--text-muted)",
    },
};
