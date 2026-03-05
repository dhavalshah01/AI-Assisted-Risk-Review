import { defineTool } from "@github/copilot-sdk";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadMarketOverview() {
    const dataPath = join(__dirname, "../../../data/market-overview.json");
    const raw = await readFile(dataPath, "utf-8");
    return JSON.parse(raw);
}

export const getMarketOverview = defineTool("get_market_overview", {
    description:
        "Get the current S&P 500 market overview including index value, daily change, sentiment analysis, and key market drivers. Call this when the user asks for a market summary or sentiment analysis.",
    parameters: {
        type: "object" as const,
        properties: {},
    },
    handler: async () => {
        return await loadMarketOverview();
    },
});
