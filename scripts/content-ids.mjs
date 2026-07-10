// Prints the current content inventory (pack/topic/question ids + sources).
// Paste the output into an external AI's context so it can extend the bank
// without id collisions and with correct relatedTopicIds. See
// docs/content-authoring.md → "Extending the bank with an external AI".
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const PACKS_DIR = path.join(process.cwd(), "content", "packs");

console.log("# Existing content inventory (for AI context)\n");

// Seed topics are id-only taxonomy entries questions may reference.
const seedSrc = readFileSync(
  path.join(process.cwd(), "src", "core", "seed", "topics.ts"),
  "utf-8",
);
const seedIds = [...seedSrc.matchAll(/topic\("([a-z0-9_]+)"/g)].map((m) => m[1]);
console.log(`## Seed topic ids (referenceable in topicIds/relatedTopicIds)\n`);
console.log(seedIds.sort().join(", ") + "\n");

for (const file of readdirSync(PACKS_DIR).filter((f) => f.endsWith(".json"))) {
  const pack = JSON.parse(readFileSync(path.join(PACKS_DIR, file), "utf-8"));
  console.log(`## Pack: ${pack.id}  (file: ${file})`);
  console.log(`sources: ${JSON.stringify(pack.sources ?? [])}`);
  for (const t of pack.topics ?? []) {
    console.log(`  topic: ${t.id} — ${t.name} [${t.category}]`);
  }
  for (const q of pack.questions ?? []) {
    console.log(`  question: ${q.id} — ${q.title} (topics: ${q.topicIds.join(", ")})`);
  }
  console.log("");
}
