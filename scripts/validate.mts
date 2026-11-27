// Validates curated teardown JSON files. Usage: node --experimental-strip-types scripts/validate.mts <file-or-dir>...
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { TeardownSchema } from "../lib/schema.ts";

const files = process.argv.slice(2).flatMap((p) =>
  statSync(p).isDirectory() ? readdirSync(p).filter((f) => f.endsWith(".json")).map((f) => path.join(p, f)) : [p],
);
let bad = 0;
for (const f of files) {
  try {
    const doc = JSON.parse(readFileSync(f, "utf8"));
    const r = TeardownSchema.safeParse(doc.report);
    const extra: string[] = [];
    if (!doc.domain) extra.push("missing domain");
    if (!Array.isArray(doc.sources) || doc.sources.length < 3) extra.push("needs at least 3 sources");
    if (!r.success || extra.length) {
      bad++;
      console.log(`FAIL ${f}`);
      if (!r.success) for (const i of r.error.issues.slice(0, 15)) console.log(`  ${i.path.join(".")}: ${i.message}`);
      for (const e of extra) console.log(`  ${e}`);
    } else console.log(`ok   ${f}`);
  } catch (e) {
    bad++;
    console.log(`FAIL ${f}: ${(e as Error).message}`);
  }
}
console.log(`${files.length - bad}/${files.length} valid`);
process.exit(bad ? 1 : 0);
