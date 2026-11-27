"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export type NavGroup = { section: string; id: string; items: { slug: string; company: string; category: string }[] };

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

export default function HeaderNav({ groups }: { groups: NavGroup[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const all = useMemo(
    () => groups.flatMap((g) => g.items.map((t) => ({ ...t, section: g.section, key: norm(`${t.company} ${t.category}`), name: norm(t.company) }))),
    [groups],
  );

  const results = useMemo(() => {
    const n = norm(q);
    if (!n) return [];
    const starts = all.filter((t) => t.name.startsWith(n) || t.name.split(" ").some((w) => w.startsWith(n)));
    const rest = all.filter((t) => !starts.includes(t) && t.key.includes(n));
    return [...starts, ...rest].slice(0, 8);
  }, [all, q]);

  // Close menus when the page changes, on Escape, or on a click outside.
  useEffect(() => {
    setMenuOpen(false);
    setFocused(false);
    setQ("");
  }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setMenuOpen(false), setFocused(false));
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const go = (slug: string) => {
    setFocused(false);
    setQ("");
    router.push(`/t/${slug}`);
  };

  const showResults = focused && q.trim().length > 0;

  return (
    <div className="hnav">
      <div className="hsearch" ref={searchRef}>
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        <input
          type="search"
          placeholder="Search a company, e.g. Swiggy"
          aria-label="Search a company teardown"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setFocused(true);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(a + 1, results.length - 1)));
            if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
            if (e.key === "Enter" && results[active]) (e.preventDefault(), go(results[active].slug));
          }}
        />
        {showResults && (
          <div className="hsearch-results" role="listbox">
            {results.length === 0 ? (
              <div className="hs-empty">
                No teardown for &ldquo;{q.trim()}&rdquo; yet.{" "}
                <Link href="/#start" onClick={() => setFocused(false)}>Generate one</Link>
              </div>
            ) : (
              results.map((t, i) => (
                <button
                  key={t.slug}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? "on" : ""}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(t.slug)}
                >
                  <b>{t.company}</b>
                  <span>{t.section}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <nav className="topnav">
        <div className="cats" ref={menuRef}>
          <button className="cats-btn" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            Categories <span aria-hidden="true">{menuOpen ? "▴" : "▾"}</span>
          </button>
          {menuOpen && (
            <div className="cats-panel">
              {groups.map((g) => (
                <div key={g.id} className="cats-col">
                  <Link href={`/#${g.id}`} className="cats-head" onClick={() => setMenuOpen(false)}>
                    {g.section} <span>{g.items.length}</span>
                  </Link>
                  <ul>
                    {g.items.map((t) => (
                      <li key={t.slug}><Link href={`/t/${t.slug}`} onClick={() => setMenuOpen(false)}>{t.company}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
        <Link href="/#start" className="pill">New teardown</Link>
      </nav>
    </div>
  );
}
