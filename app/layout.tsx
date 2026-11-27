import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import RegisterSW from "@/components/RegisterSW";
import { gameList } from "@/lib/learn/games";
import { SECTION_ORDER, sectionSlug } from "@/lib/sections";
import { getGroups } from "@/lib/gallery";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prodscope: AI product teardowns for aspiring PMs",
  description: "Enter a company and website, get a full product teardown: personas, pain points, journeys, business model, north star and KPI tree.",
  applicationName: "Prodscope",
  appleWebApp: { capable: true, title: "Prodscope", statusBarStyle: "black" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#000000" };

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const groups = (await getGroups()).map((g) => ({
    section: g.section,
    id: g.id,
    items: g.items.map((t) => ({ slug: t.slug, company: t.company, category: t.category })),
  }));
  const games = gameList();
  const playGroups = SECTION_ORDER.map((section) => ({
    section,
    id: sectionSlug(section),
    items: games.filter((x) => x.section === section).map((x) => ({ slug: x.slug, company: x.company, category: "" })),
  })).filter((g) => g.items.length > 0);
  return (
    <html lang="en">
      <body>
        <RegisterSW />
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">
              <Logo /> <span>prodscope</span>
            </Link>
            <HeaderNav groups={groups} playGroups={playGroups} />
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div>
            <span className="brand"><Logo size={24} /> prodscope</span>
            <span>Product teardowns for aspiring PMs.</span>
            <span>Reports are AI-generated from public information and can contain mistakes. Check the assumptions and sources before relying on them.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
