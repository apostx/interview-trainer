// One-command content release: validates, commits whatever changed, bumps the
// minor version and pushes — the v* tag triggers the Pages deploy.
//
//   npm run release:content                          → commit msg "feat: content update"
//   npm run release:content -- "feat: new k8s pack"  → custom commit message
import { execSync, spawnSync } from "node:child_process";

const quote = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
const run = (cmd, args) => {
  const line = [cmd, ...args.map(quote)].join(" ");
  const r = spawnSync(line, { stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`\n✗ "${line}" failed — release aborted, nothing was pushed.`);
    process.exit(r.status ?? 1);
  }
};

const dirty = execSync("git status --porcelain").toString().trim();
if (!dirty) {
  console.error("Nothing to release — the working tree is clean.");
  process.exit(1);
}

console.log("Changes to be released:\n" + dirty + "\n");

// Gates first — a broken pack must not reach a tag.
run("npm", ["run", "content:check"]);
run("npm", ["test"]);

// Keep the GitHub-linkable inventory current (docs/content-inventory.md).
run("node", ["scripts/content-ids.mjs", "--write"]);

const message = process.argv[2] ?? "feat: content update";
run("git", ["add", "-A"]);
run("git", ["commit", "-m", message]);
run("npm", ["version", "minor", "-m", "chore(release): %s"]);
run("git", ["push", "--follow-tags"]);

console.log("\n✓ Released. The v* tag triggers the deploy — check:");
console.log("  https://github.com/apostx/interview-trainer/actions");
console.log("  https://interviewtrainer.sallai.cc/ (live in ~2 minutes)");
