"use client";

import { useRouter } from "next/navigation";
import ProductPicker from "./ProductPicker";
import type { NavGroup } from "./HeaderNav";

export default function ComparePicker({ groups, a, b }: { groups: NavGroup[]; a?: string; b?: string }) {
  const router = useRouter();
  const go = (na?: string, nb?: string) => {
    const q = new URLSearchParams();
    if (na) q.set("a", na);
    if (nb) q.set("b", nb);
    router.push(`/compare?${q}`);
  };
  return (
    <div className="pickers">
      <ProductPicker groups={groups} label="First product" value={a} exclude={b} onChange={(s) => go(s, b)} />
      <span className="vs">vs</span>
      <ProductPicker groups={groups} label="Second product" value={b} exclude={a} onChange={(s) => go(a, s)} />
    </div>
  );
}
