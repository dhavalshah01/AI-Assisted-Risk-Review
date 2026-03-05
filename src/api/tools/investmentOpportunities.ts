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
    allocation: Record<string, number>;
    holdings: Holding[];
    riskScore: number;
}

interface Opportunity {
    id: string;
    name: string;
    ticker: string;
    type: string;
    rationale: string;
    description: string;
    expectedBenefit: string;
    relevantForSectors: string[];
    riskLevel: string;
}

async function loadPortfolios(): Promise<Portfolio[]> {
    const dataPath = join(__dirname, "../../../data/portfolios.json");
    const raw = await readFile(dataPath, "utf-8");
    return JSON.parse(raw);
}

async function loadOpportunities(): Promise<Opportunity[]> {
    const dataPath = join(__dirname, "../../../data/opportunities.json");
    const raw = await readFile(dataPath, "utf-8");
    return JSON.parse(raw);
}

export const getInvestmentOpportunities = defineTool(
    "get_investment_opportunities",
    {
        description:
            "Identify investment opportunities relevant to a specific portfolio based on current market conditions, sector exposures, and risk profile. Returns top opportunities with rationale for why each is relevant.",
        parameters: {
            type: "object" as const,
            properties: {
                portfolioId: {
                    type: "string",
                    description:
                        "The portfolio ID to find opportunities for (e.g., 'PF-001')",
                },
            },
            required: ["portfolioId"],
        },
        handler: async (args: { portfolioId: string }) => {
            const portfolios = await loadPortfolios();
            const portfolio = portfolios.find(
                (p) => p.portfolioId === args.portfolioId,
            );

            if (!portfolio) {
                return { error: `Portfolio ${args.portfolioId} not found` };
            }

            const opportunities = await loadOpportunities();
            const portfolioSectors = Object.keys(portfolio.allocation);

            // Find the most concentrated / worst performing sectors
            const vulnerableSectors = Object.entries(portfolio.allocation)
                .filter(([, pct]) => pct > 20)
                .map(([sector]) => sector);

            const worstHoldings = portfolio.holdings
                .filter((h) => h.performance30d < -5)
                .map((h) => h.sector);

            const needsSectors = [
                ...new Set([...vulnerableSectors, ...worstHoldings]),
            ];

            // Score opportunities by relevance
            const scored = opportunities.map((opp) => {
                let relevanceScore = 0;

                // Check if opportunity addresses portfolio's weak sectors
                for (const sector of opp.relevantForSectors) {
                    if (needsSectors.includes(sector)) {
                        relevanceScore += 20;
                    }
                    if (portfolioSectors.includes(sector)) {
                        relevanceScore += 5;
                    }
                }

                // Risk-reduction opportunities get a boost for high-risk portfolios
                if (
                    portfolio.riskScore > 60 &&
                    (opp.rationale === "risk-reduction" ||
                        opp.rationale === "hedging")
                ) {
                    relevanceScore += 15;
                }

                // Diversification opportunities help concentrated portfolios
                if (
                    opp.rationale === "diversification" &&
                    vulnerableSectors.length > 0
                ) {
                    relevanceScore += 10;
                }

                return { ...opp, relevanceScore };
            });

            scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

            return {
                portfolioId: args.portfolioId,
                clientName: portfolio.clientName,
                currentRiskScore: portfolio.riskScore,
                vulnerableSectors: needsSectors,
                opportunities: scored.slice(0, 5).map((o, idx) => ({
                    rank: idx + 1,
                    name: o.name,
                    ticker: o.ticker,
                    type: o.type,
                    rationale: o.rationale,
                    description: o.description,
                    expectedBenefit: o.expectedBenefit,
                    riskLevel: o.riskLevel,
                    relevanceScore: o.relevanceScore,
                    whyRelevant: `Addresses ${o.relevantForSectors.filter((s) => needsSectors.includes(s)).join(", ")} exposure in this portfolio`,
                })),
            };
        },
    },
);
