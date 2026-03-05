import { defineTool } from "@github/copilot-sdk";

export const draftClientEmail = defineTool("draft_client_email", {
    description:
        "Draft a personalized client email recommending a portfolio review/rebalancing due to market shifts. The email summarizes key drivers, proposed actions, and requests a meeting. Returns a structured email object ready for review.",
    parameters: {
        type: "object" as const,
        properties: {
            clientName: {
                type: "string",
                description: "The client's name for the email greeting",
            },
            clientEmail: {
                type: "string",
                description: "The client's email address",
            },
            keyDrivers: {
                type: "array",
                items: { type: "string" },
                description:
                    "List of key market drivers or portfolio concerns to mention",
            },
            recommendations: {
                type: "array",
                items: { type: "string" },
                description: "List of recommended actions or opportunities",
            },
            meetingAsk: {
                type: "boolean",
                description: "Whether to include a meeting request (default: true)",
            },
        },
        required: ["clientName", "clientEmail", "keyDrivers", "recommendations"],
    },
    handler: async (args: {
        clientName: string;
        clientEmail: string;
        keyDrivers: string[];
        recommendations: string[];
        meetingAsk?: boolean;
    }) => {
        const meetingAsk = args.meetingAsk ?? true;
        const firstName = args.clientName.split(" ")[0];

        const driversSection = args.keyDrivers
            .map((d) => `  • ${d}`)
            .join("\n");

        const recsSection = args.recommendations
            .map((r, i) => `  ${i + 1}. ${r}`)
            .join("\n");

        const meetingParagraph = meetingAsk
            ? `\nI'd like to schedule a brief meeting to walk through these recommendations and answer any questions you may have. Would any of the following times work for you this week?\n\n  • Tuesday, March 10 at 2:00 PM\n  • Wednesday, March 11 at 10:00 AM\n  • Thursday, March 12 at 3:30 PM\n`
            : "";

        const emailBody = `Dear ${firstName},

I hope this message finds you well. I'm reaching out because recent market developments have prompted me to review your portfolio, and I'd like to share some observations and recommendations.

**Market Conditions Update:**
${driversSection}

Given these developments, I believe it's an opportune time to consider some adjustments to your portfolio to better manage risk and position for potential opportunities.

**Recommended Actions:**
${recsSection}

These recommendations are designed to strengthen your portfolio's resilience while maintaining alignment with your long-term financial objectives.
${meetingParagraph}
As always, no changes will be made without your review and approval. I want to ensure you feel confident about every step.

Please don't hesitate to reach out if you have any immediate questions or concerns.

Warm regards,

[Your Name]
Senior Financial Advisor
[Firm Name]

---
*This communication is for informational purposes only and does not constitute a guarantee of future results. Past performance is not indicative of future returns. All investment decisions are subject to your review and approval. Please refer to your investment policy statement for details on your objectives and risk tolerance.*`;

        return {
            to: args.clientEmail,
            subject: `Portfolio Review Recommendation — Action Items for Your Review`,
            body: emailBody,
            tone: "professional-friendly",
            includesMeetingRequest: meetingAsk,
            keyPointsCount: args.keyDrivers.length + args.recommendations.length,
            complianceNote:
                "Email includes standard disclaimer. Review for CP-305 compliance before sending.",
        };
    },
});
