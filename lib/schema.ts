import { z } from "zod";

const kpiLeaf = z.object({
  metric: z.string().describe("Name of the input metric"),
  description: z.string().describe("One line on what it measures and why it moves the parent"),
});

const kpiBranch = z.object({
  metric: z.string(),
  description: z.string(),
  children: z.array(kpiLeaf).describe("2-4 lower-level input metrics"),
});

export const TeardownSchema = z.object({
  company: z.string(),
  tagline: z.string().describe("One-sentence description of the product"),
  category: z.string().describe("e.g. Food delivery marketplace, B2B SaaS for HR"),
  simpleSummary: z
    .string()
    .describe("Explain the product to a friend who has never used it, in 3-4 short sentences. No jargon."),
  keyNumbers: z
    .array(z.object({ label: z.string(), value: z.string(), note: z.string().describe("Where the number comes from and how sure we are") }))
    .describe("4-6 numbers that show the size of the business: users, revenue, orders, funding, valuation, market share"),
  overview: z.object({
    whatItDoes: z.string().describe("2-4 sentences, plain language"),
    howItWorks: z.array(z.string()).describe("3-6 bullet points on how the product works"),
    valueProposition: z.string(),
  }),
  personas: z
    .array(
      z.object({
        name: z.string().describe("Short persona label, e.g. 'Busy working professional'"),
        description: z.string(),
        goals: z.array(z.string()),
        frustrations: z.array(z.string()),
      }),
    )
    .describe("3-4 target personas"),
  painPoints: z
    .array(
      z.object({
        pain: z.string(),
        howSolved: z.string(),
        severity: z.enum(["high", "medium", "low"]),
      }),
    )
    .describe("5-8 user pain points the product solves"),
  coreFeatures: z
    .array(z.object({ feature: z.string(), whatItDoes: z.string(), whyItMatters: z.string().describe("Which user problem or business goal it serves") }))
    .describe("4-7 features that matter most"),
  userJourneys: z
    .array(
      z.object({
        name: z.string().describe("e.g. 'First order', 'Repeat purchase'"),
        persona: z.string(),
        steps: z.array(z.object({ step: z.string(), detail: z.string() })),
      }),
    )
    .describe("3 core user journeys, 5-8 steps each"),
  businessModel: z.object({
    summary: z.string(),
    revenueStreams: z.array(z.object({ stream: z.string(), detail: z.string() })),
    pricing: z.string().describe("Pricing as visible on the site, or 'Not public'"),
    costDrivers: z.array(z.string()),
    unitEconomics: z.string().describe("In plain words: roughly how much money it makes or loses on one order, user or customer, and why"),
  }),
  growth: z.object({
    howTheyGetUsers: z.array(z.string()).describe("Main ways new users find and join the product"),
    whatBringsUsersBack: z.array(z.string()).describe("Habits, loops and hooks that make users return"),
    moat: z.string().describe("What makes it hard for a competitor to copy, in plain words"),
  }),
  competitors: z
    .array(
      z.object({
        name: z.string(),
        positioning: z.string(),
        howThisProductDiffers: z.string(),
      }),
    )
    .describe("3-5 direct or indirect competitors"),
  northStar: z.object({
    metric: z.string(),
    why: z.string().describe("Why this metric best captures value delivered to users"),
  }),
  kpiTree: z
    .array(kpiBranch)
    .describe("3-4 first-level drivers of the north star metric, each with children"),
  guardrailMetrics: z.array(z.string()).describe("2-4 metrics that must not get worse"),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  risks: z.array(z.string()).describe("Outside threats: competition, regulation, market shifts"),
  userComplaints: z.array(z.string()).describe("What real users complain about most, from reviews, social media and news"),
  improvementIdeas: z
    .array(
      z.object({
        idea: z.string(),
        problem: z.string().describe("User or business problem it addresses"),
        expectedImpact: z.string(),
        metricToTrack: z.string(),
        effort: z.enum(["low", "medium", "high"]),
      }),
    )
    .describe("4-6 concrete, prioritised product ideas"),
  pmLessons: z.array(z.string()).describe("3-5 lessons an aspiring PM can take from this product"),
  interviewQuestions: z
    .array(z.object({ question: z.string(), hint: z.string().describe("How a strong APM candidate would approach it") }))
    .describe("5 PM interview-style questions about this product"),
  glossary: z
    .array(z.object({ term: z.string(), meaning: z.string().describe("One plain sentence") }))
    .describe("Every PM or business term used in this report (e.g. north star metric, CAC, take rate, retention), explained simply"),
  assumptions: z
    .array(z.string())
    .describe("Things that were inferred rather than found in sources, so readers can sanity-check"),
});

export type Teardown = z.infer<typeof TeardownSchema>;

export type StoredTeardown = {
  section: string;
  origin: "curated" | "live";
  slug: string;
  company: string;
  domain: string;
  url: string;
  createdAt: string;
  report: Teardown;
  sources: string[];
  up: number;
  down: number;
};

export type FeedbackEntry = {
  slug: string;
  vote: "up" | "down" | null;
  comment: string;
  createdAt: string;
};
