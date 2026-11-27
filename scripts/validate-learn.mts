// Validates a learn unit file: node --experimental-strip-types scripts/validate-learn.mts lib/learn/units/u01.json
import { readFileSync } from "node:fs";
import { UnitSchema } from "../lib/learn/schema.ts";

let bad = 0;
for (const f of process.argv.slice(2)) {
  try {
    const u = UnitSchema.parse(JSON.parse(readFileSync(f, "utf8")));
    const problems: string[] = [];
    const text = JSON.stringify(u);
    if (text.includes("—")) problems.push("contains an em dash");
    for (const l of u.lessons) {
      if (!l.id.startsWith(u.id)) problems.push(`${l.id} does not belong to ${u.id}`);
      const types = new Set(l.questions.map((q) => q.type));
      if (types.size < 3) problems.push(`${l.id} uses fewer than 3 question types`);
      for (const q of l.questions) {
        if (q.type === "mcq" && q.answer >= q.options.length) problems.push(`${l.id}: mcq answer out of range`);
        if (q.type === "tree" && q.correct.some((i) => i >= q.options.length)) problems.push(`${l.id}: tree index out of range`);
        if (q.type === "spot" && q.wrong >= q.lines.length) problems.push(`${l.id}: spot index out of range`);
      }
    }
    if (problems.length) throw new Error(problems.join("; "));
    console.log(`ok ${f}`);
  } catch (e) {
    bad++;
    console.log(`FAIL ${f}: ${(e as Error).message.slice(0, 1500)}`);
  }
}
process.exit(bad ? 1 : 0);
