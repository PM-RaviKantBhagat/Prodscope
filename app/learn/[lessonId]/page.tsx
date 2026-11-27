import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LessonPlayer from "@/components/LessonPlayer";
import { findLesson } from "@/lib/learn/units";

type Props = { params: Promise<{ lessonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const f = findLesson((await params).lessonId);
  return { title: f ? `${f.lesson.title} | Prodscope Learn` : "Learn | Prodscope" };
}

export default async function LessonPage({ params }: Props) {
  const f = findLesson((await params).lessonId);
  if (!f) notFound();
  return (
    <article className="page narrow">
      <LessonPlayer key={f.lesson.id} lesson={f.lesson} unitTitle={`${f.unit.icon} ${f.unit.title}`} next={f.next} />
    </article>
  );
}
