import { Router, Request, Response } from "express";
import { CopilotClient, approveAll } from "@github/copilot-sdk";
import type { SessionConfig } from "@github/copilot-sdk";

type ProviderConfig = NonNullable<SessionConfig["provider"]>;
import {
    getMarketOverview,
    getPortfoliosNeedingAttention,
    getRelevantNews,
    getInvestmentOpportunities,
    draftClientEmail,
    complianceScan,
} from "../tools/index.js";

const router = Router();

// ------------------------------------------------------------------
// Azure OpenAI provider — configured via environment variables
// ------------------------------------------------------------------
function getAzureProvider(): ProviderConfig | undefined {
    const baseUrl = process.env.AZURE_OPENAI_BASE_URL;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    if (!baseUrl || !apiKey) return undefined;

    return {
        type: "azure",
        baseUrl,
        apiKey,
        azure: {
            apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
        },
    };
}

// Which model providers are available right now?
export function getAvailableProviders(): { id: string; label: string; model?: string }[] {
    const providers: { id: string; label: string; model?: string }[] = [
        { id: "copilot", label: "GitHub Copilot (default)" },
    ];

    if (getAzureProvider()) {
        providers.push({
            id: "azure-openai",
            label: `Azure OpenAI (${process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o"})`,
            model: process.env.AZURE_OPENAI_DEPLOYMENT,
        });
    }

    return providers;
}

// ------------------------------------------------------------------
// Session management — one CopilotClient + one session per sessionId
// ------------------------------------------------------------------
interface ManagedSession {
    client: CopilotClient;
    session: Awaited<ReturnType<CopilotClient["createSession"]>>;
    lastUsed: number;
    providerId: string;
}

const sessions = new Map<string, ManagedSession>();

const allTools = [
    getMarketOverview,
    getPortfoliosNeedingAttention,
    getRelevantNews,
    getInvestmentOpportunities,
    draftClientEmail,
    complianceScan,
];

const SYSTEM_MESSAGE = `You are an AI-assisted broker portfolio risk review assistant.
You help financial advisors move from market signal → portfolio action → compliant client outreach.

CRITICAL RULES:
- Always use the provided tools to fetch data — NEVER invent numbers or fabricate data.
- Format outputs as structured markdown: tables for portfolios, bullets for news, numbered lists for opportunities.
- Always note that recommendations require human review and approval.
- Maintain context across turns in this session — reference earlier findings when relevant.
- If a tool returns an error, inform the user and suggest alternatives.
- Never provide final financial advice or guarantee returns.`;

async function getOrCreateSession(sessionId: string, providerId: string = "copilot"): Promise<ManagedSession> {
    const existing = sessions.get(sessionId);
    // If session exists but provider changed, destroy it first
    if (existing && existing.providerId !== providerId) {
        console.log(`[Session] Provider changed from ${existing.providerId} → ${providerId}, recreating session`);
        try {
            await existing.session.destroy();
            await existing.client.stop();
        } catch { /* ignore cleanup errors */ }
        sessions.delete(sessionId);
    } else if (existing) {
        existing.lastUsed = Date.now();
        return existing;
    }

    console.log(`[Session] Creating new session: ${sessionId} (provider: ${providerId})`);
    const client = new CopilotClient();

    // Build session config
    const sessionConfig: SessionConfig = {
        streaming: true,
        tools: allTools,
        systemMessage: { content: SYSTEM_MESSAGE },
        onPermissionRequest: approveAll,
        hooks: {
            onPreToolUse: async (input) => {
                console.log(`  [Tool] ${input.toolName} invoked`);
                return { permissionDecision: "allow" as const };
            },
        },
    };

    // Apply Azure OpenAI provider when selected
    if (providerId === "azure-openai") {
        const azureProvider = getAzureProvider();
        if (!azureProvider) {
            throw new Error("Azure OpenAI is not configured. Set AZURE_OPENAI_BASE_URL and AZURE_OPENAI_API_KEY in .env");
        }
        sessionConfig.provider = azureProvider;
        if (process.env.AZURE_OPENAI_DEPLOYMENT) {
            sessionConfig.model = process.env.AZURE_OPENAI_DEPLOYMENT;
        }
        console.log(`  [Provider] Azure OpenAI → ${azureProvider.baseUrl} (model: ${sessionConfig.model ?? "default"})`);
    } else {
        console.log(`  [Provider] GitHub Copilot (default)`);
    }

    const session = await client.createSession(sessionConfig);

    const managed: ManagedSession = { client, session, lastUsed: Date.now(), providerId };
    sessions.set(sessionId, managed);
    return managed;
}

// ------------------------------------------------------------------
// POST /api/chat — SSE streaming chat
// ------------------------------------------------------------------
router.post("/chat", async (req: Request, res: Response) => {
    const { prompt, sessionId = "default", modelProvider = "copilot" } = req.body as {
        prompt?: string;
        sessionId?: string;
        modelProvider?: string;
    };

    if (!prompt) {
        res.status(400).json({ error: "prompt is required" });
        return;
    }

    console.log(`\n[Chat] sessionId=${sessionId} provider=${modelProvider} prompt="${prompt.slice(0, 80)}..."`);

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
        const { session } = await getOrCreateSession(sessionId, modelProvider);

        // Listen for streaming deltas — session.on() returns an unsubscribe fn
        const unsubscribeDelta = session.on("assistant.message_delta", (event) => {
            res.write(
                `data: ${JSON.stringify({ type: "delta", content: event.data.deltaContent })}\n\n`,
            );
        });

        // Send and wait for completion
        const response = await session.sendAndWait({ prompt });

        // Remove listener
        unsubscribeDelta();

        // Send complete message
        const fullContent = response?.data?.content ?? "";
        res.write(
            `data: ${JSON.stringify({ type: "done", content: fullContent })}\n\n`,
        );
        res.end();
    } catch (err) {
        console.error("[Chat] Error:", err);
        res.write(
            `data: ${JSON.stringify({ type: "error", content: String(err) })}\n\n`,
        );
        res.end();
    }
});

// ------------------------------------------------------------------
// POST /api/reset — Destroy session and start fresh
// ------------------------------------------------------------------
router.post("/reset", async (req: Request, res: Response) => {
    const { sessionId = "default" } = req.body as { sessionId?: string };
    const existing = sessions.get(sessionId);

    if (existing) {
        try {
            await existing.session.destroy();
            await existing.client.stop();
        } catch (e) {
            console.warn("[Reset] Cleanup warning:", e);
        }
        sessions.delete(sessionId);
        console.log(`[Session] Destroyed session: ${sessionId}`);
    }

    res.json({ status: "ok", sessionId, message: "Session reset" });
});

// ------------------------------------------------------------------
// GET /api/sessions — List active sessions (debug)
// ------------------------------------------------------------------
router.get("/sessions", (_req: Request, res: Response) => {
    const list = Array.from(sessions.entries()).map(([id, s]) => ({
        sessionId: id,
        lastUsed: new Date(s.lastUsed).toISOString(),
    }));
    res.json({ activeSessions: list.length, sessions: list });
});

export { router as chatRouter };
