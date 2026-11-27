import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "ps_admin";

/** The cookie value proves the visitor knew ADMIN_PASSWORD, without storing the password itself. */
export function adminToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHash("sha256").update(`prodscope-admin:${pw}:${process.env.IP_SALT ?? ""}`).digest("hex");
}

export function passwordMatches(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(pw).digest();
  return timingSafeEqual(a, b);
}

export function isAdmin(cookieValue: string | undefined): boolean {
  const t = adminToken();
  if (!t || !cookieValue || cookieValue.length !== t.length) return false;
  return timingSafeEqual(Buffer.from(cookieValue), Buffer.from(t));
}
