import "dotenv/config";
import express from "express";
import cors from "cors";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { chatRouter, getAvailableProviders } from "./routes/chat.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

app.use(cors({ origin: true }));
app.use(express.json());

// API routes
app.use("/api", chatRouter);

// Model provider listing endpoint
app.get("/api/providers", (_req, res) => {
    res.json({ providers: getAvailableProviders() });
});

// Portfolio data endpoint
app.get("/api/portfolios", (_req, res) => {
    try {
        const dataPath = resolve(__dirname, "../../data/portfolios.json");
        const data = JSON.parse(readFileSync(dataPath, "utf-8"));
        res.json(data);
    } catch (err) {
        console.error("[Portfolios] Error reading data:", err);
        res.status(500).json({ error: "Failed to load portfolio data" });
    }
});

// Health check
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "AI-Assisted Broker Portfolio Risk Review",
        timestamp: new Date().toISOString(),
        tools: [
            "get_market_overview",
            "get_portfolios_needing_attention",
            "get_relevant_news",
            "get_investment_opportunities",
            "draft_client_email",
            "compliance_scan",
        ],
    });
});

app.listen(PORT, () => {
    const providers = getAvailableProviders();
    console.log(`\n🚀 API server running at http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Chat endpoint: POST http://localhost:${PORT}/api/chat`);
    console.log(`   Reset session: POST http://localhost:${PORT}/api/reset`);
    console.log(`   Providers:    GET  http://localhost:${PORT}/api/providers`);
    console.log(`\n📡 Available model providers:`);
    for (const p of providers) {
        console.log(`   • ${p.id}: ${p.label}`);
    }
    console.log();
});
