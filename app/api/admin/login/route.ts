import { ADMIN_COOKIE, adminToken, passwordMatches } from "@/lib/admin";
import { clientId } from "@/lib/limits";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const pw = (form?.get("password") ?? "").toString();
  const store = getStore();
  const who = clientId(req.headers);
  const back = (q: string, cookie?: string) => {
    const headers = new Headers({ location: new URL(`/admin${q}`, req.url).toString() });
    if (cookie) headers.append("set-cookie", cookie);
    return new Response(null, { status: 303, headers });
  };
  if (!adminToken()) return back("?e=unset");
  if ((await store.getCounter(`adminfail:${who}`)) >= 10) return back("?e=locked");
  if (!passwordMatches(pw)) {
    await store.bumpCounter(`adminfail:${who}`);
    return back("?e=wrong");
  }
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return back("", `${ADMIN_COOKIE}=${adminToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`);
}
