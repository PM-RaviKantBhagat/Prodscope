import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teardown: AI product teardowns for aspiring PMs",
  description: "Enter a company and website, get a full product teardown: personas, pain points, journeys, business model, north star and KPI tree.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            <span className="brand-mark">▲</span> Teardown
          </Link>
          <span className="brand-sub">Product teardowns for aspiring PMs</span>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          Reports are AI-generated from public information and can contain mistakes. Check the assumptions and sources before relying on them.
        </footer>
      </body>
    </html>
  );
}
