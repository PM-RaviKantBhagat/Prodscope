# Prodscope

Enter a company name and website, get a full product teardown written for aspiring PMs: what the product does, personas, pain points, core user journeys, business model, competitors, north star metric and KPI tree, strengths, weaknesses, improvement ideas and interview prep questions.

## How it works

1. Reads the company's homepage plus up to four pages like pricing, about and features (`lib/fetchSite.ts`, public addresses only).
2. Google Gemini researches the company with Google Search: competitors, business model, scale, user complaints (`lib/ai.ts`, step 1).
3. Gemini writes the teardown as structured data that matches `lib/schema.ts` (step 2), which the report page renders.
4. Every report gets a shareable link (`/t/<slug>`) and appears in the public gallery. A site that was torn down in the last 30 days is reused instead of regenerated.

Free usage is limited per person per day and in total per day (`lib/limits.ts`). Past the limit, people can paste their own free Gemini API key, which is used for that one request and never stored on the server.

## Run locally

```bash
npm install
MOCK_AI=1 npm run dev      # sample reports, no API key needed
# or, for real reports:
GEMINI_API_KEY=AIza... npm run dev
```

## Deploy (Vercel + Neon)

1. Import the repo in Vercel.
2. Create a free Neon Postgres database and copy its connection string.
3. Set `GEMINI_API_KEY`, `DATABASE_URL` and `IP_SALT` in the Vercel project's environment variables (see `.env.example`). Tables are created automatically on first use.
