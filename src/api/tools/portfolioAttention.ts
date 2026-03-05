import { defineTool } from "@github/copilot-sdk";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    flagReason: string | null;
    allocation: Record<string, number>;
    holdings: Holding[];
}

async function loadPortfolios(): Promise<Portfolio[]> {
    const dataPath = join(__dirname, "../../../data/portfolios.json");
    const raw = await readFile(dataPath, "utf-8");
    return JSON.parse(raw);
}

export const getPortfoliosNeedingAttention = defineTool(
    "get_portfolios_needing_attention",
    {
        description:
            "Retrieve the top N client portfolios that need immediate attention based on risk score, recent drawdowns, sector concentration, or significant changes in asset value. Returns a ranked list with reasons why each portfolio is flagged.",
        parameters: {
            type: "object" as const,
            properties: {
                topN: {
                    type: "number",
                    description:
                        "Number of top portfolios to return (default: 4)",
                },
            },
        },
        handler: async (args: { topN?: number }) => {
            const topN = args.topN ?? 4;
            const portfolios = await loadPortfolios();

            // Score each portfolio: higher = more attention needed
            const scored = portfolios.map((p) => {
                let urgencyScore = 0;

                // High risk score contributes
                urgencyScore += p.riskScore * 0.3;

                // Large recent negative change
                urgencyScore += Math.abs(Math.min(0, p.recentChange)) * 5;

                // Check for sector concentration > 35%
                const maxSectorAlloc = Math.max(
                    ...Object.values(p.allocation),
                );
                if (maxSectorAlloc > 35) urgencyScore += (maxSectorAlloc - 35) * 2;

                // Holdings with > 10% drawdown
                const distressedHoldings = p.holdings.filter(
                    (h) => h.performance30d < -10,
                );
                urgencyScore += distressedHoldings.length * 8;

                // Flagged portfolios get a boost
                if (p.flagReason) urgencyScore += 20;

                return { ...p, urgencyScore };
            });

            scored.sort((a, b) => b.urgencyScore - a.urgencyScore);

            return scored.slice(0, topN).map((p) => ({
                portfolioId: p.portfolioId,
                clientName: p.clientName,
                clientEmail: p.clientEmail,
                totalValue: `$${(p.totalValue / 1_000_000).toFixed(1)}M`,
                riskScore: p.riskScore,
                recentChange: `${p.recentChange}%`,
                urgencyScore: Math.round(p.urgencyScore),
                flagReason:
                    p.flagReason ??
                    `Risk score ${p.riskScore} with ${p.recentChange}% recent change`,
                topSectorConcentration: Object.entries(p.allocation)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 2)
                    .map(([sector, pct]) => `${sector}: ${pct}%`),
                distressedHoldings: p.holdings
                    .filter((h) => h.performance30d < -5)
                    .map((h) => ({
                        ticker: h.ticker,
                        name: h.name,
                        weight: `${h.weight}%`,
                        performance30d: `${h.performance30d}%`,
                    })),
            }));
        },
    },
);
