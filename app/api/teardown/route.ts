import Anthropic from "@anthropic-ai/sdk";
import { fetchSite, normaliseUrl } from "@/lib/fetchSite";
import { generateTeardown, RefusedError } from "@/lib/ai";
import { mockTeardown } from "@/lib/mock";
import { getStore } from "@/lib/store";
import { CACHE_DAYS, FREE_PER_PERSON_PER_DAY, FREE_TOTAL_PER_DAY, clientId, makeSlug } from "@/lib/limits";

export const runtime = "nodejs";
export const maxDuration = 300;

type Event =
  | { type: "status"; message: string }
  | { type: "done"; slug: string; cached?: boolean }
  | { type: "error"; message: string; code?: "quota" | "bad_key" | "input" };

function json(event: Event, status = 200) {
  return new Response(JSON.stringify(event) + "\n", { status, headers: { "content-type": "application/x-ndjson" } });
}

export async function POST(req: Request) {
  let body: { company?: string; url?: string; apiKey?: string; fresh?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ type: "error", message: "Invalid request", code: "input" }, 400);
  }
  const company = (body.company ?? "").trim().slice(0, 80);
  const apiKey = (body.apiKey ?? "").trim() || undefined;
  if (!company || !body.url) return json({ type: "error", message: "Enter a company name and website.", code: "input" }, 400);

  let domain: string;
  try {
    domain = normaliseUrl(body.url).hostname.replace(/^www\./, "");
  } catch {
    return json({ type: "error", message: "That website address doesn't look right.", code: "input" }, 400);
  }

  const store = getStore();

  // Reuse a recent teardown of the same site: free for everyone, and keeps costs down.
  if (!body.fresh) {
    const existing = await store.findRecentByDomain(domain, CACHE_DAYS);
    if (existing) return json({ type: "done", slug: existing.slug, cached: true });
  }

  const mock = process.env.MOCK_AI === "1";
  if (!apiKey && !mock) {
    const who = clientId(req.headers);
    const [mine, total] = await Promise.all([store.getCounter(`user:${who}`), store.getCounter("total")]);
    if (mine >= FREE_PER_PERSON_PER_DAY || total >= FREE_TOTAL_PER_DAY) {
      return json({
        type: "error",
        code: "quota",
        message:
          mine >= FREE_PER_PERSON_PER_DAY
            ? `You've used your ${FREE_PER_PERSON_PER_DAY} free teardowns for today. Add your own Claude API key to keep going, or come back tomorrow.`
            : "Today's free teardowns have all been used. Add your own Claude API key to keep going, or come back tomorrow.",
      });
    }
    await Promise.all([store.bumpCounter(`user:${who}`), store.bumpCounter("total")]);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Event) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      // Keep the connection alive while the model works.
      const ping = setInterval(() => controller.enqueue(encoder.encode("\n")), 15_000);
      try {
        send({ type: "status", message: `Reading ${domain}` });
        const site = await fetchSite(body.url!).catch((e: Error) => {
          if (/public website/.test(e.message)) throw e;
          return { domain, url: normaliseUrl(body.url!).href, pages: [] };
        });
        send({
          type: "status",
          message: site.pages.length
            ? `Read ${site.pages.length} page${site.pages.length > 1 ? "s" : ""} from the site`
            : "Couldn't read the site directly, so relying on web research",
        });

        const { report, sources } = mock
          ? { report: mockTeardown(company), sources: site.pages.map((p) => p.url) }
          : await generateTeardown({ company, url: site.url, pages: site.pages, apiKey, onStatus: (m) => send({ type: "status", message: m }) });

        const slug = makeSlug(company);
        await store.save({
          slug,
          company,
          domain,
          url: site.url,
          createdAt: new Date().toISOString(),
          report,
          sources: [...new Set([...site.pages.map((p) => p.url), ...sources])],
          up: 0,
          down: 0,
        });
        send({ type: "done", slug });
      } catch (err) {
        console.error("teardown failed", err);
        if (err instanceof Anthropic.AuthenticationError) {
          send({ type: "error", code: "bad_key", message: "That API key didn't work. Check it and try again." });
        } else if (err instanceof Anthropic.RateLimitError) {
          send({ type: "error", message: "The AI is busy right now. Please try again in a minute." });
        } else if (err instanceof RefusedError || (err instanceof Error && /public website/.test(err.message))) {
          send({ type: "error", message: (err as Error).message });
        } else {
          send({ type: "error", message: "Something went wrong while generating the teardown. Please try again." });
        }
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
}
