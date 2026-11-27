import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prodscope: AI product teardowns for aspiring PMs",
  description: "Enter a company and website, get a full product teardown: personas, pain points, journeys, business model, north star and KPI tree.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">
              <Logo /> <span>prodscope</span>
            </Link>
            <nav className="topnav">
              <Link href="/#recent">Teardowns</Link>
              <Link href="/#start" className="pill">New teardown</Link>
            </nav>
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
