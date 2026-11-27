import { BadKeyError, BusyError, practiceFeedback } from "@/lib/ai";
import { getStore } from "@/lib/store";
import { clientId } from "@/lib/limits";

export const runtime = "nodejs";
export const maxDuration = 60;

const PRACTICE_PER_PERSON_PER_DAY = Number(process.env.PRACTICE_PER_PERSON_PER_DAY ?? 10);
const FIELDS = ["users", "problem", "money", "northStar", "metrics", "idea"] as const;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { slug?: string; answer?: Record<string, string>; apiKey?: string };
  const store = getStore();
  const t = body.slug ? await store.get(body.slug) : null;
  if (!t) return Response.json({ error: "Pick a product first." }, { status: 400 });
  const answer: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = (body.answer?.[f] ?? "").toString().trim().slice(0, 2000);
    if (v) answer[f] = v;
  }
  const words = Object.values(answer).join(" ").split(/\s+/).filter(Boolean).length;
  if (words < 25) return Response.json({ error: "Write a bit more first: at least a few sentences across the boxes." }, { status: 400 });

  const apiKey = (body.apiKey ?? "").trim() || undefined;
  const who = clientId(req.headers);
  if (!apiKey && (await store.getCounter(`practice:${who}`)) >= PRACTICE_PER_PERSON_PER_DAY) {
    return Response.json(
      { error: `You've used your ${PRACTICE_PER_PERSON_PER_DAY} free feedback checks for today. Add your own Gemini key to keep going, or come back tomorrow.`, code: "quota" },
      { status: 429 },
    );
  }
  try {
    const feedback = await practiceFeedback({ company: t.company, reference: t.report, answer, apiKey });
    await Promise.all([store.bumpCounter("practice"), apiKey ? 0 : store.bumpCounter(`practice:${who}`)]).catch(() => 0);
    return Response.json({ feedback });
  } catch (e) {
    console.error("practice failed", e);
    if (e instanceof BadKeyError) return Response.json({ error: apiKey ? "That API key didn't work." : "The AI isn't available right now. Try again later or use your own Gemini key.", code: "bad_key" }, { status: 400 });
    if (e instanceof BusyError) return Response.json({ error: "The free AI limit is used up for now. Try again later, or add your own Gemini key.", code: "quota" }, { status: 429 });
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
