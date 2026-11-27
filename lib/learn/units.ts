import type { Lesson, Unit } from "./schema";
import u01 from "./units/u01.json";
import u02 from "./units/u02.json";
import u03 from "./units/u03.json";
import u04 from "./units/u04.json";
import u05 from "./units/u05.json";
import u06 from "./units/u06.json";
import u07 from "./units/u07.json";
import u08 from "./units/u08.json";
import u09 from "./units/u09.json";
import u10 from "./units/u10.json";

/** Skill units in the order learners take them. Validate with scripts/validate-learn.mts. */
export const UNITS = [u01, u02, u03, u04, u05, u06, u07, u08, u09, u10] as unknown as Unit[];

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
