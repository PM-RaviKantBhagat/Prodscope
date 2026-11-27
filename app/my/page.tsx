import type { Metadata } from "next";
import MyProgress from "@/components/MyProgress";
import { getNavGroups } from "@/lib/navGroups";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My progress | Prodscope" };

export default async function MyPage() {
  const groups = await getNavGroups();
  return (
    <article className="page">
      <div className="eyebrow">My progress</div>
      <h1>Your study plan</h1>
      <p className="lede">Track which teardowns you have studied in each category, and find the ones you saved for later.</p>
      <MyProgress groups={groups} />
    </article>
  );
}
