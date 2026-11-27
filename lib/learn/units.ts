import type { Lesson, Unit } from "./schema";
import u01 from "./units/u01.json";
import u02 from "./units/u02.json";
import u03 from "./units/u03.json";

/** Skill units in the order learners take them. Validate with scripts/validate-learn.mts. */
export const UNITS = [u01, u02, u03] as unknown as Unit[];

export function findLesson(id: string): { unit: Unit; lesson: Lesson; index: number; next?: string } | null {
  for (const unit of UNITS) {
    const index = unit.lessons.findIndex((l) => l.id === id);
    if (index < 0) continue;
    const all = UNITS.flatMap((u) => u.lessons.map((l) => l.id));
    const at = all.indexOf(id);
    return { unit, lesson: unit.lessons[index], index, next: all[at + 1] };
  }
  return null;
}

/** Path data for the learn page: no question text. */
export function pathData() {
  return UNITS.map((u) => ({ id: u.id, title: u.title, summary: u.summary, icon: u.icon, lessons: u.lessons.map((l) => ({ id: l.id, title: l.title })) }));
}
