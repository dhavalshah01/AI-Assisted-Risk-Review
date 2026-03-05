import { defineTool } from "@github/copilot-sdk";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Portfolio {
    portfolioId: string;
    clientName: string;
    totalValue: number;
    riskScore: number;
    allocation: Record<string, number>;
    holdings: { ticker: string; name: string; sector: string; weight: number; performance30d: number }[];
}

interface ComplianceRule {
    ruleId: string;
    category: string;
    name: string;
    description: string;
    triggerCondition: string;
    flagLevel: string;
    action: string;
}

async function loadPortfolios(): Promise<Portfolio[]> {
    const dataPath = join(__dirname, "../../../data/portfolios.json");
    const raw = await readFile(dataPath, "utf-8");
    return JSON.parse(raw);
}

async function loadComplianceRules(): Promise<ComplianceRule[]> {
    const dataPath = join(__dirname, "../../../data/compliance-rules.json");
    const raw = await readFile(dataPath, "utf-8");
    return JSON.parse(raw);
}

export const complianceScan = defineTool("compliance_scan", {
    description:
        "Review proposed portfolio changes for compliance with SEC guidelines and company policies. Scans proposed changes against regulatory and internal rules, returning a checklist of flags with severity, rule references, and required actions.",
    parameters: {
        type: "object" as const,
        properties: {
            portfolioId: {
                type: "string",
                description: "The portfolio ID to scan (e.g., 'PF-001')",
            },
            proposedChanges: {
                type: "array",
                items: { type: "string" },
                description:
                    "List of proposed changes to evaluate (e.g., 'Reduce tech allocation from 48% to 30%', 'Add BND position at 10%')",
            },
        },
        required: ["portfolioId", "proposedChanges"],
    },
    handler: async (args: {
        portfolioId: string;
        proposedChanges: string[];
    }) => {
        const portfolios = await loadPortfolios();
        const portfolio = portfolios.find(
            (p) => p.portfolioId === args.portfolioId,
        );

        if (!portfolio) {
            return { error: `Portfolio ${args.portfolioId} not found` };
        }

        const rules = await loadComplianceRules();
        const flags: {
            ruleId: string;
            ruleName: string;
            category: string;
            flagLevel: string;
            triggered: boolean;
            reason: string;
            action: string;
        }[] = [];

        // Evaluate each rule against the portfolio + proposed changes
        for (const rule of rules) {
            let triggered = false;
            let reason = "";

            switch (rule.ruleId) {
                case "SEC-001": // Suitability Review
                    triggered = true; // Always triggered for any recommendation
                    reason =
                        "Rebalancing recommendations require suitability verification for the client's current profile.";
                    break;

                case "SEC-002": // Concentration Risk Disclosure
                    {
                        const highSectors = Object.entries(portfolio.allocation)
                            .filter(([, pct]) => pct > 25);
                        const highHoldings = portfolio.holdings.filter(
                            (h) => h.weight > 10,
                        );
                        if (highSectors.length > 0 || highHoldings.length > 0) {
                            triggered = true;
                            const sectorNames = highSectors
                                .map(([s, p]) => `${s} at ${p}%`)
                                .join(", ");
                            const holdingNames = highHoldings
                                .map((h) => `${h.ticker} at ${h.weight}%`)
                                .join(", ");
                            reason = `Concentration detected — Sectors: ${sectorNames || "none"}. Holdings: ${holdingNames || "none"}.`;
                        }
                    }
                    break;

                case "SEC-003": // Best Execution
                    if (args.proposedChanges.length > 0) {
                        triggered = true;
                        reason = `${args.proposedChanges.length} proposed trades require best execution documentation.`;
                    }
                    break;

                case "COMP-001": // High-Risk Rebalance Approval
                    {
                        // Rough check: if changes involve major reallocation
                        const significantChanges = args.proposedChanges.filter(
                            (c) =>
                                c.toLowerCase().includes("reduce") ||
                                c.toLowerCase().includes("sell") ||
                                c.toLowerCase().includes("rebalance"),
                        );
                        if (significantChanges.length >= 2) {
                            triggered = true;
                            reason = `${significantChanges.length} significant rebalancing actions may exceed the 15% threshold — requires senior advisor approval.`;
                        }
                    }
                    break;

                case "COMP-002": // Restricted Product Check
                    {
                        const restrictedTerms = [
                            "leveraged",
                            "inverse",
                            "options",
                            "3x",
                            "2x",
                            "short",
                        ];
                        const restricted = args.proposedChanges.filter((c) =>
                            restrictedTerms.some((t) =>
                                c.toLowerCase().includes(t),
                            ),
                        );
                        if (restricted.length > 0) {
                            triggered = true;
                            reason = `Proposed changes may include restricted products: ${restricted.join("; ")}`;
                        }
                    }
                    break;

                case "COMP-003": // Client Communication Standards
                    triggered = true; // Always triggered when drafting communications
                    reason =
                        "Client email drafted — must include standard disclaimers and risk disclosures per CP-305.";
                    break;

                case "SEC-004": // Anti-Churning
                    // Simplified: flag if many changes
                    if (args.proposedChanges.length >= 4) {
                        triggered = true;
                        reason = `${args.proposedChanges.length} proposed changes — verify portfolio turnover ratio and document investment rationale for each.`;
                    }
                    break;

                case "COMP-004": // Concentration Threshold Policy
                    {
                        const overThreshold = Object.entries(
                            portfolio.allocation,
                        ).filter(([, pct]) => pct > 40);
                        if (overThreshold.length > 0) {
                            triggered = true;
                            reason = `Sector(s) exceeding 40% threshold: ${overThreshold.map(([s, p]) => `${s} at ${p}%`).join(", ")}. Client risk acknowledgment form (RA-40) required.`;
                        }
                    }
                    break;
            }

            flags.push({
                ruleId: rule.ruleId,
                ruleName: rule.name,
                category: rule.category,
                flagLevel: rule.flagLevel,
                triggered,
                reason: triggered ? reason : "No issues detected.",
                action: triggered ? rule.action : "No action required.",
            });
        }

        const triggeredFlags = flags.filter((f) => f.triggered);
        const criticalCount = triggeredFlags.filter(
            (f) => f.flagLevel === "critical",
        ).length;
        const warningCount = triggeredFlags.filter(
            (f) => f.flagLevel === "warning",
        ).length;

        return {
            portfolioId: args.portfolioId,
            clientName: portfolio.clientName,
            scanDate: new Date().toISOString().split("T")[0],
            proposedChangesReviewed: args.proposedChanges.length,
            summary: {
                totalRulesChecked: rules.length,
                flagsTriggered: triggeredFlags.length,
                criticalFlags: criticalCount,
                warningFlags: warningCount,
                overallStatus:
                    criticalCount > 0
                        ? "REQUIRES_REVIEW"
                        : warningCount > 0
                          ? "REVIEW_RECOMMENDED"
                          : "CLEAR",
            },
            flags: triggeredFlags.map((f) => ({
                ruleId: f.ruleId,
                ruleName: f.ruleName,
                category: f.category === "SEC" ? "SEC Regulation" : "Company Policy",
                severity: f.flagLevel.toUpperCase(),
                finding: f.reason,
                requiredAction: f.action,
            })),
            disclaimer:
                "This compliance scan is assistive and does not replace formal compliance review. All flagged items require human verification by a qualified compliance officer before proceeding.",
        };
    },
});
