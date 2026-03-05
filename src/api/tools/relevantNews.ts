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
}

interface NewsItem {
    id: string;
    headline: string;
    source: string;
    date: string;
    summary: string;
    sectors: string[];
    tickers: string[];
    sentiment: string;
    impactLevel: string;
}

async function loadPortfolios(): Promise<Portfolio[]> {
    const dataPath = join(__dirname, "../../../data/portfolios.json");
    const raw = await readFile(dataPath, "utf-8");
    return JSON.parse(raw);
}

async function loadNews(): Promise<NewsItem[]> {
    const dataPath = join(__dirname, "../../../data/news.json");
    const raw = await readFile(dataPath, "utf-8");
    return JSON.parse(raw);
}

export const getRelevantNews = defineTool("get_relevant_news", {
    description:
        "Find and analyze recent news affecting a specific portfolio's sectors and holdings. Returns news items with relevance scores and impact analysis for the portfolio's key positions.",
    parameters: {
        type: "object" as const,
        properties: {
            portfolioId: {
                type: "string",
                description:
                    "The portfolio ID to find relevant news for (e.g., 'PF-001')",
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

        const news = await loadNews();
        const portfolioSectors = Object.keys(portfolio.allocation);
        const portfolioTickers = portfolio.holdings.map((h) => h.ticker);

        // Score and filter news by relevance
        const scoredNews = news.map((item) => {
            let relevanceScore = 0;
            const matchedSectors: string[] = [];
            const matchedTickers: string[] = [];

            // Check sector overlap
            for (const sector of item.sectors) {
                if (portfolioSectors.includes(sector)) {
                    const sectorWeight = portfolio.allocation[sector] ?? 0;
                    relevanceScore += sectorWeight * 0.5;
                    matchedSectors.push(
                        `${sector} (${sectorWeight}% of portfolio)`,
                    );
                }
            }

            // Check ticker overlap
            for (const ticker of item.tickers) {
                if (portfolioTickers.includes(ticker)) {
                    const holding = portfolio.holdings.find(
                        (h) => h.ticker === ticker,
                    );
                    if (holding) {
                        relevanceScore += holding.weight * 2;
                        matchedTickers.push(
                            `${ticker} (${holding.weight}% weight, ${holding.performance30d}% 30d)`,
                        );
                    }
                }
            }

            // High-impact news gets a boost
            if (item.impactLevel === "high") relevanceScore *= 1.5;

            return {
                ...item,
                relevanceScore: Math.round(relevanceScore),
                matchedSectors,
                matchedTickers,
                portfolioImpact:
                    relevanceScore > 20
                        ? "HIGH"
                        : relevanceScore > 10
                          ? "MEDIUM"
                          : "LOW",
            };
        });

        // Filter out irrelevant news and sort by relevance
        const relevant = scoredNews
            .filter((n) => n.relevanceScore > 0)
            .sort((a, b) => b.relevanceScore - a.relevanceScore);

        return {
            portfolioId: args.portfolioId,
            clientName: portfolio.clientName,
            newsCount: relevant.length,
            news: relevant.map((n) => ({
                headline: n.headline,
                source: n.source,
                date: n.date,
                summary: n.summary,
                sentiment: n.sentiment,
                impactLevel: n.impactLevel,
                portfolioImpact: n.portfolioImpact,
                matchedSectors: n.matchedSectors,
                matchedTickers: n.matchedTickers,
            })),
        };
    },
});
