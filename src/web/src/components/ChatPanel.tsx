import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface ChatPanelProps {
    content: string;
    streamingContent: string;
    isLoading: boolean;
}

export function ChatPanel({ content, streamingContent, isLoading }: ChatPanelProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll during streaming
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [streamingContent, content]);

    const displayContent = content || streamingContent;

    if (!displayContent && !isLoading) {
        return (
            <div style={styles.empty}>
                <div style={styles.emptyIcon}>🤖</div>
                <div style={styles.emptyText}>
                    Click <strong>"Send to Copilot"</strong> to run this step
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} style={styles.container}>
            {isLoading && !streamingContent && (
                <div style={styles.loading}>
                    <div style={styles.spinner} />
                    <span>Copilot is analyzing...</span>
                </div>
            )}
            {displayContent && (
                <div style={styles.markdown}>
                    <ReactMarkdown
                        components={{
                            table: ({ children, ...props }) => (
                                <table style={styles.table} {...props}>
                                    {children}
                                </table>
                            ),
                            th: ({ children, ...props }) => (
                                <th style={styles.th} {...props}>
                                    {children}
                                </th>
                            ),
                            td: ({ children, ...props }) => (
                                <td style={styles.td} {...props}>
                                    {children}
                                </td>
                            ),
                            code: ({ children, className, ...props }) => {
                                const isBlock = className?.startsWith("language-");
                                return isBlock ? (
                                    <pre style={styles.codeBlock}>
                                        <code {...props}>{children}</code>
                                    </pre>
                                ) : (
                                    <code style={styles.inlineCode} {...props}>
                                        {children}
                                    </code>
                                );
                            },
                            strong: ({ children, ...props }) => (
                                <strong style={{ color: "var(--gold)" }} {...props}>
                                    {children}
                                </strong>
                            ),
                        }}
                    >
                        {displayContent}
                    </ReactMarkdown>
                </div>
            )}
            {isLoading && streamingContent && (
                <span style={styles.cursor}>▊</span>
            )}
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        background: "var(--bg-primary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        padding: "20px",
        maxHeight: "500px",
        overflowY: "auto",
        scrollBehavior: "smooth",
    },
    empty: {
        textAlign: "center",
        padding: "40px 20px",
        background: "var(--bg-primary)",
        border: "1px dashed var(--border-subtle)",
        borderRadius: "8px",
    },
    emptyIcon: {
        fontSize: "2.5rem",
        marginBottom: "8px",
    },
    emptyText: {
        color: "var(--text-muted)",
        fontSize: "0.85rem",
    },
    loading: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        color: "var(--gold)",
        fontSize: "0.85rem",
        padding: "10px 0",
        fontFamily: "var(--font-mono)",
    },
    spinner: {
        width: "16px",
        height: "16px",
        border: "2px solid var(--border-subtle)",
        borderTopColor: "var(--gold)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
    },
    markdown: {
        fontSize: "0.86rem",
        lineHeight: 1.7,
        color: "var(--text-secondary)",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        margin: "12px 0",
        fontSize: "0.8rem",
    },
    th: {
        textAlign: "left",
        padding: "8px 10px",
        background: "var(--bg-card)",
        borderBottom: "2px solid var(--gold-dim)",
        color: "var(--gold)",
        fontWeight: 600,
        fontSize: "0.72rem",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontFamily: "var(--font-mono)",
    },
    td: {
        padding: "6px 10px",
        borderBottom: "1px solid var(--border-subtle)",
        color: "var(--text-secondary)",
    },
    codeBlock: {
        background: "var(--bg-card)",
        padding: "12px",
        borderRadius: "6px",
        overflow: "auto",
        fontSize: "0.8rem",
        fontFamily: "var(--font-mono)",
        margin: "10px 0",
        border: "1px solid var(--border-subtle)",
    },
    inlineCode: {
        background: "var(--bg-card)",
        padding: "2px 6px",
        borderRadius: "4px",
        fontSize: "0.82rem",
        fontFamily: "var(--font-mono)",
        color: "var(--gold)",
    },
    cursor: {
        color: "var(--gold)",
        animation: "blink 1s step-end infinite",
    },
};
