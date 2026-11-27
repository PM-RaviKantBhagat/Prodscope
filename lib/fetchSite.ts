import { lookup } from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 1_500_000;
const PAGE_TIMEOUT_MS = 8_000;
const MAX_CHARS_PER_PAGE = 12_000;
const INTERESTING = /(pricing|plans|about|features|product|how-it-works|solutions|customers|business|enterprise|careers)/i;

export type SitePage = { url: string; title: string; text: string };

export function normaliseUrl(input: string): URL {
  let raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only http(s) links are supported");
  url.hash = "";
  return url;
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

async function assertPublicHost(hostname: string) {
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("That address isn't a public website");
  }
  // Local-only escape hatch for sandboxes without DNS (requests then go through an HTTP proxy).
  if (process.env.SKIP_DNS_CHECK === "1" && process.env.NODE_ENV !== "production" && !net.isIP(hostname)) return;
  const addrs = net.isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error("That address isn't a public website");
  }
}

async function fetchHtml(url: URL, hops = 0): Promise<{ finalUrl: URL; html: string } | null> {
  if (hops > 4) return null;
  await assertPublicHost(url.hostname);
  const res = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; ProductTeardownBot/1.0)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location");
    if (!loc) return null;
    return fetchHtml(new URL(loc, url), hops + 1);
  }
  if (!res.ok) return null;
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) return null;
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return { finalUrl: url, html: Buffer.concat(chunks).toString("utf8") };
}

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function htmlToText(html: string) {
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "");
  const metaDesc = decodeEntities(
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? "",
  );
  const body = html
    .replace(/<(script|style|noscript|svg|iframe|template|title)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|section|article|br|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const text = decodeEntities(body)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 2)
    .join("\n");
  return { title, text: (metaDesc ? `${metaDesc}\n` : "") + text };
}

function findLinks(html: string, base: URL): URL[] {
  const out = new Map<string, URL>();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(m[1], base);
      const sameSite = u.hostname.replace(/^www\./, "") === base.hostname.replace(/^www\./, "");
      if (!sameSite || !/^https?:$/.test(u.protocol)) continue;
      if (!INTERESTING.test(u.pathname) || u.pathname.split("/").length > 4) continue;
      u.hash = "";
      u.search = "";
      out.set(u.href, u);
    } catch {
      /* ignore bad links */
    }
  }
  return [...out.values()].slice(0, 4);
}

/** Fetches the homepage plus up to 4 interesting same-site pages (pricing, about, features...). */
export async function fetchSite(input: string): Promise<{ domain: string; url: string; pages: SitePage[] }> {
  const start = normaliseUrl(input);
  const home = await fetchHtml(start);
  const domain = start.hostname.replace(/^www\./, "");
  if (!home) return { domain, url: start.href, pages: [] };

  const pages: SitePage[] = [];
  const h = htmlToText(home.html);
  pages.push({ url: home.finalUrl.href, title: h.title, text: h.text.slice(0, MAX_CHARS_PER_PAGE) });

  const extra = await Promise.allSettled(
    findLinks(home.html, home.finalUrl).map(async (u) => {
      const r = await fetchHtml(u);
      if (!r) return null;
      const t = htmlToText(r.html);
      return { url: r.finalUrl.href, title: t.title, text: t.text.slice(0, MAX_CHARS_PER_PAGE) };
    }),
  );
  for (const r of extra) if (r.status === "fulfilled" && r.value && r.value.text.length > 200) pages.push(r.value);
  return { domain, url: home.finalUrl.href, pages };
}
