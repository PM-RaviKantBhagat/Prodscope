import type { Teardown } from "./schema";

/** Sample output used when MOCK_AI=1, so the UI can be tried without an API key. */
export function mockTeardown(company: string): Teardown {
  return {
    company,
    tagline: `${company} (sample report: set an API key to generate a real one)`,
    category: "Sample category",
    overview: {
      whatItDoes: `This is placeholder content showing the layout of a ${company} teardown. Real reports are written by AI from the company's website and web research.`,
      howItWorks: ["Users discover the product", "They sign up and complete onboarding", "They get value from the core feature", "They come back and pay"],
      valueProposition: "Saves the user time and money on a frequent task.",
    },
    personas: [
      { name: "Busy professional", description: "25-35, metro city, values time over money.", goals: ["Get things done fast"], frustrations: ["Long waits", "Unreliable service"] },
      { name: "Price-conscious student", description: "18-24, tier-2 city, deal-seeker.", goals: ["Save money"], frustrations: ["Hidden fees"] },
    ],
    painPoints: [
      { pain: "Hard to find a reliable option", howSolved: "Ratings and curated listings", severity: "high" },
      { pain: "Unclear pricing", howSolved: "Upfront price before checkout", severity: "medium" },
      { pain: "No way to track progress", howSolved: "Live status updates", severity: "low" },
    ],
    userJourneys: [
      {
        name: "First use",
        persona: "Busy professional",
        steps: [
          { step: "Discover", detail: "Sees an ad or hears from a friend" },
          { step: "Sign up", detail: "Phone number and OTP" },
          { step: "First action", detail: "Completes the core task with a first-time offer" },
          { step: "Outcome", detail: "Gets value and receives a prompt to rate" },
        ],
      },
    ],
    businessModel: {
      summary: "Marketplace that earns a commission on each transaction, plus a subscription.",
      revenueStreams: [
        { stream: "Commission", detail: "Percentage of each transaction" },
        { stream: "Subscription", detail: "Monthly plan with free delivery" },
      ],
      pricing: "Not public",
      costDrivers: ["Customer acquisition", "Operations", "Discounts"],
    },
    competitors: [
      { name: "Competitor A", positioning: "Low price leader", howThisProductDiffers: "Better reliability" },
      { name: "Competitor B", positioning: "Premium option", howThisProductDiffers: "Wider selection" },
    ],
    northStar: { metric: "Weekly successful transactions per active user", why: "Captures both engagement and value delivered." },
    kpiTree: [
      { metric: "Active users", description: "People who used the product this week", children: [
        { metric: "New user activation rate", description: "Share of sign-ups who complete a first action" },
        { metric: "Week-4 retention", description: "Share of users still active after 4 weeks" },
      ] },
      { metric: "Transactions per user", description: "How often each active user transacts", children: [
        { metric: "Sessions per week", description: "Visits per active user" },
        { metric: "Session-to-transaction conversion", description: "Share of sessions that end in a transaction" },
      ] },
      { metric: "Success rate", description: "Share of transactions completed without issues", children: [
        { metric: "Cancellation rate", description: "Share of transactions cancelled" },
        { metric: "Support tickets per 100 transactions", description: "Proxy for failure" },
      ] },
    ],
    guardrailMetrics: ["Contribution margin per transaction", "Customer support CSAT"],
    strengths: ["Strong brand recall", "Wide coverage"],
    weaknesses: ["Heavy reliance on discounts", "Inconsistent service quality"],
    improvementIdeas: [
      { idea: "Smart reorder", problem: "Repeat users redo the same steps", expectedImpact: "Higher repeat frequency", metricToTrack: "Repeat transactions per user", effort: "low" },
      { idea: "Transparent fee breakdown", problem: "Users drop at checkout when fees appear", expectedImpact: "Better checkout conversion", metricToTrack: "Checkout conversion rate", effort: "medium" },
    ],
    interviewQuestions: [
      { question: `How would you increase retention for ${company}?`, hint: "Segment users, find the drop-off point, then prioritise fixes by impact and effort." },
      { question: `What metric would you choose as ${company}'s north star and why?`, hint: "Tie it to user value, not just revenue." },
    ],
    assumptions: ["This entire report is sample data."],
  };
}
