import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { slug?: string; vote?: string; comment?: string };
  const vote = body.vote === "up" || body.vote === "down" ? body.vote : null;
  const comment = (body.comment ?? "").trim().slice(0, 1000);
  if (!body.slug || (!vote && !comment)) return Response.json({ ok: false }, { status: 400 });
  const store = getStore();
  if (!(await store.get(body.slug))) return Response.json({ ok: false }, { status: 404 });
  await store.addFeedback({ slug: body.slug, vote, comment, createdAt: new Date().toISOString() });
  return Response.json({ ok: true });
}
