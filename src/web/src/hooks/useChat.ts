import { useState, useCallback, useRef } from "react";

interface UseChatReturn {
    messages: string[];
    streamingContent: string;
    isLoading: boolean;
    sendMessage: (prompt: string) => Promise<void>;
    resetSession: () => Promise<void>;
}

const API_BASE = "/api";

export function useChat(sessionId: string = "default", modelProvider: string = "copilot"): UseChatReturn {
    const [messages, setMessages] = useState<string[]>([]);
    const [streamingContent, setStreamingContent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(
        async (prompt: string) => {
            setIsLoading(true);
            setStreamingContent("");

            abortRef.current = new AbortController();

            try {
                const response = await fetch(`${API_BASE}/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt, sessionId, modelProvider }),
                    signal: abortRef.current.signal,
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error("No response body");

                const decoder = new TextDecoder();
                let accumulated = "";
                let fullContent = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    accumulated += decoder.decode(value, { stream: true });
                    const lines = accumulated.split("\n\n");
                    accumulated = lines.pop() ?? "";

                    for (const line of lines) {
                        if (!line.startsWith("data: ")) continue;
                        try {
                            const parsed = JSON.parse(line.slice(6));
                            if (parsed.type === "delta") {
                                fullContent += parsed.content;
                                setStreamingContent(fullContent);
                            } else if (parsed.type === "done") {
                                fullContent = parsed.content || fullContent;
                                setStreamingContent("");
                                setMessages((prev) => [...prev, fullContent]);
                            } else if (parsed.type === "error") {
                                setStreamingContent("");
                                setMessages((prev) => [
                                    ...prev,
                                    `**Error:** ${parsed.content}`,
                                ]);
                            }
                        } catch {
                            // Ignore parse errors from partial chunks
                        }
                    }
                }
            } catch (err: unknown) {
                if (err instanceof DOMException && err.name === "AbortError") return;
                setMessages((prev) => [...prev, `**Error:** ${String(err)}`]);
            } finally {
                setIsLoading(false);
                setStreamingContent("");
            }
        },
        [sessionId, modelProvider],
    );

    const resetSession = useCallback(async () => {
        try {
            await fetch(`${API_BASE}/reset`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId }),
            });
            setMessages([]);
            setStreamingContent("");
        } catch (err) {
            console.error("Reset failed:", err);
        }
    }, [sessionId]);

    return { messages, streamingContent, isLoading, sendMessage, resetSession };
}
