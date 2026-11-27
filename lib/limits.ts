import { createHash, randomBytes } from "node:crypto";

export const FREE_PER_PERSON_PER_DAY = Number(process.env.FREE_PER_PERSON_PER_DAY ?? 3);
export const FREE_TOTAL_PER_DAY = Number(process.env.FREE_TOTAL_PER_DAY ?? 15);
export const CACHE_DAYS = Number(process.env.CACHE_DAYS ?? 30);

export function clientId(headers: Headers): string {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${process.env.IP_SALT ?? "teardown"}:${ip}`).digest("hex").slice(0, 24);
}

export function makeSlug(company: string): string {
  const base = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "teardown";
  return `${base}-${randomBytes(3).toString("hex")}`;
}
