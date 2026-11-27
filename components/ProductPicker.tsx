"use client";

import type { NavGroup } from "./HeaderNav";

/** A plain select of every teardown, grouped by category. */
export default function ProductPicker({
  groups,
  value,
  onChange,
  label,
  exclude,
}: {
  groups: NavGroup[];
  value?: string;
  onChange: (slug: string) => void;
  label: string;
  exclude?: string;
}) {
  return (
    <label className="picker">
      <span>{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>Choose a product</option>
        {groups.map((g) => (
          <optgroup key={g.id} label={g.section}>
            {g.items.filter((t) => t.slug !== exclude).map((t) => (
              <option key={t.slug} value={t.slug}>{t.company}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
